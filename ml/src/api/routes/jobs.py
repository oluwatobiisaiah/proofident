from __future__ import annotations

import logging
import time

from fastapi import APIRouter, HTTPException, Request

from ..schemas import JobMatchRequest, JobMatchResponse
from ...models.job_matcher import JobMatcher
from ...models.occupation_inferencer import SkillExtractor

logger = logging.getLogger("proofident.jobs")
router = APIRouter()

_matcher = JobMatcher()
_skill_extractor = SkillExtractor()


@router.post("/match/jobs", response_model=JobMatchResponse, tags=["jobs"])
async def match_jobs(request: JobMatchRequest, req: Request) -> JobMatchResponse:
    request_id = getattr(req.state, "request_id", "")
    start = time.perf_counter()

    if not request.available_jobs:
        raise HTTPException(status_code=400, detail="No jobs provided.")

    user = request.user_profile
    loan_limit = _infer_loan_limit(user.credit_score, user.confidence, user.completeness_tier)

    matches, n_passed = _matcher.match(
        user=user,
        jobs=request.available_jobs,
        user_skills=user.skills or {},
        user_loan_limit=loan_limit,
    )

    elapsed_ms = round((time.perf_counter() - start) * 1000)

    logger.info(
        "jobs_matched",
        extra={
            "request_id": request_id,
            "user_id": user.user_id,
            "jobs_evaluated": len(request.available_jobs),
            "jobs_passed_filter": n_passed,
            "jobs_returned": len(matches),
            "duration_ms": elapsed_ms,
        },
    )

    return JobMatchResponse(
        user_id=user.user_id,
        total_jobs_evaluated=len(request.available_jobs),
        jobs_passed_hard_filter=n_passed,
        matches=matches,
        processing_time_ms=elapsed_ms,
    )


def _infer_loan_limit(credit_score: int, confidence: float, tier: str) -> int:
    if credit_score >= 750:
        limit = 500_000_00
    elif credit_score >= 650:
        limit = 200_000_00
    elif credit_score >= 550:
        limit = 100_000_00
    else:
        limit = 50_000_00

    if tier == "tier_2":
        limit = min(limit, 100_000_00)
    if tier == "tier_3":
        limit = min(limit, 25_000_00)
    if confidence < 0.6:
        limit = min(limit, 25_000_00)

    return limit

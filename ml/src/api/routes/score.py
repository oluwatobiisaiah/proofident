from __future__ import annotations

import logging
import time

from fastapi import APIRouter, HTTPException, Request

from ..schemas import ScoreRequest, ScoreResponse
from ...config.settings import settings
from ...models.credit_scorer import CreditScorer
from ...models.feature_extractor import FeatureExtractor
from ...models.ml_scorer import MLScorer
from ...models.occupation_inferencer import OccupationInferencer, SkillExtractor

logger = logging.getLogger("proofident.score")
router = APIRouter()

_extractor = FeatureExtractor()
_scorer = CreditScorer()
_inferencer = OccupationInferencer()
_skill_extractor = SkillExtractor()
_ml_scorer = MLScorer(settings.model_path)


@router.post("/score/credit", response_model=ScoreResponse, tags=["scoring"])
async def calculate_credit_score(request: ScoreRequest, req: Request) -> ScoreResponse:
    request_id = getattr(req.state, "request_id", "")
    start = time.perf_counter()

    has_betting = bool(request.betting_data and request.betting_data.bets)
    has_momo = bool(request.mobile_money_data and request.mobile_money_data.transactions)
    has_sd = request.self_declared is not None

    if not (has_betting or has_momo or has_sd):
        raise HTTPException(status_code=400, detail="At least one data source must be provided.")

    features = _extractor.extract(
        request.betting_data,
        request.mobile_money_data,
        request.self_declared,
    )

    if request.completeness_tier_override:
        features["completeness_tier"] = request.completeness_tier_override

    rules_result = _scorer.calculate(features)

    # ML ensemble: GBM trained on interaction features + IsolationForest anomaly signal
    ml_pred = _ml_scorer.predict(features)

    anomaly_penalty: int = 0
    if ml_pred is not None:
        # Blend rule score with GBM (which captures cross-feature patterns rules miss)
        blended = round(0.60 * rules_result.final_score + 0.40 * ml_pred.gbm_score)
        # Anomaly penalty: mild reduction for statistically unusual feature combinations
        anomaly_penalty = max(0, round((ml_pred.anomaly_score - 0.6) * 20))
        final_score = max(300, min(850, blended - anomaly_penalty))
    else:
        final_score = rules_result.final_score

    occupation_result = _inferencer.infer(features)

    data_sources: list[str] = []
    if has_betting:
        data_sources.append("betting")
    if has_momo:
        data_sources.append("mobile_money")
    if has_sd:
        data_sources.append("self_declared")

    elapsed_ms = round((time.perf_counter() - start) * 1000)

    logger.info(
        "score_calculated",
        extra={
            "request_id": request_id,
            "user_id": request.user_id,
            "tier": rules_result.completeness_tier.value,
            "rules_score": rules_result.final_score,
            "gbm_score": ml_pred.gbm_score if ml_pred else None,
            "anomaly_score": ml_pred.anomaly_score if ml_pred else None,
            "final_score": final_score,
            "duration_ms": elapsed_ms,
        },
    )

    return ScoreResponse(
        user_id=request.user_id,
        credit_score=final_score,
        score_range=rules_result.score_range,
        confidence=rules_result.confidence,
        confidence_level=rules_result.confidence_level,
        completeness_tier=rules_result.completeness_tier,
        data_sources_used=data_sources,
        inferred_occupation=occupation_result.inferred_occupation,
        occupation_confidence=round(occupation_result.occupation_confidence, 2),
        transferable_traits=occupation_result.traits_as_dicts(),
        supporting_signals=occupation_result.supporting_signals,
        positive_factors=rules_result.positive_factors,
        negative_factors=rules_result.negative_factors,
        improvement_suggestions=rules_result.improvement_suggestions,
        recommended_loan_limit=rules_result.recommended_loan_limit,
        rules_score=rules_result.final_score,
        model_score=ml_pred.gbm_score if ml_pred else None,
        anomaly_score=ml_pred.anomaly_score if ml_pred else None,
        anomaly_penalty=anomaly_penalty if ml_pred else None,
        processing_time_ms=elapsed_ms,
    )

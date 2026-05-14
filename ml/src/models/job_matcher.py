"""
Job matching engine.

Step 1: Hard filters  — eliminate incompatible jobs (age, location, credit)
Step 2: Soft scoring  — weighted components for each passing job
Step 3: Rank and return top 5 with explanations
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional

from ..api.schemas import (
    IncomeProjection,
    JobListing,
    JobMatchResult,
    SkillBreakdown,
    UserProfile,
)


_ADJACENT_STATES: dict[str, set[str]] = {
    "Lagos": {"Ogun", "Oyo"},
    "Abuja": {"Nassarawa", "Niger", "Kogi"},
    "Kano": {"Kaduna", "Jigawa", "Katsina"},
    "Rivers": {"Bayelsa", "Imo", "Abia"},
    "Oyo": {"Ogun", "Osun", "Kwara", "Lagos"},
}


def _location_match(user_state: str, job_state: str) -> float:
    if job_state.lower() == "nationwide":
        return 1.0
    if user_state.lower() == job_state.lower():
        return 1.0
    adj = _ADJACENT_STATES.get(user_state, set())
    if job_state in adj:
        return 0.7
    return 0.3


def _income_opportunity_score(current_income: int, job_min_income: int) -> float:
    if current_income <= 0:
        return 0.9  # strong motivation when starting from nothing
    increase = (job_min_income - current_income) / current_income
    if increase >= 0.5:
        return 1.0
    if increase >= 0.25:
        return 0.8
    if increase >= 0.10:
        return 0.6
    if increase >= 0.0:
        return 0.4
    return 0.2  # pay cut


def _skill_match_component(
    user_skills: dict[str, float],
    required_skills: dict[str, float],
) -> tuple[float, dict[str, SkillBreakdown]]:
    if not required_skills:
        return 1.0, {}

    scores: list[float] = []
    breakdown: dict[str, SkillBreakdown] = {}

    for skill, threshold in required_skills.items():
        user_val = user_skills.get(skill, 0.0)  # 0.0 = no signal for this skill
        if user_val >= threshold:
            match_score = 1.0
        else:
            match_score = user_val / max(threshold, 0.01)
        scores.append(match_score)
        breakdown[skill] = SkillBreakdown(
            user_score=round(user_val, 3),
            required=round(threshold, 3),
            match=user_val >= threshold,
        )

    return sum(scores) / len(scores), breakdown


def _user_has_item(user: UserProfile, item: str) -> bool:
    item = item.lower()
    if item == "smartphone":
        return user.has_smartphone
    if item in ("bike", "motorcycle"):
        return user.has_bike
    if item in ("car", "vehicle"):
        return user.has_car
    return True  # unknown item — don't block


def _credit_qualification(
    user_credit: int,
    user_loan_limit: int,
    job_min_credit: int,
    startup_cost: int,
    confidence: float,
) -> tuple[float, bool]:
    """Return (score, loan_available)."""
    if startup_cost <= 0:
        return 1.0, False

    can_get_loan = (
        user_credit >= job_min_credit
        and user_loan_limit >= startup_cost
        and confidence >= 0.6
    )
    if can_get_loan:
        return 1.0, True
    if user_credit >= job_min_credit and user_loan_limit >= startup_cost * 0.5:
        return 0.5, False
    return 0.0, False


class JobMatcher:
    WEIGHTS = {
        "skill": 0.40,
        "location": 0.25,
        "income": 0.20,
        "credit": 0.15,
    }

    def match(
        self,
        user: UserProfile,
        jobs: list[JobListing],
        user_skills: Optional[dict[str, float]] = None,
        user_loan_limit: int = 0,
    ) -> tuple[list[JobMatchResult], int]:
        """Return (top-5 matches, total jobs that passed hard filter)."""
        skills = {**user.skills, **(user_skills or {})}

        passed: list[JobListing] = []
        for job in jobs:
            ok, _ = self._hard_filter(user, job)
            if ok:
                passed.append(job)

        results: list[JobMatchResult] = []
        for job in passed:
            result = self._soft_score(user, job, skills, user_loan_limit)
            results.append(result)

        results.sort(key=lambda r: r.match_score, reverse=True)
        return results[:5], len(passed)

    # ------------------------------------------------------------------
    # Hard filter
    # ------------------------------------------------------------------

    def _hard_filter(self, user: UserProfile, job: JobListing) -> tuple[bool, str]:
        # Age check
        if job.min_age and user.age and user.age < job.min_age:
            return False, f"Below minimum age {job.min_age}"
        if job.max_age and user.age and user.age > job.max_age:
            return False, f"Above maximum age {job.max_age}"

        # Credit score minimum
        if user.credit_score < job.min_credit_score:
            return False, f"Credit score {user.credit_score} below job minimum {job.min_credit_score}"

        # Required items (only block if user lacks it AND we can't loan it)
        for item in job.required_items:
            if item.lower() in ("bike", "motorcycle", "car", "vehicle"):
                # We can potentially loan these — don't hard-block
                continue
            if not _user_has_item(user, item):
                return False, f"Missing required item: {item}"

        return True, ""

    # ------------------------------------------------------------------
    # Soft scoring
    # ------------------------------------------------------------------

    def _soft_score(
        self,
        user: UserProfile,
        job: JobListing,
        skills: dict[str, float],
        user_loan_limit: int,
    ) -> JobMatchResult:
        # Component 1: Skill match
        skill_score, skill_breakdown = _skill_match_component(skills, job.required_skills)

        # Component 2: Location match
        location_score = _location_match(user.location_state, job.location_state)

        # Component 3: Income opportunity
        income_score = _income_opportunity_score(user.monthly_income, job.min_income)

        # Component 4: Credit qualification
        credit_score, loan_available = _credit_qualification(
            user.credit_score,
            user_loan_limit,
            job.min_credit_score,
            job.startup_cost,
            user.confidence,
        )

        match_score = (
            skill_score * self.WEIGHTS["skill"] +
            location_score * self.WEIGHTS["location"] +
            income_score * self.WEIGHTS["income"] +
            credit_score * self.WEIGHTS["credit"]
        )
        match_score = round(min(match_score, 1.0), 3)

        reasons = self._generate_reasons(
            user, job, skills, skill_breakdown,
            location_score, income_score, loan_available,
        )

        current = user.monthly_income
        increase_pct = round(((job.min_income - current) / max(current, 1)) * 100, 1) if current > 0 else 0.0

        return JobMatchResult(
            job_id=job.job_id,
            match_score=match_score,
            match_percentage=round(match_score * 100),
            match_reasons=reasons,
            skill_breakdown=skill_breakdown,
            income_projection=IncomeProjection(
                current=current,
                job_min=job.min_income,
                job_max=job.max_income,
                increase_percentage=increase_pct,
            ),
            loan_available=loan_available,
            hard_requirements_met=True,
        )

    def _generate_reasons(
        self,
        user: UserProfile,
        job: JobListing,
        skills: dict[str, float],
        skill_breakdown: dict[str, SkillBreakdown],
        location_score: float,
        income_score: float,
        loan_available: bool,
    ) -> list[str]:
        reasons: list[str] = []

        # Skill-based reasons
        for skill, bd in skill_breakdown.items():
            score_pct = round(bd.user_score * 100)
            req_pct = round(bd.required * 100)
            label = skill.replace("_", " ").title()
            if bd.match:
                reasons.append(
                    f"{label} score {score_pct}/100 meets the job requirement of {req_pct}/100."
                )
            else:
                reasons.append(
                    f"{label} score {score_pct}/100 is below the required {req_pct}/100 — room to grow."
                )

        # Location
        if location_score == 1.0:
            reasons.append(f"You're based in {user.location_state}, which matches the job location.")
        elif location_score >= 0.7:
            reasons.append(f"Your state is adjacent to the job location — commutable or relocatable.")

        # Income
        current_k = user.monthly_income // 100
        job_min_k = job.min_income // 100
        job_max_k = job.max_income // 100
        if income_score >= 0.8:
            reasons.append(
                f"Strong income opportunity: ₦{job_min_k:,}–₦{job_max_k:,}/month vs your current ₦{current_k:,}."
            )
        elif income_score >= 0.5:
            reasons.append(
                f"Solid income step: ₦{job_min_k:,}/month minimum."
            )

        # Loan
        if loan_available:
            startup_k = job.startup_cost // 100
            reasons.append(
                f"Starter cost of ₦{startup_k:,} can be covered by a Proofident loan — no upfront barrier."
            )
        elif job.startup_cost > 0:
            startup_k = job.startup_cost // 100
            reasons.append(
                f"Startup cost is ₦{startup_k:,}. Improve your score to unlock a starter loan."
            )

        return reasons[:5]

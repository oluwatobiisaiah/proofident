from __future__ import annotations
from datetime import date, datetime
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class OutcomeType(str, Enum):
    win = "win"
    loss = "loss"
    pending = "pending"


class TransactionType(str, Enum):
    credit = "credit"
    debit = "debit"


class OccupationType(str, Enum):
    employed = "employed"
    self_employed = "self_employed"
    student = "student"
    unemployed = "unemployed"


class ScoreRange(str, Enum):
    prime = "prime"
    near_prime = "near_prime"
    subprime = "subprime"
    deep_subprime = "deep_subprime"


class ConfidenceLevel(str, Enum):
    high = "high"
    medium = "medium"
    low = "low"


class CompletnessTier(str, Enum):
    tier_1 = "tier_1"
    tier_2 = "tier_2"
    tier_3 = "tier_3"


# ---------------------------------------------------------------------------
# Betting data
# ---------------------------------------------------------------------------

class BetRecord(BaseModel):
    date: datetime
    amount: int = Field(..., gt=0, description="Bet amount in kobo")
    odds: float = Field(..., ge=1.0)
    outcome: OutcomeType
    payout: int = Field(default=0, ge=0, description="Payout in kobo; 0 for losses")
    bet_type: str = "single"
    league: Optional[str] = None
    match_start_time: Optional[datetime] = None

    @field_validator("amount", "payout")
    @classmethod
    def must_be_positive(cls, v: int) -> int:
        if v < 0:
            raise ValueError("must be >= 0")
        return v


class BettingData(BaseModel):
    bets: list[BetRecord] = Field(default_factory=list, max_length=500)
    total_deposits: int = Field(default=0, ge=0, description="Total deposits in kobo")
    total_withdrawals: int = Field(default=0, ge=0)


# ---------------------------------------------------------------------------
# Mobile money data
# ---------------------------------------------------------------------------

class MomoRecord(BaseModel):
    date: datetime
    type: TransactionType
    amount: int = Field(..., gt=0, description="Amount in kobo")
    balance_after: Optional[int] = Field(default=None, ge=0)
    merchant: Optional[str] = None
    merchant_category: Optional[str] = None
    recipient_hash: Optional[str] = None


class MobileMoneyData(BaseModel):
    transactions: list[MomoRecord] = Field(default_factory=list, max_length=10_000)


# ---------------------------------------------------------------------------
# Self-declared info
# ---------------------------------------------------------------------------

class SelfDeclared(BaseModel):
    occupation: OccupationType = OccupationType.unemployed
    monthly_income: int = Field(default=0, ge=0, description="In kobo")
    state: str = "Lagos"
    age: Optional[int] = Field(default=None, ge=18, le=99)
    employment_tenure_years: Optional[float] = Field(default=None, ge=0)
    has_smartphone: bool = True
    has_bike: bool = False
    has_car: bool = False


# ---------------------------------------------------------------------------
# Score request / response
# ---------------------------------------------------------------------------

class ScoreRequest(BaseModel):
    user_id: str
    betting_data: Optional[BettingData] = None
    mobile_money_data: Optional[MobileMoneyData] = None
    self_declared: Optional[SelfDeclared] = None
    completeness_tier_override: Optional[str] = None


class ScoreFactor(BaseModel):
    factor: str
    impact: int
    description: str


class ScoreResponse(BaseModel):
    user_id: str
    credit_score: int = Field(..., ge=300, le=850)
    score_range: ScoreRange
    confidence: float = Field(..., ge=0.0, le=1.0)
    confidence_level: ConfidenceLevel
    completeness_tier: CompletnessTier
    data_sources_used: list[str]
    inferred_occupation: str
    occupation_confidence: float
    transferable_traits: list[dict[str, Any]]
    supporting_signals: list[str]
    positive_factors: list[ScoreFactor]
    negative_factors: list[ScoreFactor]
    improvement_suggestions: list[str]
    recommended_loan_limit: int
    rules_score: int = Field(..., description="Rule-based score before ensemble blending")
    model_score: Optional[int] = Field(default=None, description="GBM prediction (0.40 weight in ensemble)")
    anomaly_score: Optional[float] = Field(default=None, description="0 = normal profile, 1 = statistically anomalous")
    anomaly_penalty: Optional[int] = Field(default=None, description="Points deducted by anomaly signal")
    processing_time_ms: int


# ---------------------------------------------------------------------------
# Job matching
# ---------------------------------------------------------------------------

class UserProfile(BaseModel):
    user_id: str
    credit_score: int = Field(..., ge=300, le=850)
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    completeness_tier: str = "tier_3"
    location_state: str = "Lagos"
    occupation: str = "unemployed"
    monthly_income: int = Field(default=0, ge=0, description="In kobo")
    age: Optional[int] = None
    has_smartphone: bool = True
    has_bike: bool = False
    has_car: bool = False
    skills: dict[str, float] = Field(default_factory=dict)


class JobListing(BaseModel):
    job_id: str
    title: str
    category: str
    location_state: str
    min_income: int = Field(..., ge=0, description="In kobo")
    max_income: int = Field(..., ge=0, description="In kobo")
    startup_cost: int = Field(default=0, ge=0, description="In kobo")
    startup_cost_breakdown: dict[str, int] = Field(default_factory=dict)
    min_credit_score: int = Field(default=300, ge=300, le=850)
    required_skills: dict[str, float] = Field(default_factory=dict)
    required_items: list[str] = Field(default_factory=list)
    employment_type: str = "gig"
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    employer: Optional[str] = None


class JobMatchRequest(BaseModel):
    user_profile: UserProfile
    available_jobs: list[JobListing]


class SkillBreakdown(BaseModel):
    user_score: float
    required: float
    match: bool


class IncomeProjection(BaseModel):
    current: int
    job_min: int
    job_max: int
    increase_percentage: float


class JobMatchResult(BaseModel):
    job_id: str
    match_score: float = Field(..., ge=0.0, le=1.0)
    match_percentage: int
    match_reasons: list[str]
    skill_breakdown: dict[str, SkillBreakdown]
    income_projection: IncomeProjection
    loan_available: bool
    hard_requirements_met: bool


class JobMatchResponse(BaseModel):
    user_id: str
    total_jobs_evaluated: int
    jobs_passed_hard_filter: int
    matches: list[JobMatchResult]
    processing_time_ms: int


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    models_loaded: bool = True
    timestamp: datetime

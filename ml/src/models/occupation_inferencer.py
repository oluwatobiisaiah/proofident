"""
Occupation inference and transferable skill extraction from behavioural features.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class TransferableTrait:
    key: str
    label: str
    score: int
    reason: str

    def to_dict(self) -> dict:
        return {"key": self.key, "label": self.label, "score": self.score, "reason": self.reason}


@dataclass
class OccupationResult:
    inferred_occupation: str
    occupation_confidence: float
    transferable_traits: list[TransferableTrait] = field(default_factory=list)
    supporting_signals: list[str] = field(default_factory=list)

    def traits_as_dicts(self) -> list[dict]:
        return [t.to_dict() for t in self.transferable_traits]


class OccupationInferencer:
    """
    Rule-based occupation inference.
    Rules are evaluated in priority order; first match wins.
    """

    def infer(self, features: dict[str, Any]) -> OccupationResult:
        momo = features.get("momo", {})
        betting = features.get("betting", {})
        sd = features.get("self_declared", {})

        monthly_credits = momo.get("_raw_monthly_credits", 0.0)
        unique_recipients = momo.get("_raw_unique_recipients", 0.0)
        income_regularity = momo.get("income_regularity", 0.0)
        bill_consistency = momo.get("bill_consistency", 0.0)
        weekend_activity = momo.get("weekend_activity", 0.0)
        merchant_diversity = momo.get("merchant_diversity", 0.0)
        tx_frequency = momo.get("tx_frequency", 0.0)

        bet_count = betting.get("_raw_bet_count", 0.0)
        avg_odds = betting.get("_raw_avg_odds", 3.0)
        impulse_control = betting.get("impulse_control", 0.5)

        emp_status = sd.get("employment_status", 0.0)
        tenure = sd.get("_raw_tenure", 0.0)
        age = sd.get("_raw_age", 30.0)

        # ---------------------------------------------------------------
        # Rule 1: Salary earner — high regularity, low frequency, single source
        # ---------------------------------------------------------------
        if income_regularity >= 0.75 and tx_frequency <= 0.3 and emp_status >= 1.0:
            traits = [
                TransferableTrait("reliability", "Reliability", 85,
                    "Consistent monthly salary deposits show stable employment commitment."),
                TransferableTrait("discipline", "Discipline", 78,
                    "Regular income pattern suggests structured schedule adherence."),
            ]
            signals = [
                "Single large recurring deposit each month aligns with salary structure.",
                f"Employment status confirmed as {self._emp_label(emp_status)}.",
                "Low transaction volume suggests focused spending behaviour.",
            ]
            return OccupationResult("salary_earner", 0.88, traits, signals)

        # ---------------------------------------------------------------
        # Rule 2: Market trader — high frequency, many recipients, low regularity
        # ---------------------------------------------------------------
        if tx_frequency >= 0.4 and unique_recipients >= 10 and merchant_diversity >= 0.3:
            traits = [
                TransferableTrait("commercial", "Commercial ability", 84,
                    "Frequent credits from multiple counterparties indicate active selling."),
                TransferableTrait("customer_service", "Customer handling", 74,
                    "Wide recipient network suggests strong customer relationship management."),
                TransferableTrait("resilience", "Resilience", 70,
                    "Daily business activity under variable conditions shows adaptability."),
            ]
            signals = [
                "High daily transaction count consistent with retail or market trading.",
                f"Payments to {int(unique_recipients)} unique counterparties indicate business breadth.",
                "Merchant category diversity aligns with trader procurement patterns.",
            ]
            return OccupationResult("market_trader", 0.86, traits, signals)

        # ---------------------------------------------------------------
        # Rule 3: Gig worker — multiple weekly deposits, weekend activity, variable income
        # ---------------------------------------------------------------
        if monthly_credits > 0 and income_regularity < 0.6 and weekend_activity >= 0.2:
            disc_score = int(70 + impulse_control * 15) if bet_count > 0 else 68
            traits = [
                TransferableTrait("discipline", "Discipline", disc_score,
                    "Betting impulse control maps to structured task completion in gig work."),
                TransferableTrait("reliability", "Reliability", 72,
                    "Regular gig income deposits show consistent effort even without fixed hours."),
            ]
            signals = [
                "Weekend deposit activity aligns with gig-economy earning patterns.",
                "Income variance is consistent with variable-rate platforms (delivery, ride-hailing).",
                "Multiple weekly credits suggest active task completion rather than passive income.",
            ]
            return OccupationResult("gig_worker", 0.78, traits, signals)

        # ---------------------------------------------------------------
        # Rule 4: Freelancer — irregular large deposits, low frequency
        # ---------------------------------------------------------------
        if monthly_credits >= 50_000_00 and income_regularity < 0.5 and tx_frequency <= 0.25:
            traits = [
                TransferableTrait("analytical", "Analytical ability", 76,
                    "Researched betting pattern suggests systematic problem-solving capability."),
                TransferableTrait("discipline", "Discipline", 72,
                    "Irregular but substantial income inflows align with project-based freelancing."),
            ]
            signals = [
                "Irregular large income credits consistent with project-based work.",
                "Low transaction volume suggests focused professional engagement.",
            ]
            return OccupationResult("freelancer", 0.75, traits, signals)

        # ---------------------------------------------------------------
        # Rule 5: Student / early jobseeker
        # ---------------------------------------------------------------
        if age <= 24 or emp_status <= 0.5:
            traits = [
                TransferableTrait("adaptability", "Adaptability", 60,
                    "Early-stage earner showing willingness to try diverse income sources."),
            ]
            signals = [
                "Age and employment status suggest early career stage.",
                "Transaction history is sparse but shows emerging financial activity.",
            ]
            return OccupationResult("early_jobseeker", 0.55, traits, signals)

        # ---------------------------------------------------------------
        # Default: general jobseeker / insufficient data
        # ---------------------------------------------------------------
        traits = [
            TransferableTrait("adaptability", "Adaptability", 54,
                "Limited data makes trait inference uncertain — connecting more data helps."),
        ]
        signals = [
            "Sparse transaction history limits occupation inference confidence.",
            "Connect more data sources to improve occupational profiling.",
        ]
        return OccupationResult("jobseeker", 0.40, traits, signals)

    @staticmethod
    def _emp_label(score: float) -> str:
        if score >= 1.0:
            return "employed"
        if score >= 0.75:
            return "self-employed"
        if score >= 0.5:
            return "student"
        return "unemployed"


class SkillExtractor:
    """
    Extracts transferable skill scores (0-100) from feature vectors.
    These map to job requirement thresholds.
    """

    def extract(self, features: dict[str, Any]) -> dict[str, float]:
        betting = features.get("betting", {})
        momo = features.get("momo", {})

        impulse_control = betting.get("impulse_control", 0.5)
        spending_velocity = momo.get("spending_velocity", 0.5)
        research_indicator = betting.get("research_indicator", 0.0)
        accumulator_ratio = betting.get("accumulator_ratio", 0.5)
        unique_recipients = momo.get("_raw_unique_recipients", 0.0)
        income_regularity = momo.get("income_regularity", 0.5)
        bill_consistency = momo.get("bill_consistency", 0.5)
        bankroll_management = betting.get("bankroll_management", 0.5)
        liquidity_cushion = momo.get("liquidity_cushion", 0.5)
        avg_odds = betting.get("_raw_avg_odds", 3.0)

        # Discipline: impulse control (betting) + paced spending (momo)
        discipline = (impulse_control + spending_velocity) / 2

        # Customer service: social network size
        import math
        customer_service = min(math.log(unique_recipients + 1) / math.log(50), 1.0)

        # Analytical ability: research quality + consistent odds strategy
        analytical = (research_indicator + (1.0 - min(accumulator_ratio, 1.0))) / 2

        # Financial management: bankroll + liquidity
        financial_management = (bankroll_management + liquidity_cushion) / 2

        # Reliability: bill payment + income regularity
        reliability = (bill_consistency + income_regularity) / 2

        # Risk tolerance: higher odds = higher risk tolerance (for sales/commission roles)
        risk_tolerance = min(max((avg_odds - 1.5) / 6.0, 0.0), 1.0)

        # Social capital
        social_capital = customer_service  # same proxy

        return {
            "discipline": round(discipline, 3),
            "customer_service": round(customer_service, 3),
            "analytical": round(analytical, 3),
            "financial_management": round(financial_management, 3),
            "reliability": round(reliability, 3),
            "risk_tolerance": round(risk_tolerance, 3),
            "social_capital": round(social_capital, 3),
        }

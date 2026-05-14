"""
Rule-based credit scorer.

Base score: 600
Max: 850, Min: 300
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from ..api.schemas import ConfidenceLevel, CompletnessTier, ScoreFactor, ScoreRange


@dataclass
class ScoringResult:
    raw_score: int
    final_score: int
    score_range: ScoreRange
    confidence: float
    confidence_level: ConfidenceLevel
    completeness_tier: CompletnessTier
    positive_factors: list[ScoreFactor] = field(default_factory=list)
    negative_factors: list[ScoreFactor] = field(default_factory=list)
    improvement_suggestions: list[str] = field(default_factory=list)
    recommended_loan_limit: int = 0
    caps_applied: list[str] = field(default_factory=list)


class CreditScorer:
    BASE_SCORE = 600

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def calculate(self, features: dict[str, Any]) -> ScoringResult:
        score = self.BASE_SCORE
        positives: list[ScoreFactor] = []
        negatives: list[ScoreFactor] = []

        betting = features.get("betting", {})
        momo = features.get("momo", {})
        sd = features.get("self_declared", {})
        xval = features.get("cross_validation", {})
        risk = features.get("risk", {})
        tier = features.get("completeness_tier", "tier_3")

        # Rule Set 1: Betting Behaviour
        score, positives, negatives = self._apply_betting_rules(score, betting, positives, negatives)

        # Rule Set 2: Mobile Money
        score, positives, negatives = self._apply_momo_rules(score, momo, positives, negatives)

        # Rule Set 3: Self-Declared
        score, positives, negatives = self._apply_self_declared_rules(score, sd, positives, negatives)

        # Rule Set 4: Cross-Validation Penalties
        score, negatives = self._apply_xval_penalties(score, xval, negatives)

        # Rule Set 5: Hard Caps
        score, caps = self._apply_caps(score, risk, tier)

        # Clamp
        final_score = max(300, min(850, round(score)))

        # Confidence
        confidence = self._calculate_confidence(betting, momo, xval, tier)
        confidence_level = self._confidence_level(confidence)
        score_range = self._score_range(final_score)
        completeness_tier = CompletnessTier(tier)
        loan_limit = self._recommended_loan_limit(final_score, confidence, tier)
        suggestions = self._generate_suggestions(betting, momo, xval, tier, final_score)

        return ScoringResult(
            raw_score=round(score),
            final_score=final_score,
            score_range=score_range,
            confidence=round(confidence, 2),
            confidence_level=confidence_level,
            completeness_tier=completeness_tier,
            positive_factors=positives,
            negative_factors=negatives,
            improvement_suggestions=suggestions,
            recommended_loan_limit=loan_limit,
            caps_applied=caps,
        )

    # ------------------------------------------------------------------
    # Rule sets
    # ------------------------------------------------------------------

    def _apply_betting_rules(
        self,
        score: float,
        betting: dict,
        positives: list,
        negatives: list,
    ) -> tuple[float, list, list]:
        if betting.get("_raw_bet_count", 0) == 0:
            return score, positives, negatives

        # Impulse control
        ic = betting.get("impulse_control", 0.0)
        if ic >= 0.7:
            delta = 15
            score += delta
            positives.append(ScoreFactor(factor="Betting discipline", impact=delta,
                description="You rarely chase losses — a strong signal of financial self-control."))
        elif ic >= 0.4:
            delta = 8
            score += delta
            positives.append(ScoreFactor(factor="Moderate betting discipline", impact=delta,
                description="You show reasonable restraint after losses."))
        else:
            delta = -18
            score += delta
            negatives.append(ScoreFactor(factor="Loss-chasing behaviour", impact=delta,
                description="Frequent bets immediately after losses indicate impulsive decision-making."))

        # Withdrawal discipline
        wd = betting.get("withdrawal_discipline", 0.0)
        if wd >= 0.6:
            delta = 12
            score += delta
            positives.append(ScoreFactor(factor="Withdrawal discipline", impact=delta,
                description="You cash out winnings rather than re-betting — shows financial maturity."))
        elif wd >= 0.3:
            delta = 6
            score += delta
            positives.append(ScoreFactor(factor="Partial withdrawal habit", impact=delta,
                description="You occasionally withdraw winnings which shows some financial discipline."))
        else:
            delta = -12
            score += delta
            negatives.append(ScoreFactor(factor="Low withdrawal discipline", impact=delta,
                description="Most winnings are re-bet rather than withdrawn."))

        # Risk calibration via average odds
        avg_odds = betting.get("_raw_avg_odds", 3.0)
        if 1.5 <= avg_odds <= 2.5:
            delta = 10
            score += delta
            positives.append(ScoreFactor(factor="Calculated risk taking", impact=delta,
                description=f"Average odds of {avg_odds:.1f} suggest you research picks and avoid lottery bets."))
        elif 2.5 < avg_odds <= 4.0:
            delta = 5
            score += delta
            positives.append(ScoreFactor(factor="Moderate risk calibration", impact=delta,
                description=f"Average odds of {avg_odds:.1f} show some risk awareness."))
        elif avg_odds > 5.0:
            delta = -22
            score += delta
            negatives.append(ScoreFactor(factor="High-risk betting pattern", impact=delta,
                description=f"Average odds of {avg_odds:.1f} indicate a preference for accumulator/lottery-style bets."))

        # Bankroll management
        br = betting.get("_raw_bankroll_ratio", 0.5)
        if br < 0.15:
            delta = 12
            score += delta
            positives.append(ScoreFactor(factor="Sound bankroll management", impact=delta,
                description="You bet a small fraction of your balance — excellent risk management."))
        elif br > 0.5:
            delta = -22
            score += delta
            negatives.append(ScoreFactor(factor="Poor bankroll management", impact=delta,
                description="Bet sizes are large relative to balance, indicating all-in tendencies."))

        return score, positives, negatives

    def _apply_momo_rules(
        self,
        score: float,
        momo: dict,
        positives: list,
        negatives: list,
    ) -> tuple[float, list, list]:
        if momo.get("_raw_monthly_credits", 0) == 0:
            return score, positives, negatives

        # Transaction frequency
        if momo.get("tx_frequency", 0.0) >= 0.2:
            delta = 12
            score += delta
            positives.append(ScoreFactor(factor="Active transaction history", impact=delta,
                description="Frequent mobile money usage provides strong evidence of regular financial activity."))

        # Liquidity cushion
        lc = momo.get("liquidity_cushion", 0.0)
        if lc >= 0.2:
            delta = 10
            score += delta
            positives.append(ScoreFactor(factor="Liquidity buffer", impact=delta,
                description="You maintain a balance buffer — you're not living paycheck to paycheck."))
        elif lc < 0.05:
            delta = -10
            score += delta
            negatives.append(ScoreFactor(factor="Low liquidity", impact=delta,
                description="Balance frequently runs near zero, reducing repayment comfort."))

        # Social capital / unique recipients
        if momo.get("_raw_unique_recipients", 0) >= 8:
            delta = 8
            score += delta
            positives.append(ScoreFactor(factor="Financial network diversity", impact=delta,
                description="Sending money to many different people signals strong social trust and business activity."))

        # Bill payment consistency
        bc = momo.get("bill_consistency", 0.0)
        if bc >= 0.6:
            delta = 10
            score += delta
            positives.append(ScoreFactor(factor="Consistent bill payments", impact=delta,
                description="Regular utility and bill payments show you meet financial obligations reliably."))

        # Income regularity
        ir = momo.get("income_regularity", 0.0)
        if ir >= 0.7:
            delta = 12
            score += delta
            positives.append(ScoreFactor(factor="Stable income pattern", impact=delta,
                description="Mobile money shows steady, predictable income deposits."))
        elif ir < 0.3:
            delta = -8
            score += delta
            negatives.append(ScoreFactor(factor="Irregular income", impact=delta,
                description="Income credits are highly irregular, increasing repayment risk."))

        # Spending velocity
        sv = momo.get("spending_velocity", 0.0)
        if sv >= 0.5:
            delta = 8
            score += delta
            positives.append(ScoreFactor(factor="Paced spending", impact=delta,
                description="You tend to spend gradually rather than burning through income immediately."))

        return score, positives, negatives

    def _apply_self_declared_rules(
        self,
        score: float,
        sd: dict,
        positives: list,
        negatives: list,
    ) -> tuple[float, list, list]:
        emp = sd.get("employment_status", 0.0)
        if emp >= 1.0:
            delta = 20
            score += delta
            positives.append(ScoreFactor(factor="Employed status", impact=delta,
                description="Current employment provides income stability."))
        elif emp >= 0.75:
            tenure = sd.get("_raw_tenure", 0.0)
            if tenure >= 3:
                delta = 18
                score += delta
                positives.append(ScoreFactor(factor="Established self-employment", impact=delta,
                    description=f"{tenure:.0f} years in business demonstrates stability."))
            else:
                delta = 8
                score += delta
                positives.append(ScoreFactor(factor="Self-employed", impact=delta,
                    description="Self-employment shows initiative."))
        else:
            delta = -8
            score += delta
            negatives.append(ScoreFactor(factor="No formal employment", impact=delta,
                description="No employment or business verified — income source uncertain."))

        # Age bonus
        age = sd.get("_raw_age", 30.0)
        if 25 <= age <= 45:
            delta = 8
            score += delta
            positives.append(ScoreFactor(factor="Prime working age", impact=delta,
                description="Age range suggests financial stability and earning potential."))
        else:
            delta = 3
            score += delta
            positives.append(ScoreFactor(factor="Working age", impact=delta,
                description="Age within working range."))

        return score, positives, negatives

    def _apply_xval_penalties(
        self,
        score: float,
        xval: dict,
        negatives: list,
    ) -> tuple[float, list]:
        discrepancy = xval.get("_raw_income_discrepancy_ratio", 0.0)
        if discrepancy > 1.0:
            delta = -30
            score += delta
            negatives.append(ScoreFactor(factor="Large income discrepancy", impact=delta,
                description="Declared income is significantly higher than what mobile money transactions suggest."))
        elif discrepancy > 0.5:
            delta = -18
            score += delta
            negatives.append(ScoreFactor(factor="Moderate income discrepancy", impact=delta,
                description="Declared income doesn't fully align with transaction data."))

        data_completeness = xval.get("data_completeness", 0.25)
        if data_completeness < 0.5:
            delta = -20
            score += delta
            negatives.append(ScoreFactor(factor="Limited data sources", impact=delta,
                description="Only self-declared information is available — no transaction history to validate."))

        return score, negatives

    def _apply_caps(
        self,
        score: float,
        risk: dict,
        tier: str,
    ) -> tuple[float, list[str]]:
        caps: list[str] = []

        if risk.get("betting_harm_risk", 0.0) >= 0.7:
            score = min(score, 550)
            caps.append("betting_harm_risk_cap_550")

        if risk.get("financial_stress", 0.0) >= 0.8:
            score = min(score, 600)
            caps.append("financial_stress_cap_600")

        if tier == "tier_3" and score > 620:
            score = min(score, 620)
            caps.append("thin_file_cap_620")

        return score, caps

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _calculate_confidence(
        self,
        betting: dict,
        momo: dict,
        xval: dict,
        tier: str,
    ) -> float:
        if tier == "tier_1":
            return 0.90
        if tier == "tier_2":
            return 0.72
        return 0.38

    def _confidence_level(self, confidence: float) -> ConfidenceLevel:
        if confidence >= 0.8:
            return ConfidenceLevel.high
        if confidence >= 0.6:
            return ConfidenceLevel.medium
        return ConfidenceLevel.low

    def _score_range(self, score: int) -> ScoreRange:
        if score >= 750:
            return ScoreRange.prime
        if score >= 650:
            return ScoreRange.near_prime
        if score >= 550:
            return ScoreRange.subprime
        return ScoreRange.deep_subprime

    def _recommended_loan_limit(self, score: int, confidence: float, tier: str) -> int:
        if score >= 750:
            limit = 500_000_00  # ₦500K in kobo
        elif score >= 650:
            limit = 200_000_00
        elif score >= 550:
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

    def _generate_suggestions(
        self,
        betting: dict,
        momo: dict,
        xval: dict,
        tier: str,
        score: int,
    ) -> list[str]:
        suggestions: list[str] = []

        if tier == "tier_3":
            suggestions.append("Connect your Opay or SportyBet account to unlock stronger job and loan decisions.")

        if tier in ("tier_2", "tier_3") and momo.get("_raw_monthly_credits", 0) == 0:
            suggestions.append("Linking a mobile money account can add up to +40 points to your score.")

        if betting.get("_raw_bet_count", 0) < 20:
            suggestions.append("At least 6 months of betting history unlocks your full discipline analysis.")

        if momo.get("bill_consistency", 0.0) < 0.5:
            suggestions.append("Paying bills consistently via mobile money will improve your reliability score.")

        if score < 750:
            suggestions.append("Take a small starter loan and repay on time — each on-time payment adds +10 points.")

        if xval.get("_raw_income_discrepancy_ratio", 0.0) > 0.5:
            suggestions.append("Ensure your declared income matches your actual mobile money deposits for better confidence.")

        return suggestions[:4]

"""
Feature extraction from raw betting, mobile-money, and self-declared data.

All monetary values are in kobo (₦1 = 100 kobo).
All features are normalised to [0, 1] unless noted otherwise.
"""
from __future__ import annotations

import math
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from statistics import mean, stdev
from typing import Any, Optional

from ..api.schemas import BettingData, MobileMoneyData, SelfDeclared


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _safe_div(numerator: float, denominator: float, default: float = 0.0) -> float:
    if denominator == 0:
        return default
    return numerator / denominator


def _clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, value))


def _coeff_of_variation(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    m = mean(values)
    if m == 0:
        return 0.0
    return _safe_div(stdev(values), m)


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Betting feature extraction
# ---------------------------------------------------------------------------

def extract_betting_features(data: BettingData) -> dict[str, float]:
    bets = sorted(data.bets, key=lambda b: b.date)

    if not bets:
        return _empty_betting_features()

    # --- Feature 1.1: Impulse Control Index (do you chase losses?) -----------
    chase_count = 0
    loss_count = 0
    for i, bet in enumerate(bets):
        if bet.outcome.value == "loss":
            loss_count += 1
            # Check if the very next bet is within 2 hours and >2x the amount
            for j in range(i + 1, len(bets)):
                delta = (bets[j].date - bet.date).total_seconds() / 3600
                if delta <= 2:
                    if bets[j].amount > 2 * bet.amount:
                        chase_count += 1
                    break
                else:
                    break

    impulse_control = _safe_div(loss_count - chase_count, loss_count, default=1.0)
    impulse_control = _clamp(impulse_control)

    # --- Feature 1.2: Withdrawal Discipline Rate --------------------------
    total_winnings = sum(b.payout for b in bets if b.outcome.value == "win")
    withdrawal_discipline = _clamp(_safe_div(data.total_withdrawals, total_winnings, default=0.5))

    # --- Feature 1.3: Average Bet Odds ------------------------------------
    avg_odds = mean(b.odds for b in bets)

    # --- Feature 1.4: Bankroll Management Score ---------------------------
    # average bet size / average balance (approximated from deposit history)
    avg_bet = mean(b.amount for b in bets)
    # We approximate running balance as deposits/4 (monthly average quarter)
    approx_balance = max(data.total_deposits / 4, avg_bet)
    bankroll_ratio = _safe_div(avg_bet, approx_balance, default=0.5)

    # --- Feature 1.5: Win Rate --------------------------------------------
    wins = sum(1 for b in bets if b.outcome.value == "win")
    win_rate = _safe_div(wins, len(bets))

    # --- Feature 1.6: Bet Frequency (bets per week) -----------------------
    if len(bets) >= 2:
        span_days = max((bets[-1].date - bets[0].date).days, 1)
        bet_freq = len(bets) / (span_days / 7)
    else:
        bet_freq = 0.0

    # --- Feature 1.7: Bet Size Consistency (CV; lower = more consistent) --
    bet_cv = _coeff_of_variation([float(b.amount) for b in bets])

    # --- Feature 1.8: Research Indicator (avg hours before match) ---------
    advance_times = []
    for b in bets:
        if b.match_start_time:
            delta_hours = (b.match_start_time - b.date).total_seconds() / 3600
            if 0 <= delta_hours <= 168:
                advance_times.append(delta_hours)
    # Normalise: 24h+ advance → 1.0; <1h → 0.0
    research_score = _clamp(_safe_div(mean(advance_times) if advance_times else 1.0, 24.0))

    # --- Feature 1.9: League Diversity ------------------------------------
    unique_leagues = len(set(b.league for b in bets if b.league))
    league_diversity = _clamp(math.log(unique_leagues + 1) / math.log(15))

    # --- Feature 1.10: Accumulator Ratio ----------------------------------
    accum_count = sum(1 for b in bets if b.bet_type == "accumulator")
    accumulator_ratio = _safe_div(accum_count, len(bets))

    # --- Feature 1.11: Max Bet Spike (max bet / mean bet) ----------------
    max_bet = max(b.amount for b in bets)
    max_bet_spike = _clamp(_safe_div(avg_bet, max_bet, default=0.0))  # inverse (higher = less volatile)

    # --- Feature 1.12: Recovery Pattern (avg days between big-loss and next bet) --
    big_loss_threshold = avg_bet * 3
    recovery_days_list: list[float] = []
    for i, bet in enumerate(bets):
        if bet.outcome.value == "loss" and bet.amount >= big_loss_threshold:
            for j in range(i + 1, len(bets)):
                delta_days = (bets[j].date - bet.date).days
                recovery_days_list.append(float(delta_days))
                break
    recovery_score = _clamp(_safe_div(mean(recovery_days_list) if recovery_days_list else 7.0, 14.0))

    # --- Feature 1.13: Deposit Frequency (deposits per month) -------------
    # We only have total deposits figure; approximate from time span
    span_months = max((bets[-1].date - bets[0].date).days / 30.0, 1.0)
    deposit_freq = _clamp(span_months / 6.0)  # normalised against 6-month window

    # --- Feature 1.14: Net Position (positive = winning) ------------------
    total_staked = sum(b.amount for b in bets)
    net_position = total_winnings - total_staked  # may be negative
    net_position_score = _clamp(0.5 + _safe_div(net_position, max(total_staked, 1), default=0.0) * 0.5)

    # --- Feature 1.15: Account Longevity (days since first bet) -----------
    span_days_total = (bets[-1].date - bets[0].date).days
    longevity_score = _clamp(span_days_total / 365.0)  # 1 year = 1.0

    return {
        "impulse_control": impulse_control,
        "withdrawal_discipline": withdrawal_discipline,
        "avg_odds": avg_odds,
        "bankroll_management": _clamp(1.0 - bankroll_ratio),  # high = good
        "win_rate": win_rate,
        "bet_frequency": _clamp(bet_freq / 50.0),  # normalised to 50 bets/week = 1.0
        "bet_size_consistency": _clamp(1.0 - min(bet_cv, 1.0)),
        "research_indicator": research_score,
        "league_diversity": league_diversity,
        "accumulator_ratio": accumulator_ratio,
        "max_bet_spike": max_bet_spike,
        "recovery_pattern": recovery_score,
        "deposit_frequency": deposit_freq,
        "net_position": net_position_score,
        "account_longevity": longevity_score,
        # raw values for rule-based scoring
        "_raw_avg_odds": avg_odds,
        "_raw_bankroll_ratio": bankroll_ratio,
        "_raw_bet_count": float(len(bets)),
    }


def _empty_betting_features() -> dict[str, float]:
    keys = [
        "impulse_control", "withdrawal_discipline", "avg_odds", "bankroll_management",
        "win_rate", "bet_frequency", "bet_size_consistency", "research_indicator",
        "league_diversity", "accumulator_ratio", "max_bet_spike", "recovery_pattern",
        "deposit_frequency", "net_position", "account_longevity",
        "_raw_avg_odds", "_raw_bankroll_ratio", "_raw_bet_count",
    ]
    return {k: 0.0 for k in keys}


# ---------------------------------------------------------------------------
# Mobile money feature extraction
# ---------------------------------------------------------------------------

def extract_momo_features(data: MobileMoneyData) -> dict[str, float]:
    txns = sorted(data.transactions, key=lambda t: t.date)

    if not txns:
        return _empty_momo_features()

    credits = [t for t in txns if t.type.value == "credit"]
    debits = [t for t in txns if t.type.value == "debit"]

    span_days = max((txns[-1].date - txns[0].date).days, 1)
    span_months = max(span_days / 30.0, 1.0)

    # --- Feature 2.1: Transaction Frequency -------------------------------
    tx_freq = len(txns) / span_months
    tx_freq_score = _clamp(tx_freq / 100.0)  # 100/month = 1.0

    # --- Feature 2.2: Average Transaction Size ----------------------------
    avg_tx_size = mean(t.amount for t in txns)

    # --- Feature 2.3: Balance Volatility ----------------------------------
    balances = [t.balance_after for t in txns if t.balance_after is not None]
    if len(balances) >= 2:
        balance_cv = _coeff_of_variation([float(b) for b in balances])
        balance_volatility = _clamp(1.0 - min(balance_cv, 1.0))
    else:
        balance_volatility = 0.5

    # --- Feature 2.4: Liquidity Cushion Ratio -----------------------------
    avg_balance = mean(balances) if balances else 0.0
    monthly_expenses = sum(t.amount for t in debits) / span_months if debits else 1.0
    liquidity_cushion = _clamp(_safe_div(avg_balance, monthly_expenses * 5))  # 5 months = 1.0

    # --- Feature 2.5: Unique Recipients Count ----------------------------
    unique_recipients = len(set(t.recipient_hash for t in txns if t.recipient_hash))
    social_capital = _clamp(math.log(unique_recipients + 1) / math.log(100))

    # --- Feature 2.6: Bill Payment Consistency ----------------------------
    bill_categories = {"utilities", "nepa", "dstv", "bills", "electricity", "water"}
    bill_payments = [
        t for t in debits
        if t.merchant_category and any(c in (t.merchant_category or "").lower() for c in bill_categories)
    ]
    bill_consistency = _clamp(len(bill_payments) / max(span_months, 1.0) / 2.0)  # 2/month = 1.0

    # --- Feature 2.7: Income Regularity Score ----------------------------
    # Group credits by week, check coefficient of variation
    weekly_credits: dict[str, float] = defaultdict(float)
    for t in credits:
        week_key = t.date.strftime("%Y-W%W")
        weekly_credits[week_key] += t.amount
    income_cv = _coeff_of_variation(list(weekly_credits.values())) if weekly_credits else 1.0
    income_regularity = _clamp(1.0 - min(income_cv, 1.0))

    # --- Feature 2.8: Spending Velocity (days from credit to balance drop) -
    # Proxy: average days before spending half of any credit
    velocity_scores: list[float] = []
    for i, t in enumerate(credits):
        half_amount = t.amount / 2
        spent = 0.0
        for j in range(i + 1, min(i + 30, len(txns))):
            if txns[j].type.value == "debit":
                spent += txns[j].amount
                if spent >= half_amount:
                    days = (txns[j].date - t.date).days
                    velocity_scores.append(float(days))
                    break
    if velocity_scores:
        avg_velocity_days = mean(velocity_scores)
        spending_velocity = _clamp(avg_velocity_days / 15.0)  # 15+ days = 1.0
    else:
        spending_velocity = 0.5

    # --- Feature 2.9: Merchant Category Diversity -------------------------
    categories = set(t.merchant_category for t in txns if t.merchant_category)
    merchant_diversity = _clamp(len(categories) / 15.0)

    # --- Feature 2.10: Credit/Debit Ratio --------------------------------
    total_credits = sum(t.amount for t in credits)
    total_debits = sum(t.amount for t in debits)
    credit_debit_ratio = _clamp(_safe_div(total_credits, max(total_debits, 1)))

    # --- Feature 2.11: Weekend Activity Ratio ----------------------------
    weekend_txns = [t for t in txns if t.date.weekday() >= 5]
    weekend_ratio = _safe_div(len(weekend_txns), len(txns))

    # --- Feature 2.12: Large Transaction Frequency -----------------------
    if txns:
        median_amount = sorted(t.amount for t in txns)[len(txns) // 2]
        large_threshold = median_amount * 10
        large_txns = [t for t in txns if t.amount >= large_threshold]
        large_tx_freq = _safe_div(len(large_txns), len(txns))
    else:
        large_tx_freq = 0.0

    return {
        "tx_frequency": tx_freq_score,
        "avg_tx_size": _clamp(avg_tx_size / 500000.0),  # 500K kobo = 1.0
        "balance_volatility": balance_volatility,
        "liquidity_cushion": liquidity_cushion,
        "social_capital": social_capital,
        "bill_consistency": bill_consistency,
        "income_regularity": income_regularity,
        "spending_velocity": spending_velocity,
        "merchant_diversity": merchant_diversity,
        "credit_debit_ratio": credit_debit_ratio,
        "weekend_activity": weekend_ratio,
        "large_tx_freq": large_tx_freq,
        # raw values for rules
        "_raw_unique_recipients": float(unique_recipients),
        "_raw_avg_balance": avg_balance,
        "_raw_monthly_credits": total_credits / span_months,
        "_raw_bill_payment_count": float(len(bill_payments)),
        "_raw_span_months": span_months,
    }


def _empty_momo_features() -> dict[str, float]:
    keys = [
        "tx_frequency", "avg_tx_size", "balance_volatility", "liquidity_cushion",
        "social_capital", "bill_consistency", "income_regularity", "spending_velocity",
        "merchant_diversity", "credit_debit_ratio", "weekend_activity", "large_tx_freq",
        "_raw_unique_recipients", "_raw_avg_balance", "_raw_monthly_credits",
        "_raw_bill_payment_count", "_raw_span_months",
    ]
    return {k: 0.0 for k in keys}


# ---------------------------------------------------------------------------
# Self-declared feature extraction
# ---------------------------------------------------------------------------

_EMPLOYMENT_SCORE = {
    "employed": 1.0,
    "self_employed": 0.75,
    "student": 0.5,
    "unemployed": 0.0,
}

_STATE_RISK = {
    "lagos": 0.3, "abuja": 0.35, "rivers": 0.4, "oyo": 0.45,
    "kano": 0.5, "delta": 0.5, "anambra": 0.45, "edo": 0.5,
}


def extract_self_declared_features(sd: SelfDeclared) -> dict[str, float]:
    employment_score = _EMPLOYMENT_SCORE.get(sd.occupation.value, 0.0)
    income_score = _clamp(sd.monthly_income / 1_000_000.0)  # 1M kobo = 1.0

    tenure = sd.employment_tenure_years or 0.0
    tenure_score = _clamp(tenure / 10.0)

    age = sd.age or 30
    if 25 <= age <= 45:
        age_score = 1.0
    elif age < 25:
        age_score = 0.5
    else:
        age_score = 0.7

    state_risk = _STATE_RISK.get(sd.state.lower(), 0.5)
    state_score = 1.0 - state_risk  # low risk = high score

    return {
        "employment_status": employment_score,
        "declared_income": income_score,
        "employment_tenure": tenure_score,
        "age_score": age_score,
        "state_score": state_score,
        # raw
        "_raw_monthly_income": float(sd.monthly_income),
        "_raw_age": float(age),
        "_raw_tenure": tenure,
    }


# ---------------------------------------------------------------------------
# Cross-validation feature extraction
# ---------------------------------------------------------------------------

def extract_cross_validation_features(
    betting: dict[str, float],
    momo: dict[str, float],
    sd: dict[str, float],
) -> dict[str, float]:
    declared_income = sd["_raw_monthly_income"]
    momo_monthly_credits = momo["_raw_monthly_credits"]
    betting_implied_income = betting["_raw_avg_odds"] * 0.0  # placeholder; use bet volume proxy

    # Income vs declared
    income_match = _clamp(_safe_div(momo_monthly_credits, max(declared_income, 1)))
    income_discrepancy = abs(income_match - 1.0)  # 0 = perfect match

    # Source agreement score
    has_betting = betting["_raw_bet_count"] > 0
    has_momo = momo["_raw_monthly_credits"] > 0

    if has_betting and has_momo:
        data_completeness = 1.0
    elif has_betting or has_momo:
        data_completeness = 0.65
    else:
        data_completeness = 0.25

    # Recency: were any transactions in last 90 days?
    # We use a proxy: momo span > 0 means data exists; capped at 1.0
    data_recency = _clamp(momo["_raw_span_months"] / 6.0)

    # Income consistency across sources
    sources_with_income = []
    if declared_income > 0:
        sources_with_income.append(declared_income)
    if momo_monthly_credits > 0:
        sources_with_income.append(momo_monthly_credits)
    income_consistency = 1.0 - _clamp(_coeff_of_variation(sources_with_income)) if len(sources_with_income) >= 2 else 0.5

    return {
        "income_match": income_match,
        "income_discrepancy": _clamp(1.0 - income_discrepancy),  # high = low discrepancy
        "data_completeness": data_completeness,
        "data_recency": data_recency,
        "income_consistency": income_consistency,
        "_raw_income_discrepancy_ratio": income_discrepancy,
    }


# ---------------------------------------------------------------------------
# Derived risk indicators
# ---------------------------------------------------------------------------

def compute_risk_indicators(
    betting: dict[str, float],
    momo: dict[str, float],
) -> dict[str, float]:
    # Betting harm risk (higher = more harmful)
    chase_factor = 1.0 - betting.get("impulse_control", 1.0)
    accum_factor = betting.get("accumulator_ratio", 0.0)
    freq_factor = _clamp(betting.get("bet_frequency", 0.0))
    betting_harm = _clamp(chase_factor * 0.4 + accum_factor * 0.3 + freq_factor * 0.3)

    # Financial stress (higher = more stressed)
    low_liquidity = _clamp(1.0 - momo.get("liquidity_cushion", 0.0))
    low_bill_pay = _clamp(1.0 - momo.get("bill_consistency", 0.0))
    financial_stress = _clamp(low_liquidity * 0.5 + low_bill_pay * 0.5)

    # Credit readiness (higher = more ready)
    credit_readiness = _clamp(
        momo.get("income_regularity", 0.0) * 0.35 +
        momo.get("liquidity_cushion", 0.0) * 0.25 +
        betting.get("impulse_control", 0.0) * 0.2 +
        momo.get("bill_consistency", 0.0) * 0.2
    )

    return {
        "betting_harm_risk": betting_harm,
        "financial_stress": financial_stress,
        "credit_readiness": credit_readiness,
    }


# ---------------------------------------------------------------------------
# Master feature vector
# ---------------------------------------------------------------------------

class FeatureExtractor:
    def extract(
        self,
        betting_data: Optional[BettingData],
        momo_data: Optional[MobileMoneyData],
        self_declared: Optional[SelfDeclared],
    ) -> dict[str, Any]:
        betting = extract_betting_features(betting_data) if betting_data and betting_data.bets else _empty_betting_features()
        momo = extract_momo_features(momo_data) if momo_data and momo_data.transactions else _empty_momo_features()
        sd_raw = self_declared if self_declared else SelfDeclared()
        sd = extract_self_declared_features(sd_raw)
        xval = extract_cross_validation_features(betting, momo, sd)
        risk = compute_risk_indicators(betting, momo)

        completeness_tier = self._infer_tier(betting, momo)

        return {
            "betting": betting,
            "momo": momo,
            "self_declared": sd,
            "cross_validation": xval,
            "risk": risk,
            "completeness_tier": completeness_tier,
        }

    def _infer_tier(self, betting: dict, momo: dict) -> str:
        has_betting = betting["_raw_bet_count"] >= 20
        has_momo = momo["_raw_span_months"] >= 3.0
        if has_betting and has_momo:
            return "tier_1"
        if has_betting or has_momo:
            return "tier_2"
        return "tier_3"

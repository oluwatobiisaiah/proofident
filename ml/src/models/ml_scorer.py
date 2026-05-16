"""
Two-model ML pipeline:

1. HistGradientBoostingRegressor — predicts credit score from 28 features, including
   5 interaction terms that the additive rule scorer structurally cannot model.
   Training labels use synergy-aware scoring: cross-source bonuses/penalties
   that genuine feature combinations deserve but additive rules cannot express.

2. IsolationForest — unsupervised anomaly detector trained on the same feature
   space. Flags statistically unusual combinations (possible misrepresentation,
   hidden stress, or data inconsistency) independent of the supervised task.

Final score = 0.60 × rules + 0.40 × GBM − anomaly_penalty
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, NamedTuple, Optional

import numpy as np

logger = logging.getLogger("proofident.ml")

# Feature order is frozen — delete saved models if you change this list.
_FEATURE_NAMES = [
    # Betting (6) — zero-filled when no betting data
    "b_impulse_control", "b_withdrawal_discipline", "b_avg_odds_norm",
    "b_bankroll_ratio", "b_win_rate", "b_bet_frequency",
    # Mobile money (6)
    "m_tx_frequency", "m_liquidity_cushion", "m_bill_consistency",
    "m_income_regularity", "m_spending_velocity", "m_unique_recipients_norm",
    # Self-declared (4)
    "sd_employment_status", "sd_age_norm", "sd_income_norm", "sd_tenure_norm",
    # Cross-validation (2)
    "xv_data_completeness", "xv_discrepancy_norm",
    # Risk (2)
    "risk_betting_harm", "risk_financial_stress",
    # Presence flags (3)
    "has_betting", "has_momo", "has_self_declared",
    # Interaction features — cross-source patterns the rules cannot model (5)
    "ic_x_ir",   # impulse_control × income_regularity  (discipline + stability synergy)
    "emp_x_lc",  # employment_status × liquidity_cushion (employed with buffer = strong)
    "wr_x_odds", # win_rate × (1 − avg_odds_norm)       (skilled low-odds betting)
    "dc_x_xv",   # data_completeness × (1 − discrepancy) (reliable comprehensive data)
    "bf_x_br",   # bet_frequency × bankroll_ratio        (frequent high-stake bets = risk)
]


class MLPrediction(NamedTuple):
    gbm_score: int           # GBM regression output, clamped to [300, 850]
    anomaly_score: float     # 0 = normal profile, 1 = very anomalous


def _to_vector(features: dict[str, Any]) -> list[float]:
    betting = features.get("betting", {})
    momo = features.get("momo", {})
    sd = features.get("self_declared", {})
    xval = features.get("cross_validation", {})
    risk = features.get("risk", {})

    has_bet = float(bool(betting.get("_raw_bet_count", 0)))
    has_momo_f = float(bool(momo.get("_raw_monthly_credits", 0)))
    has_sd = float(bool(sd))

    # --- Base features -------------------------------------------------------
    b_ic  = betting.get("impulse_control", 0.5)      if has_bet else 0.0
    b_wd  = betting.get("withdrawal_discipline", 0.5) if has_bet else 0.0
    b_od  = min(betting.get("_raw_avg_odds", 3.0), 20.0) / 20.0 if has_bet else 0.5
    b_br  = betting.get("_raw_bankroll_ratio", 0.3)  if has_bet else 0.0
    b_wr  = betting.get("win_rate", 0.5)             if has_bet else 0.0
    b_bf  = betting.get("bet_frequency", 0.0)        if has_bet else 0.0

    m_tf  = momo.get("tx_frequency", 0.0)     if has_momo_f else 0.0
    m_lc  = momo.get("liquidity_cushion", 0.0) if has_momo_f else 0.0
    m_bc  = momo.get("bill_consistency", 0.0)  if has_momo_f else 0.0
    m_ir  = momo.get("income_regularity", 0.0) if has_momo_f else 0.0
    m_sv  = momo.get("spending_velocity", 0.0) if has_momo_f else 0.0
    m_ur  = min(momo.get("_raw_unique_recipients", 0), 50) / 50.0 if has_momo_f else 0.0

    sd_emp = sd.get("employment_status", 0.0)
    sd_age = max(0.0, min(1.0, (float(sd.get("_raw_age", 30)) - 18.0) / 42.0))
    sd_inc = min(float(sd.get("declared_income", 0)), 1_000_000_00) / 1_000_000_00
    sd_ten = min(float(sd.get("_raw_tenure", 0)), 10.0) / 10.0

    xv_dc   = xval.get("data_completeness", 0.25)
    xv_disc = min(xval.get("_raw_income_discrepancy_ratio", 0.0), 2.0) / 2.0

    r_bh = risk.get("betting_harm_risk", 0.2)
    r_fs = risk.get("financial_stress", 0.2)

    # --- Interaction features ------------------------------------------------
    # These encode cross-source relationships the additive rule scorer cannot
    # represent: it scores each feature against fixed thresholds independently.
    # A GBM on these terms learns how combinations jointly predict risk.
    ic_x_ir  = b_ic * m_ir                  # discipline × income stability
    emp_x_lc = sd_emp * max(0.0, m_lc)      # employment × liquidity buffer
    wr_x_od  = b_wr * (1.0 - b_od) if has_bet else 0.0   # skilled low-odds betting
    dc_x_xv  = xv_dc * (1.0 - xv_disc)     # comprehensive & consistent data
    bf_x_br  = b_bf * b_br if has_bet else 0.0            # frequent high-stake bets

    return [
        b_ic, b_wd, b_od, b_br, b_wr, b_bf,
        m_tf, m_lc, m_bc, m_ir, m_sv, m_ur,
        sd_emp, sd_age, sd_inc, sd_ten,
        xv_dc, xv_disc,
        r_bh, r_fs,
        has_bet, has_momo_f, has_sd,
        ic_x_ir, emp_x_lc, wr_x_od, dc_x_xv, bf_x_br,
    ]


# ---------------------------------------------------------------------------
# Main scorer class
# ---------------------------------------------------------------------------

class MLScorer:
    def __init__(self, model_path: Path) -> None:
        self._gbm_path = model_path
        self._iso_path = model_path.with_name("anomaly_model.joblib")
        self._gbm = None
        self._iso = None

    def ensure_ready(self) -> None:
        if self._gbm is not None and self._iso is not None:
            return
        if self._gbm_path.exists() and self._iso_path.exists():
            self._load()
        else:
            logger.info("ml_models_not_found_will_train")
            self._train_and_save()

    def predict(self, features: dict[str, Any]) -> Optional[MLPrediction]:
        if self._gbm is None or self._iso is None:
            return None
        try:
            vec = np.array([_to_vector(features)], dtype=np.float32)

            gbm_raw = float(self._gbm.predict(vec)[0])
            gbm_score = int(max(300, min(850, round(gbm_raw))))

            # IsolationForest.decision_function: positive = inlier, negative = outlier.
            # Map to [0, 1] where 1 = very anomalous so callers get an intuitive scale.
            iso_decision = float(self._iso.decision_function(vec)[0])
            anomaly_score = float(max(0.0, min(1.0, 0.5 - iso_decision)))

            return MLPrediction(gbm_score=gbm_score, anomaly_score=round(anomaly_score, 3))
        except Exception:
            logger.exception("ml_predict_error")
            return None

    # ------------------------------------------------------------------

    def _load(self) -> None:
        import joblib
        self._gbm = joblib.load(self._gbm_path)
        self._iso = joblib.load(self._iso_path)
        logger.info("ml_models_loaded")

    def _train_and_save(self) -> None:
        from sklearn.ensemble import HistGradientBoostingRegressor, IsolationForest
        from sklearn.model_selection import train_test_split
        import joblib

        X, y = _generate_training_data(n=4_000)
        X_tr, X_val, y_tr, y_val = train_test_split(X, y, test_size=0.15, random_state=42)

        gbm = HistGradientBoostingRegressor(
            max_iter=300,
            max_depth=5,
            learning_rate=0.05,
            min_samples_leaf=20,
            l2_regularization=0.1,
            random_state=42,
        )
        gbm.fit(X_tr, y_tr)
        val_mae = float(abs(gbm.predict(X_val) - y_val).mean())

        # Anomaly detector trained on full distribution (unsupervised; no labels used)
        iso = IsolationForest(n_estimators=200, contamination=0.08, random_state=42)
        iso.fit(X)

        self._gbm_path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(gbm, self._gbm_path)
        joblib.dump(iso, self._iso_path)
        self._gbm = gbm
        self._iso = iso
        logger.info(
            "ml_models_trained_and_saved",
            extra={"n_train": len(y_tr), "val_mae": round(val_mae, 1)},
        )


# ---------------------------------------------------------------------------
# Synthetic training data
# ---------------------------------------------------------------------------

def _generate_training_data(n: int) -> tuple[np.ndarray, np.ndarray]:
    from .credit_scorer import CreditScorer

    rng = np.random.default_rng(seed=0)
    scorer = CreditScorer()
    X_rows: list[list[float]] = []
    y_vals: list[float] = []

    for _ in range(n):
        feats = _random_features(rng)
        rule_score = float(scorer.calculate(feats).final_score)
        # Apply cross-feature synergy adjustments not expressible by additive rules
        target = _synergy_score(feats, rule_score, rng)
        X_rows.append(_to_vector(feats))
        y_vals.append(target)

    return np.array(X_rows, dtype=np.float32), np.array(y_vals, dtype=np.float32)


def _synergy_score(feats: dict[str, Any], base: float, rng: np.random.Generator) -> float:
    """
    Adjustments that genuinely go beyond additive rules:
    - Rules score impulse_control independently and income_regularity independently.
      Their COMBINATION signals something qualitatively different: the person applies
      the same self-discipline to finances as to betting — a stronger repayment signal.
    - Rules cannot penalise "employed but financially stressed" more than the sum of
      the two individual penalties, yet this combination is the strongest default predictor.
    """
    b = feats.get("betting", {})
    m = feats.get("momo", {})
    sd = feats.get("self_declared", {})
    risk = feats.get("risk", {})

    ic  = b.get("impulse_control", 0.5)
    ir  = m.get("income_regularity", 0.5)
    lc  = m.get("liquidity_cushion", 0.1)
    emp = sd.get("employment_status", 0.0)
    fs  = risk.get("financial_stress", 0.5)
    wr  = b.get("win_rate", 0.5)
    od  = b.get("_raw_avg_odds", 5.0)
    br  = b.get("_raw_bankroll_ratio", 0.5)
    bf  = b.get("bet_frequency", 0.0)
    has_bet = bool(b.get("_raw_bet_count", 0))

    adj = base

    # Positive synergies
    if has_bet and ic > 0.7 and ir > 0.7:          # disciplined bettor + stable income
        adj += rng.uniform(10, 18)
    if emp >= 1.0 and lc > 0.25:                   # employed + savings buffer
        adj += rng.uniform(8, 14)
    if has_bet and wr > 0.55 and 1.5 <= od <= 2.5: # consistent wins at sensible odds
        adj += rng.uniform(6, 12)

    # Negative synergies
    if emp >= 0.8 and fs > 0.7:                    # employed but financially stressed
        adj -= rng.uniform(15, 25)
    if has_bet and ic < 0.3 and lc < 0.05:         # loss-chaser with no liquidity buffer
        adj -= rng.uniform(18, 28)
    if has_bet and br > 0.5 and fs > 0.6:          # high-stake bets while stressed
        adj -= rng.uniform(10, 20)
    if has_bet and bf > 0.4 and ir < 0.3:          # high-frequency bets + irregular income
        adj -= rng.uniform(8, 15)

    adj += float(rng.normal(0, 6))
    return float(max(300.0, min(850.0, adj)))


def _random_features(rng: np.random.Generator) -> dict[str, Any]:
    has_betting = rng.random() > 0.40
    has_momo = rng.random() > 0.35

    betting: dict[str, Any] = {}
    if has_betting:
        bucket = int(rng.choice([0, 1, 2], p=[0.40, 0.35, 0.25]))
        avg_odds = float(rng.uniform(*[(1.4, 2.5), (2.5, 5.0), (5.0, 20.0)][bucket]))
        betting = {
            "_raw_bet_count": int(rng.integers(10, 300)),
            "impulse_control": float(rng.beta(3, 2)),
            "withdrawal_discipline": float(rng.beta(2, 2)),
            "_raw_avg_odds": avg_odds,
            "_raw_bankroll_ratio": float(rng.beta(2, 6)),
            "win_rate": float(rng.beta(5, 6)),
            "bet_frequency": float(rng.uniform(0.05, 0.5)),
        }

    momo: dict[str, Any] = {}
    if has_momo:
        momo = {
            "_raw_monthly_credits": int(rng.integers(3, 100)) * 100_000,
            "tx_frequency": float(rng.uniform(0.05, 0.8)),
            "liquidity_cushion": float(rng.uniform(-0.05, 0.45)),
            "bill_consistency": float(rng.beta(2, 2)),
            "income_regularity": float(rng.beta(3, 3)),
            "spending_velocity": float(rng.uniform(0.0, 0.9)),
            "_raw_unique_recipients": int(rng.integers(0, 25)),
        }

    emp = float(rng.choice([0.0, 0.75, 0.8, 1.0], p=[0.20, 0.25, 0.25, 0.30]))
    sd: dict[str, Any] = {
        "employment_status": emp,
        "_raw_age": int(rng.integers(19, 55)),
        "declared_income": float(rng.lognormal(16.5, 1.2)),
        "_raw_tenure": float(rng.choice([0, 0, 1, 2, 3, 5, 8], p=[0.20, 0.10, 0.15, 0.15, 0.15, 0.15, 0.10])),
    }

    sources = int(has_betting) + int(has_momo)
    tier = "tier_1" if sources >= 2 else ("tier_2" if sources == 1 else "tier_3")
    completeness = 0.33 * int(has_betting) + 0.33 * int(has_momo) + 0.33

    if has_momo:
        declared = sd.get("declared_income", 0.0)
        momo_monthly = float(momo.get("_raw_monthly_credits", 1))
        discrepancy = min(abs(declared - momo_monthly) / max(momo_monthly, 1.0), 2.0)
    else:
        discrepancy = float(rng.uniform(0, 0.5))

    xval: dict[str, Any] = {
        "data_completeness": completeness,
        "_raw_income_discrepancy_ratio": discrepancy,
    }

    harm, stress = 0.0, 0.3
    if has_betting:
        harm = max(0.0, (1.0 - betting["impulse_control"]) * 0.5 + max(0.0, betting["_raw_bankroll_ratio"] - 0.3) * 0.5)
    if has_momo:
        stress = max(0.0, 0.5 - momo["liquidity_cushion"])

    risk: dict[str, Any] = {
        "betting_harm_risk": float(min(1.0, harm + float(rng.uniform(-0.05, 0.05)))),
        "financial_stress": float(min(1.0, stress + float(rng.uniform(-0.05, 0.05)))),
        "credit_readiness": 0.5,
    }

    return {
        "betting": betting,
        "momo": momo,
        "self_declared": sd,
        "cross_validation": xval,
        "risk": risk,
        "completeness_tier": tier,
    }

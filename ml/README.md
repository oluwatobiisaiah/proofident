# Proofident AI Service

A credit scoring and job matching microservice for Nigeria's informal economy. It produces a 300–850 credit score from behavioural data — betting patterns, mobile money transactions, and self-declared employment info — without requiring bank statements, BVN verification, or any prior credit history.

Built with Python 3.11 + FastAPI. Runs on port `8001`.

---

## How the scoring works

The service runs three independent signals and blends them into one score.

### 1. Feature extraction

Raw input is normalised into 28 features across six groups:

| Group | Features (6) | Notes |
|---|---|---|
| Betting | impulse_control, withdrawal_discipline, avg_odds_norm, bankroll_ratio, win_rate, bet_frequency | Zero-filled when no betting data |
| Mobile money | tx_frequency, liquidity_cushion, bill_consistency, income_regularity, spending_velocity, unique_recipients_norm | Zero-filled when no momo data |
| Self-declared | employment_status, age_norm, income_norm, tenure_norm | Employment mapped: unemployed=0, self_employed=0.75, informal=0.80, employed=1.0 |
| Cross-validation | data_completeness, discrepancy_norm | Catches declared-vs-observed income divergence |
| Risk | betting_harm_risk, financial_stress | Composite signals; used for hard caps |
| Interaction terms | ic_x_ir, emp_x_lc, wr_x_odds, dc_x_xv, bf_x_br | Cross-source products the additive rule scorer cannot express |

All monetary values are in kobo (₦1 = 100 kobo) throughout the system.

### 2. Rule-based scorer (Signal 1)

Starts at base score **600**. Applies calibrated positive and negative deltas per feature group, then enforces hard caps:

- `betting_harm_risk ≥ 0.7` → score capped at 550
- `financial_stress ≥ 0.8` → score capped at 600
- `tier_3` (sparse data) → score capped at 620

Confidence is assigned by completeness tier: tier_1 = 0.90, tier_2 = 0.72, tier_3 = 0.38.

### 3. ML ensemble (Signal 2 + 3)

Two models trained on 4,000 synthetic profiles:

**HistGradientBoostingRegressor** (`credit_model.joblib`)  
Training labels are not raw rule outputs. They are rule scores adjusted by `_synergy_score()`, which applies cross-feature bonuses and penalties that additive rules structurally cannot express:

- Disciplined bettor (impulse_control > 0.7) + stable income (income_regularity > 0.7): +10–18 points
- Employed + savings buffer (liquidity_cushion > 0.25): +8–14 points
- Employed but financially stressed (financial_stress > 0.7): −15–25 points
- Loss-chaser (impulse_control < 0.3) with no liquidity: −18–28 points

A Gaussian noise term (σ=6) is added to prevent the GBM from simply memorising the rule function. The GBM learns to generalise across these synergies using the 5 interaction features; the rule scorer cannot — it evaluates each feature independently against a fixed threshold.

**IsolationForest** (`anomaly_model.joblib`)  
Unsupervised anomaly detection trained on the same 28-feature space. No labels. It learns what a "normal" profile looks like across the full distribution and flags statistical outliers — possible misrepresentation, hidden stress patterns, or data inconsistency.

```
anomaly_score = clamp(0.5 − decision_function_output, 0, 1)
```

Score of 0 = completely normal profile. Score of 1 = highly anomalous.

### 4. Final blend

```
blended     = round(0.60 × rules_score + 0.40 × gbm_score)
penalty     = max(0, round((anomaly_score − 0.6) × 20))
final_score = clamp(blended − penalty, 300, 850)
```

The anomaly penalty only activates when `anomaly_score > 0.6` — mild quirks in a profile don't penalise it. The 0.40 GBM weight means the rule system anchors the score; the GBM adjusts it based on interaction patterns.

The API response includes `rules_score`, `model_score`, `anomaly_score`, and `anomaly_penalty` as separate fields so you can see exactly how the three signals contributed.

---

## Job matching

`POST /v1/match/jobs` takes a user profile (with credit score) and a list of job listings, returns the top-5 matches.

**Hard filter** (eliminates incompatible jobs):
- Age constraints (min/max)
- Credit score minimum
- Required items the user doesn't have (except bike/car — these can be loaned)

**Soft scoring** (weighted components):
- Skills: 40% — user skill score vs required threshold; 0.0 if skill has no signal
- Location: 25% — exact match=1.0, adjacent state=0.7, elsewhere=0.3
- Income opportunity: 20% — how much the job improves on current income
- Credit qualification: 15% — whether the user qualifies for the startup loan

**Loan availability** on a job requires: credit score ≥ job minimum, loan limit ≥ startup cost, and confidence ≥ 0.60. Loan limits are derived from credit score + tier combination (max ₦500,000 at tier_1 prime score, down to ₦25,000 at tier_3 or low confidence).

---

## API

### `GET /health`

Returns 200 when models are loaded and ready. Returns 503 with `"status": "degraded"` if startup model loading failed.

```json
{ "status": "ok", "models_loaded": true, "service": "proofident-ai-service", "version": "1.0.0", "timestamp": "..." }
```

### `POST /v1/score/credit`

At least one of `betting_data`, `mobile_money_data`, or `self_declared` must be present.

```json
{
  "user_id": "user_123",
  "betting_data": {
    "bets": [{ "date": "...", "amount": 500000, "odds": 1.8, "outcome": "win", "payout": 900000 }],
    "total_deposits": 5000000,
    "total_withdrawals": 1000000
  },
  "mobile_money_data": {
    "transactions": [{ "date": "...", "type": "credit", "amount": 15000000, "balance_after": 20000000 }]
  },
  "self_declared": {
    "occupation": "employed",
    "monthly_income": 15000000,
    "state": "Lagos",
    "age": 29,
    "employment_tenure_years": 2.5,
    "has_smartphone": true
  }
}
```

`amount`, `payout`, and all monetary values are in **kobo**.

Response includes: `credit_score`, `score_range`, `confidence`, `completeness_tier`, `rules_score`, `model_score`, `anomaly_score`, `anomaly_penalty`, `positive_factors`, `negative_factors`, `improvement_suggestions`, `recommended_loan_limit`, and inferred occupation signals.

### `POST /v1/jobs/match`

```json
{
  "user_profile": { "user_id": "...", "credit_score": 680, "confidence": 0.72, "completeness_tier": "tier_1", "location_state": "Lagos", "monthly_income": 15000000, "age": 29, "has_smartphone": true, "has_bike": false, "has_car": false, "skills": {} },
  "available_jobs": [{ "job_id": "...", "title": "Delivery Rider", "category": "logistics", "location_state": "Lagos", "min_income": 8000000, "max_income": 15000000, "startup_cost": 5000000, "min_credit_score": 500, "required_items": ["bike"], "employment_type": "gig" }]
}
```

### Error envelope

All errors use the same shape:

```json
{ "error": { "code": "BAD_REQUEST", "message": "At least one data source must be provided." } }
```

---

## Running locally

**Requirements:** Python 3.11, pip

```bash
cd ml
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Copy the example env file:

```bash
cp .env.example .env
```

Start the server:

```bash
python main.py
```

The server starts on `http://localhost:8001`. Hot reload is on by default in `ENV=development`.

On first startup, if no `.joblib` files exist at `MODEL_DIR`, the service trains both models in-process. This takes ~60 seconds. Subsequent starts load from disk instantly. To pre-train explicitly:

```bash
python scripts/train_model.py --samples 4000
```

Run the smoke test to verify everything works end-to-end:

```bash
python scripts/smoke_test.py
```

Interactive docs: `http://localhost:8001/docs`

### Docker

```bash
docker build -t proofident-ai .
docker run -p 8001:8001 --env-file .env proofident-ai
```

The `.joblib` model files in `src/data/models/` are copied into the image at build time (they're already present in the repo after the first `train_model.py` run). This avoids the 60-second training delay on container startup.

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8001` | Listen port |
| `HOST` | `0.0.0.0` | Bind address |
| `ENV` | `development` | `development` enables hot reload |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warning`, `error` |
| `MODEL_DIR` | `src/data/models` | Directory for `.joblib` files |
| `API_KEY` | *(empty)* | Bearer token for auth. Empty = auth disabled |
| `ALLOWED_ORIGINS` | `*` | Comma-separated CORS origins. `*` = allow all |

Auth is opt-in. Leave `API_KEY` empty for local development. In production, set it to a secret and pass `Authorization: Bearer <key>` on all `/v1/` requests.

---

## Project structure

```
ml/
├── main.py                         # Entry point — starts uvicorn
├── requirements.txt
├── Dockerfile
├── scripts/
│   ├── train_model.py              # Pre-trains GBM + IsolationForest, saves .joblib
│   ├── smoke_test.py               # End-to-end test, exits 0/1
│   └── generate_demo_data.py       # Generates sample personas
└── src/
    ├── config/
    │   └── settings.py             # Pydantic settings from .env
    ├── api/
    │   ├── main.py                 # FastAPI app, lifespan, middleware, exception handlers
    │   ├── schemas.py              # All request/response Pydantic models
    │   ├── middleware.py           # JSON structured logging, request ID injection
    │   ├── state.py                # Shared models_ready flag
    │   └── routes/
    │       ├── health.py
    │       ├── score.py
    │       └── jobs.py
    ├── models/
    │   ├── feature_extractor.py    # Raw input → 28-feature dict
    │   ├── credit_scorer.py        # Rule-based scorer
    │   ├── ml_scorer.py            # GBM + IsolationForest ensemble
    │   ├── job_matcher.py          # Hard filter + soft scoring
    │   └── occupation_inferencer.py
    └── data/
        ├── models/                 # credit_model.joblib, anomaly_model.joblib
        └── simulated/              # Sample personas for demos
```

---

## Known limitations and future work

**GBM training is partially circular.** The training labels are derived from the rule scorer output (with synergy adjustments). The GBM therefore learns to generalise across patterns the rules already encode, rather than learning from real loan default data. The interaction features and synergy terms give it some genuine signal beyond the rules, but it cannot produce creditworthiness signal that the rules don't contain in some form. To fix this properly: collect real repayment outcomes from a lending partner and retrain the GBM on those as ground truth. The feature vector is already well-suited for this — only the labels need to change.

**Confidence is a tier lookup, not computed uncertainty.** The three confidence values (0.90/0.72/0.38) are hardcoded per completeness tier. A more honest implementation would compute a bootstrapped prediction interval from the GBM's training residuals and express actual model uncertainty per request. With real repayment data, a calibrated probability of default would replace the current confidence field entirely.

**`has_self_declared` is always 1.0 in synthetic training.** Every synthetic profile has a self-declared block, so the GBM has never seen a profile without one. In practice, some users will submit betting or momo data only. These requests pass through the ML pipeline but are technically out-of-distribution for the GBM. The IsolationForest will likely flag them with elevated anomaly scores, which provides partial mitigation, but the GBM weights on self-declared features are unreliable in that scenario.

**Single-process only.** Models are loaded as module-level state in `score.py`. This is safe for single-process uvicorn (the current setup) but will cause each worker to load its own copy under multi-worker configurations. If you scale this with `--workers N`, move model loading into the lifespan and share it via the FastAPI app state dict, or serve models from a dedicated inference process.

**No SHAP explanations.** The `positive_factors` and `negative_factors` in the response are generated by the rule scorer, not the GBM. The GBM's contribution is opaque at the per-request level. Adding SHAP values on the GBM prediction would give genuinely grounded explanations for the ensemble's adjustments.

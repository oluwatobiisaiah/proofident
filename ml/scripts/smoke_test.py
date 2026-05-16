"""
Pre-demo smoke test. Asserts health + credit score + job match all work correctly.

Usage:
    python scripts/smoke_test.py [--base-url http://localhost:8001]
"""
from __future__ import annotations

import argparse
import sys
import time

import httpx

_CREDIT_PAYLOAD = {
    "user_id": "smoke_test_001",
    "betting_data": {
        "bets": [
            {"date": "2024-09-01T10:00:00Z", "amount": 500000, "odds": 1.8,
             "outcome": "win", "payout": 900000},
            {"date": "2024-09-05T14:00:00Z", "amount": 200000, "odds": 2.2,
             "outcome": "loss", "payout": 0},
            {"date": "2024-09-12T09:00:00Z", "amount": 300000, "odds": 1.5,
             "outcome": "win", "payout": 450000},
        ],
        "total_deposits": 5_000_000,
        "total_withdrawals": 1_000_000,
    },
    "mobile_money_data": {
        "transactions": [
            {"date": "2024-09-01T08:00:00Z", "type": "credit", "amount": 15_000_000,
             "balance_after": 20_000_000, "merchant": "employer"},
            {"date": "2024-09-10T12:00:00Z", "type": "debit", "amount": 3_000_000,
             "balance_after": 17_000_000, "merchant": "rent"},
            {"date": "2024-09-25T09:00:00Z", "type": "credit", "amount": 2_000_000,
             "balance_after": 12_000_000},
        ]
    },
    "self_declared": {
        "occupation": "employed",
        "monthly_income": 15_000_000,
        "state": "Lagos",
        "age": 29,
        "employment_tenure_years": 2.5,
        "has_smartphone": True,
        "has_bike": False,
        "has_car": False,
    },
}

_JOB_PAYLOAD = {
    "user_profile": {
        "user_id": "smoke_test_001",
        "credit_score": 680,
        "confidence": 0.72,
        "completeness_tier": "tier_1",
        "location_state": "Lagos",
        "occupation": "employed",
        "monthly_income": 15_000_000,
        "age": 29,
        "has_smartphone": True,
        "has_bike": False,
        "has_car": False,
        "skills": {},
    },
    "available_jobs": [
        {
            "job_id": "gig_001",
            "title": "Delivery Rider",
            "category": "logistics",
            "location_state": "Lagos",
            "min_income": 8_000_000,
            "max_income": 15_000_000,
            "startup_cost": 5_000_000,
            "min_credit_score": 500,
            "required_skills": {},
            "required_items": ["bike"],
            "employment_type": "gig",
        }
    ],
}

PASS = "\033[92mPASS\033[0m"
FAIL = "\033[91mFAIL\033[0m"


def check(label: str, condition: bool, detail: str = "") -> bool:
    status = PASS if condition else FAIL
    print(f"  [{status}] {label}" + (f" — {detail}" if detail else ""))
    return condition


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://localhost:8001")
    args = parser.parse_args()
    base = args.base_url.rstrip("/")

    client = httpx.Client(timeout=30)
    failures = 0

    print(f"\nSmoke testing {base}\n")

    # ------------------------------------------------------------------ health
    print("1. Health check")
    r = client.get(f"{base}/health")
    failures += not check("HTTP 200", r.status_code == 200, str(r.status_code))
    body = r.json()
    failures += not check("status == ok", body.get("status") == "ok", str(body.get("status")))
    failures += not check("models_loaded == true", body.get("models_loaded") is True)
    print()

    # ------------------------------------------------------------ credit score
    print("2. Credit score")
    t0 = time.perf_counter()
    r = client.post(f"{base}/v1/score/credit", json=_CREDIT_PAYLOAD)
    elapsed = round((time.perf_counter() - t0) * 1000)
    failures += not check("HTTP 200", r.status_code == 200, str(r.status_code))
    if r.status_code == 200:
        body = r.json()
        score = body.get("credit_score", 0)
        failures += not check("credit_score in [300, 850]", 300 <= score <= 850, str(score))
        failures += not check("processing_time_ms < 500", body.get("processing_time_ms", 9999) < 500,
                              f"{body.get('processing_time_ms')}ms")
        failures += not check("rules_score present", "rules_score" in body, str(body.get("rules_score")))
        failures += not check("data_sources_used non-empty", bool(body.get("data_sources_used")))
        # Three-signal check: if model_score present, anomaly fields should be too
        if body.get("model_score") is not None:
            failures += not check("anomaly_score present with model_score", "anomaly_score" in body)
            failures += not check("anomaly_penalty present with model_score", "anomaly_penalty" in body)
    else:
        print(f"    Response: {r.text[:200]}")
        failures += 4
    print(f"  Round-trip: {elapsed}ms")
    print()

    # --------------------------------------------------------------- job match
    print("3. Job matching")
    r = client.post(f"{base}/v1/jobs/match", json=_JOB_PAYLOAD)
    failures += not check("HTTP 200", r.status_code == 200, str(r.status_code))
    if r.status_code == 200:
        body = r.json()
        failures += not check("total_jobs_evaluated == 1", body.get("total_jobs_evaluated") == 1,
                              str(body.get("total_jobs_evaluated")))
        failures += not check("matches is list", isinstance(body.get("matches"), list))
    else:
        print(f"    Response: {r.text[:200]}")
        failures += 2
    print()

    # ----------------------------------------------------------- 400 on bad input
    print("4. Error handling (empty request)")
    r = client.post(f"{base}/v1/score/credit",
                    json={"user_id": "x", "betting_data": None, "mobile_money_data": None, "self_declared": None})
    failures += not check("HTTP 400 on no data sources", r.status_code == 400, str(r.status_code))
    if r.status_code == 400:
        body = r.json()
        failures += not check("error envelope present", "error" in body)
    print()

    # ----------------------------------------------------------------- summary
    if failures == 0:
        print(f"\033[92mAll checks passed.\033[0m\n")
        sys.exit(0)
    else:
        print(f"\033[91m{failures} check(s) FAILED.\033[0m\n")
        sys.exit(1)


if __name__ == "__main__":
    main()

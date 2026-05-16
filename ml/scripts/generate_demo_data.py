"""
Generate canonical demo data for Tunde, Chioma, and Amina.

Usage:
    python scripts/generate_demo_data.py

Outputs JSON files to src/data/simulated/
"""
from __future__ import annotations

import json
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

OUTPUT_DIR = Path(__file__).parent.parent / "src" / "data" / "simulated"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

random.seed(42)


def random_dt(base: datetime, day_offset_range: tuple[int, int]) -> str:
    lo, hi = day_offset_range
    offset = random.randint(lo * 24 * 60, hi * 24 * 60)  # minutes
    dt = base - timedelta(minutes=offset)
    return dt.isoformat()


NOW = datetime(2026, 5, 13, 12, 0, 0, tzinfo=timezone.utc)


# ---------------------------------------------------------------------------
# Tunde — Disciplined Bettor + Gig Worker
# ---------------------------------------------------------------------------

def gen_tunde_betting(num_bets: int = 150) -> list[dict]:
    bets = []
    leagues = ["EPL", "La Liga", "Serie A", "Bundesliga", "Ligue 1"]
    for _ in range(num_bets):
        amount = random.randint(2_000_00, 8_000_00)  # kobo
        odds = round(random.uniform(1.5, 2.5), 2)
        is_win = random.random() < 0.52
        bet_date = random_dt(NOW, (1, 180))
        match_start = (datetime.fromisoformat(bet_date) + timedelta(hours=random.randint(8, 26))).isoformat()
        bets.append({
            "date": bet_date,
            "amount": amount,
            "odds": odds,
            "outcome": "win" if is_win else "loss",
            "payout": round(amount * odds) if is_win else 0,
            "bet_type": "single",
            "league": random.choice(leagues),
            "match_start_time": match_start,
        })
    return sorted(bets, key=lambda b: b["date"])


def gen_tunde_momo(num_months: int = 6) -> list[dict]:
    transactions = []
    balance = 45_000_00  # kobo starting balance

    employers = ["Kwik Delivery Ltd", "GIG Logistics", "Bolt Food"]
    merchant_cats = ["food", "transport", "utilities", "airtime", "transfer"]

    for week in range(num_months * 4):
        # Weekly gig income
        income = random.randint(25_000_00, 35_000_00)
        balance += income
        week_ago = NOW - timedelta(weeks=(num_months * 4 - week))
        transactions.append({
            "date": week_ago.isoformat(),
            "type": "credit",
            "amount": income,
            "balance_after": balance,
            "merchant": random.choice(employers),
            "merchant_category": "salary",
            "recipient_hash": None,
        })

        # Weekly expenses (4-7 debits)
        for _ in range(random.randint(4, 7)):
            amount = random.randint(3_000_00, 15_000_00)
            balance = max(balance - amount, 5_000_00)
            recipient = f"recipient_{random.randint(1, 15)}"
            transactions.append({
                "date": (week_ago + timedelta(days=random.randint(1, 6))).isoformat(),
                "type": "debit",
                "amount": amount,
                "balance_after": balance,
                "merchant": None,
                "merchant_category": random.choice(merchant_cats),
                "recipient_hash": recipient,
            })

    return sorted(transactions, key=lambda t: t["date"])


TUNDE = {
    "user_id": "demo_tunde",
    "betting_data": {
        "bets": gen_tunde_betting(),
        "total_deposits": 480_000_00,
        "total_withdrawals": 310_000_00,
    },
    "mobile_money_data": {
        "transactions": gen_tunde_momo(),
    },
    "self_declared": {
        "occupation": "unemployed",
        "monthly_income": 80_000_00,
        "state": "Lagos",
        "age": 26,
        "employment_tenure_years": 0,
        "has_smartphone": True,
        "has_bike": False,
        "has_car": False,
    },
}


# ---------------------------------------------------------------------------
# Chioma — Market Trader, no betting
# ---------------------------------------------------------------------------

def gen_chioma_momo(num_months: int = 7) -> list[dict]:
    transactions = []
    balance = 120_000_00

    suppliers = [f"supplier_{i}" for i in range(1, 8)]
    customers = [f"customer_{i}" for i in range(1, 30)]
    merchant_cats = ["retail", "inventory", "utilities", "transport", "airtime"]

    for month in range(num_months):
        days_in_month = 26  # Mon-Sat
        for day in range(days_in_month):
            # Daily sales income
            daily_income = random.randint(8_000_00, 18_000_00)
            balance += daily_income
            base_date = NOW - timedelta(days=(num_months - month) * 30 - day)
            transactions.append({
                "date": base_date.isoformat(),
                "type": "credit",
                "amount": daily_income,
                "balance_after": balance,
                "merchant": None,
                "merchant_category": "retail",
                "recipient_hash": random.choice(customers),
            })

            # Daily supplier payments (3-8)
            for _ in range(random.randint(3, 8)):
                amount = random.randint(1_500_00, 6_000_00)
                balance = max(balance - amount, 20_000_00)
                transactions.append({
                    "date": (base_date + timedelta(hours=random.randint(1, 10))).isoformat(),
                    "type": "debit",
                    "amount": amount,
                    "balance_after": balance,
                    "merchant": None,
                    "merchant_category": random.choice(merchant_cats),
                    "recipient_hash": random.choice(suppliers),
                })

    return sorted(transactions, key=lambda t: t["date"])


CHIOMA = {
    "user_id": "demo_chioma",
    "betting_data": None,
    "mobile_money_data": {
        "transactions": gen_chioma_momo(),
    },
    "self_declared": {
        "occupation": "self_employed",
        "monthly_income": 100_000_00,
        "state": "Kano",
        "age": 32,
        "employment_tenure_years": 4.5,
        "has_smartphone": True,
        "has_bike": False,
        "has_car": False,
    },
}


# ---------------------------------------------------------------------------
# Amina — Thin-file applicant
# ---------------------------------------------------------------------------

def gen_amina_momo() -> list[dict]:
    transactions = []
    balance = 15_000_00
    for i in range(8):
        amount = random.randint(5_000_00, 12_000_00)
        balance += amount
        date = (NOW - timedelta(days=random.randint(10, 60))).isoformat()
        transactions.append({
            "date": date,
            "type": "credit",
            "amount": amount,
            "balance_after": balance,
            "merchant": None,
            "merchant_category": "transfer",
            "recipient_hash": None,
        })
        spent = random.randint(3_000_00, 8_000_00)
        balance = max(balance - spent, 1_000_00)
        transactions.append({
            "date": (datetime.fromisoformat(date) + timedelta(days=1)).isoformat(),
            "type": "debit",
            "amount": spent,
            "balance_after": balance,
            "merchant": None,
            "merchant_category": "food",
            "recipient_hash": "recipient_1",
        })
    return sorted(transactions, key=lambda t: t["date"])


AMINA = {
    "user_id": "demo_amina",
    "betting_data": None,
    "mobile_money_data": {
        "transactions": gen_amina_momo(),
    },
    "self_declared": {
        "occupation": "unemployed",
        "monthly_income": 30_000_00,
        "state": "Abuja",
        "age": 21,
        "employment_tenure_years": 0,
        "has_smartphone": True,
        "has_bike": False,
        "has_car": False,
    },
}


# ---------------------------------------------------------------------------
# Demo jobs catalog
# ---------------------------------------------------------------------------

DEMO_JOBS = [
    {
        "job_id": "job_kwik_rider_lagos",
        "title": "Delivery Rider",
        "employer": "Kwik Delivery",
        "category": "logistics",
        "location_state": "Lagos",
        "min_income": 120_000_00,
        "max_income": 180_000_00,
        "startup_cost": 85_000_00,
        "startup_cost_breakdown": {"bike_deposit": 85_000_00},
        "min_credit_score": 550,
        "required_skills": {"discipline": 0.7, "reliability": 0.65},
        "required_items": ["smartphone"],
        "employment_type": "gig",
        "min_age": 21,
        "max_age": 40,
    },
    {
        "job_id": "job_gig_logistics_lagos",
        "title": "GIG Logistics Rider",
        "employer": "GIG Logistics",
        "category": "logistics",
        "location_state": "Lagos",
        "min_income": 100_000_00,
        "max_income": 160_000_00,
        "startup_cost": 75_000_00,
        "startup_cost_breakdown": {"bike_deposit": 75_000_00},
        "min_credit_score": 500,
        "required_skills": {"discipline": 0.6, "reliability": 0.6},
        "required_items": ["smartphone"],
        "employment_type": "gig",
        "min_age": 21,
        "max_age": 45,
    },
    {
        "job_id": "job_jumia_sales_kano",
        "title": "Field Sales Representative",
        "employer": "Jumia Nigeria",
        "category": "sales",
        "location_state": "Kano",
        "min_income": 90_000_00,
        "max_income": 150_000_00,
        "startup_cost": 30_000_00,
        "startup_cost_breakdown": {"sales_kit": 30_000_00},
        "min_credit_score": 480,
        "required_skills": {"customer_service": 0.6, "discipline": 0.5},
        "required_items": ["smartphone"],
        "employment_type": "gig",
        "min_age": 20,
        "max_age": 45,
    },
    {
        "job_id": "job_palmpay_agent_nationwide",
        "title": "PalmPay Agent",
        "employer": "PalmPay",
        "category": "sales",
        "location_state": "Nationwide",
        "min_income": 80_000_00,
        "max_income": 130_000_00,
        "startup_cost": 50_000_00,
        "startup_cost_breakdown": {"pos_terminal": 50_000_00},
        "min_credit_score": 500,
        "required_skills": {"customer_service": 0.55, "reliability": 0.6},
        "required_items": ["smartphone"],
        "employment_type": "gig",
        "min_age": 20,
        "max_age": 50,
    },
    {
        "job_id": "job_remote_support_nationwide",
        "title": "Remote Customer Support",
        "employer": "TechSupport NG",
        "category": "tech",
        "location_state": "Nationwide",
        "min_income": 100_000_00,
        "max_income": 180_000_00,
        "startup_cost": 0,
        "startup_cost_breakdown": {},
        "min_credit_score": 450,
        "required_skills": {"customer_service": 0.6, "analytical": 0.5},
        "required_items": ["smartphone"],
        "employment_type": "full_time",
        "min_age": 18,
        "max_age": 55,
    },
]


# ---------------------------------------------------------------------------
# Write outputs
# ---------------------------------------------------------------------------

def main():
    personas = {"tunde": TUNDE, "chioma": CHIOMA, "amina": AMINA}
    for name, data in personas.items():
        path = OUTPUT_DIR / f"{name}_input.json"
        path.write_text(json.dumps(data, indent=2, default=str))
        print(f"Wrote {path}")

    jobs_path = OUTPUT_DIR / "demo_jobs.json"
    jobs_path.write_text(json.dumps(DEMO_JOBS, indent=2))
    print(f"Wrote {jobs_path}")


if __name__ == "__main__":
    main()

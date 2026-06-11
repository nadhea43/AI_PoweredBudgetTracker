# This component isolates the specific rules for Malaysian income calculations, statutory tax rules, gap detections, and DOSM benchmark lookups.

import json
from functools import lru_cache
from typing import Any
from constants import SUMMARY_PATH, EXPENDITURE_AGE_PATH, CATEGORY_TO_BENCHMARK
from utils import safe_float, round_currency, normalize_state_name
from constants import FORMAL_WAGES_PATH

@lru_cache(maxsize=1)
def load_summary() -> dict[str, Any]:
    if not SUMMARY_PATH.exists():
        raise FileNotFoundError(f"Missing processed dataset: {SUMMARY_PATH}. Run scripts/etl_pipeline.py first.")
    with SUMMARY_PATH.open(encoding="utf-8") as handle:
        return json.load(handle)

@lru_cache(maxsize=1)
def load_expenditure_benchmarks() -> dict[str, Any]:
    if not EXPENDITURE_AGE_PATH.exists():
        return {}
    with EXPENDITURE_AGE_PATH.open(encoding="utf-8") as handle:
        return json.load(handle)
    
@lru_cache(maxsize=1)
def load_formal_wages() -> dict:
    with FORMAL_WAGES_PATH.open(encoding="utf-8") as f:
        return json.load(f)

def get_wage_benchmark_by_age(age_group: str) -> int:
    """e.g. age_group = '25-29' → 2800"""
    data = load_formal_wages()
    entry = data["by_age_group"].get(age_group, {})
    return entry.get("median_wage", 0)

def get_wage_benchmark_by_state(state: str) -> int:
    """Fallback — covers all ages, use for context only"""
    data = load_formal_wages()
    normalized = normalize_state_name(state).lower()
    for name, entry in data["by_state"].items():
        if entry["normalized"] == normalized:
            return entry["median_wage"]
    return 0

def get_age_benchmark(age_group: str = "25_34") -> dict[str, float]:
    return load_expenditure_benchmarks().get("benchmarks", {}).get(age_group, {})

def get_state_benchmark(state: str) -> dict[str, Any]:
    summary = load_summary()
    normalized_state = normalize_state_name(state)
    for row in summary.get("state_summary", []):
        if normalize_state_name(row.get("state")) == normalized_state:
            return row
    first_date = summary.get("date_summary", [{}])
    fallback_row = first_date[0] if first_date else {}
    return {
        "state": normalized_state,
        "avg_income_mean":       fallback_row.get("avg_income_mean", 0),
        "avg_income_median":     fallback_row.get("avg_income_mean", 0),
        "avg_expenditure_mean":  fallback_row.get("avg_expenditure_mean", 0),
        "avg_poverty":           fallback_row.get("avg_poverty", 0),
    }

def estimate_deductions(gross_salary: float) -> dict[str, float]:
    epf   = round_currency(gross_salary * 0.11)
    socso = round_currency(min(gross_salary * 0.0035, 19.75))
    eis   = round_currency(gross_salary * 0.002)
    pcb   = round_currency(max((gross_salary - 5000) * 0.03, 0.0))
    total = round_currency(epf + socso + eis + pcb)
    return {
        "epf": epf, "socso": socso, "eis": eis, "pcb": pcb,
        "total": total,
        "take_home": round_currency(gross_salary - total),
    }

def detect_anomalies(all_items: list[dict]) -> list[dict]:
    benchmark_25_34 = get_age_benchmark("25_34")
    if not benchmark_25_34:
        return []
    anomalies = []
    for item in all_items:
        label     = (item.get("label") or "").lower().strip()
        amount    = safe_float(item.get("amount"))
        bench_key = CATEGORY_TO_BENCHMARK.get(label)
        if not bench_key:
            continue
        benchmark_val = benchmark_25_34.get(bench_key, 0)
        if benchmark_val <= 0:
            continue
        ratio = amount / benchmark_val
        if ratio >= 1.20:
            pct_over = round((ratio - 1) * 100)
            anomalies.append({
                "category":    item.get("label"),
                "your_amount": amount,
                "benchmark":   benchmark_val,
                "pct_over":    pct_over,
                "flag":        f"{pct_over}% above 25-34 avg",
                "severity":    "high" if ratio >= 1.5 else "medium",
            })
    return anomalies

def severity_from_ratio(ratio: float) -> str:
    if ratio >= 0.35: return "high"
    if ratio >= 0.2:  return "medium"
    return "low"

def build_risk_flags(take_home: float, commitments: float, spending: float, remaining: float) -> list[str]:
    if take_home <= 0:
        return ["No take-home pay detected"]
    flags: list[str] = []
    if commitments / take_home > 0.5:
        flags.append("Fixed commitments exceed 50% of take-home pay")
    if spending / take_home > 0.35:
        flags.append("Variable spending is above a comfortable range")
    if remaining / take_home < 0.15:
        flags.append("Savings buffer is below the 15% target")
    return flags

def build_finance_gaps(snapshot: dict[str, Any], benchmark: dict[str, Any], plan: dict[str, Any]) -> list[dict[str, Any]]:
    take_home          = snapshot["take_home"]
    median_income      = safe_float(snapshot.get("benchmark", {}).get("median_income")) or safe_float(benchmark.get("avg_income_median"), 0.0)
    benchmark_spending = safe_float(benchmark.get("avg_expenditure_mean"), 0.0)
    savings_goal       = safe_float(snapshot.get("savings_goal"), 0.0)
    target_months      = int(safe_float(snapshot.get("goal_months"), 12)) or 12

    gaps: list[dict[str, Any]] = []

    income_gap_amount = max(median_income - snapshot["gross_salary"], 0.0)
    if income_gap_amount > 0:
        income_gap_ratio = income_gap_amount / median_income if median_income else 0.0
        gaps.append({
            "type": "income_gap", "severity": severity_from_ratio(income_gap_ratio),
            "amount": round_currency(income_gap_amount),
            "message": f"Income is RM {income_gap_amount:,.2f} below the {snapshot['state']} median.",
            "driver": "gross_salary",
        })

    commitment_ratio = snapshot["total_commitments"] / take_home if take_home else 0.0
    if take_home > 0 and commitment_ratio > 0.5:
        gaps.append({
            "type": "cashflow_gap", "severity": severity_from_ratio(commitment_ratio - 0.5),
            "amount": round_currency(snapshot["total_commitments"] - take_home * 0.5),
            "message": "Fixed commitments are consuming too much of take-home pay.",
            "driver": "total_commitments",
        })

    spending_gap_amount = max(snapshot["total_spending"] - benchmark_spending, 0.0)
    if spending_gap_amount > 0:
        spending_gap_ratio = spending_gap_amount / benchmark_spending if benchmark_spending else 0.0
        gaps.append({
            "type": "spending_gap", "severity": severity_from_ratio(spending_gap_ratio),
            "amount": round_currency(spending_gap_amount),
            "message": f"Variable spending is RM {spending_gap_amount:,.2f} above the benchmark average.",
            "driver": "total_spending",
        })

    if savings_goal:
        savings_gap_amount = max((savings_goal / target_months) - snapshot["remaining"], 0.0)
        if savings_gap_amount > 0:
            target_monthly    = savings_goal / target_months if target_months else 0.0
            savings_gap_ratio = savings_gap_amount / target_monthly if target_monthly else 0.0
            gaps.append({
                "type": "savings_gap", "severity": severity_from_ratio(savings_gap_ratio),
                "amount": round_currency(savings_gap_amount),
                "message": "Current leftover cash is not enough to hit the savings goal on time.",
                "driver": "remaining_cash",
            })

    if snapshot["remaining"] <= 0:
        gaps.append({
            "type": "negative_cashflow_gap", "severity": "high",
            "amount": round_currency(abs(snapshot["remaining"])),
            "message": "Monthly cash flow is negative after commitments and spending.",
            "driver": "remaining",
        })

    if not gaps:
        gaps.append({
            "type": "stable_profile", "severity": "low", "amount": 0.0,
            "message": "No critical finance gap detected against the selected benchmark.",
            "driver": "overall_profile",
        })

    return gaps
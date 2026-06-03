from __future__ import annotations

import json
import math
import os
import re
from functools import lru_cache
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from dotenv import load_dotenv
from gemini_client import generate_text


PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(dotenv_path=PROJECT_ROOT / ".env")

DATA_DIR = PROJECT_ROOT / "data" / "processed"
SUMMARY_PATH = DATA_DIR / "hies_state_summary.json"

STATE_ALIASES = {
    "penang": "Pulau Pinang",
    "pulau pinang": "Pulau Pinang",
    "kuala lumpur": "W.P. Kuala Lumpur",
    "wp kuala lumpur": "W.P. Kuala Lumpur",
    "w.p. kuala lumpur": "W.P. Kuala Lumpur",
    "labuan": "W.P. Labuan",
    "w.p. labuan": "W.P. Labuan",
    "putrajaya": "W.P. Putrajaya",
    "w.p. putrajaya": "W.P. Putrajaya",
}

DEFAULT_PORT = int(os.environ.get("BACKEND_PORT", "8000"))


@lru_cache(maxsize=1)
def load_summary() -> dict[str, Any]:
    if not SUMMARY_PATH.exists():
        raise FileNotFoundError(
            f"Missing processed dataset: {SUMMARY_PATH}. Run scripts/etl_pipeline.py first."
        )

    with SUMMARY_PATH.open(encoding="utf-8") as handle:
        return json.load(handle)


def normalize_state_name(value: str | None) -> str:
    if not value:
        return "Selangor"

    cleaned = " ".join(value.strip().split())
    return STATE_ALIASES.get(cleaned.lower(), cleaned)


def safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if value in (None, ""):
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def clamp(value: float, minimum: float = 0.0, maximum: float = 100.0) -> float:
    return max(minimum, min(maximum, value))


def round_currency(value: float) -> float:
    return round(max(value, 0.0), 2)


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
        "avg_income_mean": fallback_row.get("avg_income_mean", 0),
        "avg_income_median": fallback_row.get("avg_income_mean", 0),
        "avg_expenditure_mean": fallback_row.get("avg_expenditure_mean", 0),
        "avg_poverty": fallback_row.get("avg_poverty", 0),
    }


def estimate_deductions(gross_salary: float) -> dict[str, float]:
    epf = round_currency(gross_salary * 0.11)
    socso = round_currency(min(gross_salary * 0.0035, 19.75))
    eis = round_currency(gross_salary * 0.002)
    pcb = round_currency(max((gross_salary - 5000) * 0.03, 0.0))
    total = round_currency(epf + socso + eis + pcb)

    return {
        "epf": epf,
        "socso": socso,
        "eis": eis,
        "pcb": pcb,
        "total": total,
        "take_home": round_currency(gross_salary - total),
    }


def build_risk_flags(take_home: float, commitments: float, spending: float, remaining: float) -> list[str]:
    if take_home <= 0:
        return ["No take-home pay detected"]

    flags: list[str] = []
    commitment_ratio = commitments / take_home
    spending_ratio = spending / take_home
    savings_ratio = remaining / take_home

    if commitment_ratio > 0.5:
        flags.append("Fixed commitments exceed 50% of take-home pay")
    if spending_ratio > 0.35:
        flags.append("Variable spending is above a comfortable range")
    if savings_ratio < 0.15:
        flags.append("Savings buffer is below the 15% target")

    return flags


def severity_from_ratio(ratio: float) -> str:
    if ratio >= 0.35:
        return "high"
    if ratio >= 0.2:
        return "medium"
    return "low"


def build_finance_gaps(snapshot: dict[str, Any], benchmark: dict[str, Any], plan: dict[str, Any]) -> list[dict[str, Any]]:
    take_home = snapshot["take_home"]
    median_income = safe_float(benchmark.get("avg_income_median"), 0.0)
    benchmark_spending = safe_float(benchmark.get("avg_expenditure_mean"), 0.0)
    savings_goal = safe_float(snapshot.get("savings_goal"), 0.0)
    target_months = int(safe_float(snapshot.get("goal_months"), 12)) or 12

    gaps: list[dict[str, Any]] = []

    income_gap_amount = max(median_income - snapshot["gross_salary"], 0.0)
    if income_gap_amount > 0:
        income_gap_ratio = income_gap_amount / median_income if median_income else 0.0
        gaps.append(
            {
                "type": "income_gap",
                "severity": severity_from_ratio(income_gap_ratio),
                "amount": round_currency(income_gap_amount),
                "message": f"Income is RM {income_gap_amount:,.2f} below the {snapshot['state']} median.",
                "driver": "gross_salary",
            }
        )

    commitment_ratio = snapshot["total_commitments"] / take_home if take_home else 0.0
    if take_home > 0 and commitment_ratio > 0.5:
        gaps.append(
            {
                "type": "cashflow_gap",
                "severity": severity_from_ratio(commitment_ratio - 0.5),
                "amount": round_currency(snapshot["total_commitments"] - take_home * 0.5),
                "message": "Fixed commitments are consuming too much of take-home pay.",
                "driver": "total_commitments",
            }
        )

    spending_gap_amount = max(snapshot["total_spending"] - benchmark_spending, 0.0)
    if spending_gap_amount > 0:
        spending_gap_ratio = spending_gap_amount / benchmark_spending if benchmark_spending else 0.0
        gaps.append(
            {
                "type": "spending_gap",
                "severity": severity_from_ratio(spending_gap_ratio),
                "amount": round_currency(spending_gap_amount),
                "message": f"Variable spending is RM {spending_gap_amount:,.2f} above the benchmark average.",
                "driver": "total_spending",
            }
        )

    savings_gap_amount = max((savings_goal / target_months) - snapshot["remaining"], 0.0) if savings_goal else 0.0
    if savings_gap_amount > 0:
        target_monthly = savings_goal / target_months if target_months else 0.0
        savings_gap_ratio = savings_gap_amount / target_monthly if target_monthly else 0.0
        gaps.append(
            {
                "type": "savings_gap",
                "severity": severity_from_ratio(savings_gap_ratio),
                "amount": round_currency(savings_gap_amount),
                "message": "Current leftover cash is not enough to hit the savings goal on time.",
                "driver": "remaining_cash",
            }
        )

    if snapshot["remaining"] <= 0:
        gaps.append(
            {
                "type": "negative_cashflow_gap",
                "severity": "high",
                "amount": round_currency(abs(snapshot["remaining"])),
                "message": "Monthly cash flow is negative after commitments and spending.",
                "driver": "remaining",
            }
        )

    if not gaps:
        gaps.append(
            {
                "type": "stable_profile",
                "severity": "low",
                "amount": 0.0,
                "message": "No critical finance gap detected against the selected benchmark.",
                "driver": "overall_profile",
            }
        )

    return gaps


def build_snapshot(payload: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    state = normalize_state_name(payload.get("state"))
    benchmark = get_state_benchmark(state)

    gross_salary = round_currency(safe_float(payload.get("gross_salary")))
    deductions = estimate_deductions(gross_salary)

    phone_bill_raw = safe_float(payload.get("phone_bill"))
    phone_bill = phone_bill_raw if phone_bill_raw <= 500 else 0.0

    commitments = round_currency(
        safe_float(payload.get("rent"))
        + safe_float(payload.get("study_loan"))
        + safe_float(payload.get("car_loan"))
        + phone_bill
    )
    spending = round_currency(
        safe_float(payload.get("food_spending"))
        + safe_float(payload.get("transport_spending"))
        + safe_float(payload.get("entertainment"))
    )
    remaining = round_currency(deductions["take_home"] - commitments - spending)

    median_income = safe_float(benchmark.get("avg_income_median"), 0.0)
    diff_from_median = gross_salary - median_income
    diff_percent = round(abs(diff_from_median / median_income) * 100) if median_income else 0

    snapshot = {
        "name": payload.get("name", "there"),
        "state": state,
        "gross_salary": gross_salary,
        "take_home": deductions["take_home"],
        "epf": deductions["epf"],
        "socso": deductions["socso"],
        "eis": deductions["eis"],
        "pcb": deductions["pcb"],
        "total_commitments": commitments,
        "total_spending": spending,
        "remaining": remaining,
        "benchmark": {
            "median_income": median_income,
            "mean_expenditure": safe_float(benchmark.get("avg_expenditure_mean"), 0.0),
            "poverty_rate": safe_float(benchmark.get("avg_poverty"), 0.0),
        },
        "benchmark_comparison": (
            f"Your salary is {diff_percent}% above the {state} median income."
            if diff_from_median >= 0
            else f"Your salary is {diff_percent}% below the {state} median income."
        ),
        "risk_flags": build_risk_flags(deductions["take_home"], commitments, spending, remaining),
    }

    return snapshot, benchmark


def health_score(snapshot: dict[str, Any], benchmark: dict[str, Any]) -> tuple[int, str]:
    take_home = snapshot["take_home"]
    if take_home <= 0:
        return 0, "Critical"

    remaining_ratio = snapshot["remaining"] / take_home
    commitment_ratio = snapshot["total_commitments"] / take_home
    spending_ratio = snapshot["total_spending"] / take_home
    benchmark_gap = snapshot["gross_salary"] - safe_float(benchmark.get("avg_income_median"), 0.0)

    score = 55
    score += remaining_ratio * 45
    score -= max(commitment_ratio - 0.35, 0) * 70
    score -= max(spending_ratio - 0.25, 0) * 35
    if benchmark_gap > 0:
        score += 5

    score = int(clamp(score))

    if score >= 75:
        label = "Strong"
    elif score >= 55:
        label = "Needs Attention"
    else:
        label = "At Risk"

    return score, label


def budget_allocation(take_home: float, score: int) -> dict[str, dict[str, float]]:
    if take_home <= 0:
        return {
            "needs": {"amount": 0, "percentage": 0},
            "wants": {"amount": 0, "percentage": 0},
            "savings": {"amount": 0, "percentage": 0},
        }

    if score >= 75:
        ratios = {"needs": 0.5, "wants": 0.3, "savings": 0.2}
    elif score >= 55:
        ratios = {"needs": 0.55, "wants": 0.25, "savings": 0.2}
    else:
        ratios = {"needs": 0.6, "wants": 0.2, "savings": 0.2}

    return {
        key: {
            "amount": round_currency(take_home * ratio),
            "percentage": int(round(ratio * 100)),
        }
        for key, ratio in ratios.items()
    }


def recommendation(rank: int, action: str, monthly_impact: float, difficulty: str, reasoning: str) -> dict[str, Any]:
    return {
        "rank": rank,
        "action": action,
        "monthly_impact": round_currency(monthly_impact),
        "difficulty": difficulty,
        "reasoning": reasoning,
    }


def build_recommendations(snapshot: dict[str, Any], benchmark: dict[str, Any]) -> list[dict[str, Any]]:
    take_home = snapshot["take_home"]
    total_commitments = snapshot["total_commitments"]
    food = safe_float(snapshot.get("food_spending"), 0.0)
    transport = safe_float(snapshot.get("transport_spending"), 0.0)
    entertainment = safe_float(snapshot.get("entertainment"), 0.0)

    recommendations: list[dict[str, Any]] = []

    if take_home > 0 and total_commitments / take_home > 0.45:
        recommendations.append(
            recommendation(
                1,
                "Refinance or renegotiate one fixed commitment",
                min(total_commitments * 0.1, 250),
                "Hard",
                "Your recurring commitments are taking a large share of take-home pay. Reducing one loan or subscription has the fastest impact.",
            )
        )

    if take_home > 0 and food / take_home > 0.18:
        recommendations.append(
            recommendation(
                2,
                "Cook at home for 4 days a week",
                min(food * 0.25, 180),
                "Easy",
                f"Food spending is {round((food / take_home) * 100)}% of take-home pay. Small meal prep changes can free up cash quickly.",
            )
        )

    if take_home > 0 and transport / take_home > 0.12:
        recommendations.append(
            recommendation(
                3,
                "Bundle trips or switch to public transport on low-traffic days",
                min(transport * 0.2, 120),
                "Medium",
                "Transport costs are a noticeable part of your budget. Fewer solo trips or ride-hailing days will improve your monthly buffer.",
            )
        )

    if take_home > 0 and entertainment / take_home > 0.08:
        recommendations.append(
            recommendation(
                4,
                "Cap discretionary spending with a weekly cash limit",
                min(entertainment * 0.3, 100),
                "Easy",
                "Your wants category is large enough to warrant a simple spending cap. This keeps lifestyle creep under control.",
            )
        )

    if take_home > 0 and snapshot["remaining"] / take_home < 0.2:
        recommendations.append(
            recommendation(
                5,
                "Automate a transfer to savings on payday",
                max(snapshot["remaining"] * 0.2, 75),
                "Easy",
                "Your leftover cash is still thin after expenses. Paying yourself first makes the savings goal more predictable.",
            )
        )

    if not recommendations:
        recommendations.append(
            recommendation(
                1,
                "Keep the current plan and automate savings",
                max(snapshot["remaining"] * 0.15, 50),
                "Easy",
                f"Your spending is already below the {snapshot['state']} benchmark of RM {safe_float(benchmark.get('avg_expenditure_mean')):,.0f}.",
            )
        )

    recommendations.sort(key=lambda item: item["monthly_impact"], reverse=True)

    ranked: list[dict[str, Any]] = []
    for index, rec in enumerate(recommendations[:3], start=1):
        ranked.append({**rec, "rank": index})

    return ranked


def month_name(index: int) -> str:
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return months[(index - 1) % len(months)]


def build_goal_status(snapshot: dict[str, Any], ranked_recommendations: list[dict[str, Any]], target_amount: float, target_months: int) -> str:
    monthly_base = max(snapshot["remaining"], 0.0)
    monthly_plan_boost = sum(rec["monthly_impact"] for rec in ranked_recommendations)
    planned_monthly_savings = max(monthly_base + monthly_plan_boost, 0.0)

    if target_amount <= 0:
        return "Enter a valid savings goal to see a timeline."

    if monthly_base <= 0 and planned_monthly_savings <= 0:
        return "Your current cash flow is negative, so the goal is not reachable yet. Reduce commitments before targeting the goal."

    current_months = math.ceil(target_amount / max(monthly_base, 1))
    planned_months = math.ceil(target_amount / max(planned_monthly_savings, 1))

    if planned_months <= target_months:
        return (
            f"At your current pace you would reach RM {target_amount:,.0f} in about {current_months} months. "
            f"Following this plan brings it down to {planned_months} months, which is within your target of {target_months} months."
        )

    return (
        f"At your current pace you would reach RM {target_amount:,.0f} in about {current_months} months. "
        f"This plan improves that to {planned_months} months, but you still need to trim expenses to hit the {target_months}-month target."
    )


def build_plan(snapshot: dict[str, Any], benchmark: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    """Generates a dynamic financial plan matching the exact property keys of the frontend components."""
    
    take_home = snapshot.get('take_home', 0)
    # Safely get the target savings goal amount from payload to pass back to the chart
    goal_amount = payload.get('savings_goal_amount', 5000) 
    
    prompt = f"""
    You are an expert Malaysian financial advisor. Analyze this graduate profile and return a clean JSON dataset matching the requested schema.
    
    User Parameters:
    - Gross Salary: RM {snapshot.get('gross_salary')}
    - Take-Home Net Pay: RM {take_home}
    - Total Fixed Commitments: RM {snapshot.get('total_commitments')}
    - Total Variable Spending: RM {snapshot.get('total_spending')}
    
    Tasks to perform:
    1. Calculate a comprehensive financial health score out of 100 based on their commitments relative to take-home pay. 
    2. Allocate budget across Needs, Wants, and Savings dynamically (Ensure percentages add up to 100%, and calculate relative RM amounts using take-home pay {take_home}).
    3. Generate exactly 2 targeted ranked recommendations. For the 'difficulty' field, choose ONLY from 'Easy', 'Medium', or 'Hard'.
    4. Provide a cumulative 6-month savings projection array tracking monthly progressive savings accumulation.

    Return a JSON object that strictly adheres to this structure:
    {{
        "financial_health_score": 75,
        "health_label": "Healthy Buffer",
        "benchmark_comparison": "Slightly above regional average",
        "budget_allocation": {{
            "needs": {{"percentage": 50, "amount": {int(take_home * 0.5)}}},
            "wants": {{"percentage": 30, "amount": {int(take_home * 0.3)}}},
            "savings": {{"percentage": 20, "amount": {int(take_home * 0.2)}}}
        }},
        "ranked_recommendations": [
            {{
                "rank": 1,
                "action": "Switch to a monthly public transport pass",
                "difficulty": "Easy",
                "monthly_impact": 150,
                "reasoning": "Your transport spending is currently high. Utilizing the My50 unlimited travel pass in the Klang Valley will immediately slash your transit costs."
            }},
              {{
                "rank": 2,
                "action": "Switch to a monthly public transport pass",
                "difficulty": "Easy",
                "monthly_impact": 150,
                "reasoning": "Your transport spending is currently high. Utilizing the My50 unlimited travel pass in the Klang Valley will immediately slash your transit costs."
            }},
            {{
                "rank": 3,
                "action": "Cook mid-week meals at home",
                "difficulty": "Medium",
                "monthly_impact": 300,
                "reasoning": "Food delivery and dining out are eroding your variable buffer. Meal prepping 3 days a week will secure this extra monthly saving easily."
            }}
        ],
        "savings_projection": [
            {{"month": "M1", "projected_savings": {int(take_home * 0.2 * 1)}}},
            {{"month": "M2", "projected_savings": {int(take_home * 0.2 * 2)}}},
            {{"month": "M3", "projected_savings": {int(take_home * 0.2 * 3)}}},
            {{"month": "M4", "projected_savings": {int(take_home * 0.2 * 4)}}},
            {{"month": "M5", "projected_savings": {int(take_home * 0.2 * 5)}}},
            {{"month": "M6", "projected_savings": {int(take_home * 0.2 * 6)}}}
        ],
        "goal_status": "Your trajectory looks solid. Stick to your core savings routine to secure a comfortable emergency safety net."
    }}
    """

    try:
        
        ai_response = generate_text(prompt, max_tokens=1200, temperature=0.2, json_mode=True)

         # ── Strip markdown code fences if present ──
        cleaned = ai_response.strip()
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
        cleaned = cleaned.strip()
        # ───────────────────────────────────────────

        plan_data = json.loads(cleaned)
        #plan_data = json.loads(ai_response.strip())
        return plan_data
        
    except Exception as e:
        print(f"ERROR PARSING GEMINI PLAN: {e}")
        # Static failsafe matching your EXACT frontend property needs
        return {
            "financial_health_score": 60,
            "health_label": "Calculated Baseline",
            "benchmark_comparison": "Aligned with average cohorts",
            "budget_allocation": {
                "needs": {"percentage": 50, "amount": int(take_home * 0.5)},
                "wants": {"percentage": 30, "amount": int(take_home * 0.3)},
                "savings": {"percentage": 20, "amount": int(take_home * 0.2)}
            },
            "ranked_recommendations": [
                {
                    "rank": 1, 
                    "action": "Review Subscription Commitments", 
                    "difficulty": "Easy", 
                    "monthly_impact": 50, 
                    "reasoning": "Audit streaming platforms or digital memberships to ensure you aren't leaking passive cash flow."
                }
            ],
            "savings_projection": [{"month": f"M{i}", "projected_savings": int(take_home * 0.2 * i)} for i in range(1, 7)],
            "goal_status": "Continue recording active transactions to generate contextual tracking updates."
        }

def analyze_profile(payload: dict[str, Any]) -> dict[str, Any]:
    snapshot, benchmark = build_snapshot(payload)
    plan = build_plan(snapshot, benchmark, payload)
     # Add goal_amount to plan so frontend can access it
    plan["goal_amount"] = safe_float(payload.get("savings_goal"), 5000)
    finance_gaps = build_finance_gaps({**snapshot, **payload}, benchmark, plan)

    # ── NEW: Generate Gemini summary for the frontend component ──
    prompt_lines = [
        f"Provide a concise summary (3-4 sentences) of this user's financial snapshot:",
        f"State: {snapshot.get('state')}",
        f"Gross salary: RM {snapshot.get('gross_salary')}",
        f"Take-home: RM {snapshot.get('take_home')}",
        f"Total commitments: RM {snapshot.get('total_commitments')}",
        f"Total spending: RM {snapshot.get('total_spending')}",
        f"Remaining: RM {snapshot.get('remaining')}",
        f"Risk flags: {', '.join(snapshot.get('risk_flags', []))}",
    ]
    prompt = "\n".join(prompt_lines)

    try:
        # Generate the live text and inject it into the snapshot dictionary
        snapshot["summary"] = generate_text(prompt, max_tokens=512)
    except Exception as exc:
        # Fallback gracefully so an API error doesn't completely crash your calculations
        snapshot["summary"] = f"Unable to load live insights at this time ({exc})."
    # ─────────────────────────────────────────────────────────────

    if any(gap["severity"] == "high" for gap in finance_gaps):
        pipeline_state = "high-risk"
    elif any(gap["severity"] == "medium" for gap in finance_gaps):
        pipeline_state = "moderate-risk"
    else:
        pipeline_state = "stable"

    return {
        "pipeline_stage": "finance_gap_detection",
        "pipeline_state": pipeline_state,
        "snapshot": snapshot,  # Now includes snapshot["summary"]!
        "finance_gaps": finance_gaps,
        "plan": plan,
    }


class FinancialAnalysisHandler(BaseHTTPRequestHandler):
    def _send_json(self, status_code: int, payload: dict[str, Any]) -> None:
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()
        self.wfile.write(encoded)

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()

    def do_GET(self) -> None:
        if self.path in {"/", "/api/health"}:
            self._send_json(200, {"status": "ok", "service": "week_2 finance gap detection backend"})
            return

        self._send_json(404, {"error": "Not found"})

    def do_POST(self) -> None:
        if self.path == "/api/summarize":
            content_length = int(self.headers.get("Content-Length", "0"))
            raw_body = self.rfile.read(content_length).decode("utf-8") if content_length else "{}"

            try:
                payload = json.loads(raw_body)
            except json.JSONDecodeError:
                self._send_json(400, {"error": "Invalid JSON payload"})
                return

            try:
                snapshot, benchmark = build_snapshot(payload)
            except FileNotFoundError as exc:
                self._send_json(500, {"error": str(exc)})
                return

            prompt_lines = [
                f"Provide a concise summary (3-4 sentences) of this user's financial snapshot:",
                f"State: {snapshot.get('state')}",
                f"Gross salary: RM {snapshot.get('gross_salary')}",
                f"Take-home: RM {snapshot.get('take_home')}",
                f"Total commitments: RM {snapshot.get('total_commitments')}",
                f"Total spending: RM {snapshot.get('total_spending')}",
                f"Remaining: RM {snapshot.get('remaining')}",
                f"Risk flags: {', '.join(snapshot.get('risk_flags', []))}",
            ]
            prompt = "\n".join(prompt_lines)

            try:
                summary = generate_text(prompt)
            except Exception as exc:  # pragma: no cover - surface errors to HTTP boundary
                self._send_json(500, {"error": f"Failed to generate summary: {exc}"})
                return

            self._send_json(200, {"summary": summary})
            return

        if self.path != "/api/analyze":
            self._send_json(404, {"error": "Not found"})
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length).decode("utf-8") if content_length else "{}"

        try:
            payload = json.loads(raw_body)
        except json.JSONDecodeError:
            self._send_json(400, {"error": "Invalid JSON payload"})
            return

        try:
            result = analyze_profile(payload)
        except FileNotFoundError as exc:
            self._send_json(500, {"error": str(exc)})
            return
        except Exception as exc:  # pragma: no cover - defensive fallback for the HTTP boundary
            self._send_json(500, {"error": f"Failed to analyze profile: {exc}"})
            return

        self._send_json(200, result)


def main() -> int:
    server = ThreadingHTTPServer(("0.0.0.0", DEFAULT_PORT), FinancialAnalysisHandler)
    print(f"Finance gap detection backend listening on http://localhost:{DEFAULT_PORT}")
    print(f"Using dataset: {SUMMARY_PATH}")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down backend...")
    finally:
        server.server_close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

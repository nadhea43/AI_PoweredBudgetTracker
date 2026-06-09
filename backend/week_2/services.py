# This handles assembling complex data structures, prompt formatting, 
# executing the text generation requests, and compiling final fallback models.

import json
import math
from typing import Any
from gemini_client import generate_text
from utils import safe_float, round_currency, normalize_state_name, sum_dynamic_list, clamp
from analyzers import get_state_benchmark, estimate_deductions, detect_anomalies, build_risk_flags, get_age_benchmark, build_finance_gaps

def health_score_python(snapshot: dict[str, Any], benchmark: dict[str, Any]) -> tuple[int, str]:
    take_home = snapshot["take_home"]
    if take_home <= 0:
        return 0, "Critical"

    remaining_ratio  = snapshot["remaining"] / take_home
    commitment_ratio = snapshot["total_commitments"] / take_home
    spending_ratio   = snapshot["total_spending"] / take_home
    benchmark_gap    = snapshot["gross_salary"] - safe_float(benchmark.get("avg_income_median"), 0.0)

    score = 55
    score += remaining_ratio * 45
    score -= max(commitment_ratio - 0.35, 0) * 70
    score -= max(spending_ratio  - 0.25, 0) * 35
    if benchmark_gap > 0:
        score += 5

    score = int(clamp(score))
    label = "Strong" if score >= 75 else ("Needs Attention" if score >= 55 else "At Risk")
    return score, label

def build_snapshot(payload: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    state     = normalize_state_name(payload.get("state"))
    benchmark = get_state_benchmark(state)

    gross_salary = round_currency(safe_float(payload.get("gross_salary")))
    deductions   = estimate_deductions(gross_salary)

    fixed_list    = payload.get("fixed_commitments", [])
    variable_list = payload.get("variable_spendings", [])

    commitments = (
        sum_dynamic_list(fixed_list) if fixed_list
        else round_currency(
            safe_float(payload.get("rent")) + safe_float(payload.get("study_loan")) +
            safe_float(payload.get("car_loan")) + safe_float(payload.get("phone_bill"))
        )
    )
    spending = (
        sum_dynamic_list(variable_list) if variable_list
        else round_currency(
            safe_float(payload.get("food_spending")) + safe_float(payload.get("transport_spending")) +
            safe_float(payload.get("entertainment"))
        )
    )

    remaining    = round_currency(deductions["take_home"] - commitments - spending)
    median_income = safe_float(benchmark.get("avg_income_median"), 0.0)
    diff_from_median = gross_salary - median_income
    diff_percent = round(abs(diff_from_median / median_income) * 100) if median_income else 0

    anomalies = detect_anomalies(fixed_list + variable_list)

    phone_provider = (payload.get("phone_provider") or "").strip()
    bill_items = [
        i for i in fixed_list
        if any(k in (i.get("label") or "").lower() for k in ("phone", "wifi", "internet", "broadband", "insurance", "subscription"))
    ]
    bill_context_lines = "\n".join(
        f"  - {i.get('label')}: RM {i.get('amount')}/month" + (f", provider: {phone_provider}" if phone_provider else " (provider not specified)")
        for i in bill_items
    ) if bill_items else "  - none declared"

    snapshot = {
        "name":              payload.get("name", "there"),
        "state":             state,
        "gross_salary":      gross_salary,
        "take_home":         deductions["take_home"],
        "epf":               deductions["epf"],
        "socso":             deductions["socso"],
        "eis":               deductions["eis"],
        "pcb":               deductions["pcb"],
        "total_commitments": commitments,
        "total_spending":    spending,
        "remaining":         remaining,
        "food_spending":     sum(safe_float(i.get("amount")) for i in variable_list if "food" in i.get("label","").lower() or "grocer" in i.get("label","").lower()) or safe_float(payload.get("food_spending")),
        "transport_spending":sum(safe_float(i.get("amount")) for i in variable_list if "transport" in i.get("label","").lower() or "grab" in i.get("label","").lower()) or safe_float(payload.get("transport_spending")),
        "entertainment":     sum(safe_float(i.get("amount")) for i in variable_list if "entertain" in i.get("label","").lower() or "shopping" in i.get("label","").lower()) or safe_float(payload.get("entertainment")),
        "fixed_commitments": fixed_list,
        "variable_spendings":variable_list,
        "anomalies":         anomalies,
        "bill_context_lines":bill_context_lines,
        "benchmark": {
            "median_income":    median_income,
            "mean_expenditure": safe_float(benchmark.get("avg_expenditure_mean"), 0.0),
            "poverty_rate":     safe_float(benchmark.get("avg_poverty"), 0.0),
        },
        "benchmark_comparison": (
            f"Your salary is {diff_percent}% above the {state} median income."
            if diff_from_median >= 0
            else f"Your salary is {diff_percent}% below the {state} median income."
        ),
        "risk_flags": build_risk_flags(deductions["take_home"], commitments, spending, remaining),
    }
    return snapshot, benchmark

def build_plan(snapshot: dict[str, Any], benchmark: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    take_home         = snapshot.get("take_home", 0)
    total_commitments = snapshot.get("total_commitments", 0)
    total_spending    = snapshot.get("total_spending", 0)
    remaining         = max(snapshot.get("remaining", 0), 0)
    goal_amount       = safe_float(payload.get("savings_goal"), 0)
    target_months     = int(safe_float(payload.get("goal_months"), 6)) or 6

    monthly_needed   = round(goal_amount / target_months, 2) if goal_amount and target_months else 0
    monthly_saveable = remaining
    total_saveable   = round(monthly_saveable * target_months, 2)
    is_achievable    = total_saveable >= goal_amount if goal_amount > 0 else True
    actual_months    = math.ceil(goal_amount / monthly_saveable) if monthly_saveable > 0 and goal_amount > 0 else None

    needs_pct       = round(total_commitments / take_home, 4) if take_home else 0
    raw_savings_pct = monthly_needed / take_home if take_home else 0.20
    savings_pct     = max(0.20, min(raw_savings_pct, 0.60))
    wants_pct       = max(round(1 - needs_pct - savings_pct, 4), 0.05)
    if wants_pct == 0.05:
        savings_pct = round(1 - needs_pct - 0.05, 4)

    needs_amount   = total_commitments
    savings_amount = min(round(take_home * savings_pct, 2), remaining)
    savings_pct    = round(savings_amount / take_home, 4) if take_home else savings_pct
    wants_amount   = round(take_home - needs_amount - savings_amount, 2)
    wants_pct      = round(wants_amount / take_home, 4) if take_home else wants_pct
    wants_remaining = round(wants_amount - total_spending, 2)

    savings_projection = [
        {
            "month": f"M{i}",
            "projected_savings": round(monthly_saveable * i, 2),
            "needed_savings":    round(monthly_needed * i, 2),
            "goal_amount":       goal_amount,
        }
        for i in range(1, target_months + 1)
    ]

    if goal_amount <= 0:
        goal_status = "Enter a savings goal to see your projection."
    elif monthly_saveable <= 0:
        goal_status = "Your cash flow is negative. Reduce expenses before targeting a savings goal."
    elif not is_achievable:
        shortfall       = round(goal_amount - total_saveable, 2)
        suggested_goal  = round(monthly_saveable * target_months, -2)
        goal_status = (
            f"Your goal of RM {goal_amount:,.0f} is not achievable in {target_months} months. "
            f"Saving all your remaining cash (RM {monthly_saveable:,.2f}/month), "
            f"you can only reach RM {total_saveable:,.0f} — short by RM {shortfall:,.0f}. "
            f"Realistic options: extend to {actual_months} months, or adjust your goal to RM {suggested_goal:,.0f}."
        )
    elif actual_months and actual_months <= target_months:
        months_ahead = target_months - actual_months
        goal_status = (
            f"You are on track to reach RM {goal_amount:,.0f} in {actual_months} months"
            f"{f' — {months_ahead} months ahead of your {target_months}-month target.' if months_ahead > 0 else '.'}"
        )
    else:
        shortfall_pm = round(monthly_needed - monthly_saveable, 2)
        goal_status = (
            f"At your current pace you will reach RM {goal_amount:,.0f} in {actual_months} months, "
            f"but your target is {target_months} months. "
            f"Save an extra RM {shortfall_pm:,.2f}/month to hit your target on time."
        )

    spending_lines = "\n".join(f"  - {item['label']}: RM {item['amount']}" for item in snapshot.get("variable_spendings", [])) or "  - (no itemised spending provided)"
    commitment_lines = "\n".join(f"  - {item['label']}: RM {item['amount']}" for item in snapshot.get("fixed_commitments", [])) or "  - (no itemised commitments provided)"
    
    benchmark_25_34 = get_age_benchmark("25_34")
    utilities_benchmark = benchmark_25_34.get("housing_utilities", 1201.69)
    anomaly_lines = "\n".join(f"  - {a['category']}: RM {a['your_amount']} vs DOSM 25-34 benchmark RM {a['benchmark']} ({a['flag']})" for a in snapshot.get("anomalies", [])) or "  - none detected"
    bill_context_lines = snapshot.get("bill_context_lines", "  - none declared")
    median_income = safe_float(benchmark.get("avg_income_median"), 0.0)
    salary_gap    = round(max(median_income - snapshot["gross_salary"], 0), 2)

    prompt = f"""You are a Malaysian financial advisor specialising in fresh graduates.
Analyse the following profile and return ONLY a valid JSON object — no markdown, no backticks.

=== USER PROFILE ===
Name: {snapshot.get('name')}
State: {snapshot.get('state')}
Gross salary: RM {snapshot.get('gross_salary')}
Take-home pay: RM {take_home}
State median income: RM {median_income}
Salary gap vs median: RM {salary_gap} below median

Fixed commitments:
{commitment_lines}

Variable spending:
{spending_lines}

Remaining cash/month: RM {remaining}
Savings goal: RM {goal_amount} in {target_months} months
Monthly needed to hit goal: RM {monthly_needed}
Currently saveable/month: RM {monthly_saveable}

DOSM 25-34 age group spending anomalies detected:
{anomaly_lines}

Key DOSM 25-34 benchmarks for reference (RM/month):
  - Housing, Water, Electricity & Gas: RM {utilities_benchmark}
  - Food & Beverages: RM {benchmark_25_34.get("food_beverages", 826.54)}
  - Transport: RM {benchmark_25_34.get("transport", 538.25)}
  - Restaurants / eating out: RM {benchmark_25_34.get("restaurants_accommodation", 941.25)}
  - Information & Communication: RM {benchmark_25_34.get("communication", 327.18)}

Phone/WiFi/bill items declared by user:
{bill_context_lines}

=== YOUR TASKS ===
1. SPENDING TYPE: Classify this user as exactly one of: "Lifestyle Spender", "Committed Spender", "Stressed Saver", "Balanced", "Under-earner".
2. SUMMARY: Write 2-3 sentences directly to the user about their financial health.
3. HEALTH SCORE: Score out of 100 based on metrics profile.
4. RECOMMENDATIONS: Exactly 3 ranked recommendations specific to Malaysia.
5. GOAL SCENARIOS: Generate exactly 3 "what-if" paths to reach RM {goal_amount}.
6. INVESTMENT ADVICE: One short paragraph advising whether to prioritise EPF voluntary top-up vs ASB.
7. BILL SAVINGS: Audit only phone bills, WiFi/broadband bills, insurance, and subscriptions.

=== RETURN THIS EXACT JSON SCHEMA ===
{{
  "spending_type": "Lifestyle Spender",
  "summary": "Direct 2-3 sentence message...",
  "financial_health_score": 62,
  "health_label": "Needs Attention",
  "benchmark_comparison": "Slightly below regional average",
  "ranked_recommendations": [
    {{ "rank": 1, "action": "...", "difficulty": "Easy", "monthly_impact": 150, "reasoning": "..." }}
  ],
  "goal_scenarios": [
    {{ "label": "...", "action": "...", "monthly_saving": 150, "new_months": 14, "difficulty": "Medium" }}
  ],
  "investment_advice": "...",
  "bill_savings": []
}}"""

    try:
        ai_response  = generate_text(prompt, max_tokens=1800, temperature=0.2)
        cleaned_json = ai_response.strip().replace("```json", "").replace("```", "").strip()
        plan_data    = json.loads(cleaned_json)

        plan_data.setdefault("spending_type", "Balanced")
        plan_data.setdefault("summary", "Your financial plan has been analysed.")
        plan_data.setdefault("goal_scenarios", [])
        plan_data.setdefault("investment_advice", "Consider opening an ASB account.")
        plan_data.setdefault("bill_savings", [])
    except Exception as e:
        print(f"Gemini call failed: {e}")
        py_score, py_label = health_score_python(snapshot, benchmark)
        plan_data = {
            "spending_type":       "Balanced",
            "summary":             f"Based on your take-home of RM {take_home:,.0f}, your fixed commitments are RM {total_commitments:,.0f}.",
            "financial_health_score": py_score,
            "health_label":        py_label,
            "benchmark_comparison":"Calculated from your profile",
            "ranked_recommendations": [
                {"rank": 1, "action": "Automate a savings transfer on payday", "difficulty": "Easy", "monthly_impact": round(monthly_needed * 0.1, 2), "reasoning": "Paying yourself first ensures savings happen."}
            ],
            "goal_scenarios":   [],
            "investment_advice":"Consider opening an ASB account once your cash flow is positive.",
            "bill_savings":     [],
        }

    plan_data["budget_allocation"] = {
        "needs":   {"percentage": int(round(needs_pct * 100)),   "amount": needs_amount},
        "wants":   {"percentage": int(round(wants_pct * 100)),   "amount": wants_amount, "actual_spent": total_spending, "remaining_buffer": wants_remaining},
        "savings": {"percentage": int(round(savings_pct * 100)), "amount": savings_amount, "monthly_needed": monthly_needed},
    }
    plan_data["target_months"]         = target_months
    plan_data["savings_projection"]    = savings_projection
    plan_data["goal_status"]           = goal_status
    plan_data["goal_amount"]           = goal_amount
    plan_data["monthly_needed"]        = monthly_needed
    plan_data["monthly_saveable"]      = monthly_saveable
    plan_data["actual_months_to_goal"] = actual_months
    plan_data["is_achievable"]         = is_achievable
    plan_data["anomalies"]             = snapshot.get("anomalies", [])
    return plan_data

def analyze_profile(payload: dict[str, Any]) -> dict[str, Any]:
    snapshot, benchmark = build_snapshot(payload)
    snapshot["savings_goal"] = safe_float(payload.get("savings_goal"), 0)
    snapshot["goal_months"]  = int(safe_float(payload.get("goal_months"), 6)) or 6

    plan = build_plan(snapshot, benchmark, payload)
    snapshot["summary"] = plan.get("summary", "")
    snapshot["spending_type"] = plan.get("spending_type", "")

    finance_gaps = build_finance_gaps({**snapshot, **payload}, benchmark, plan)
    plan["goal_amount"] = safe_float(payload.get("savings_goal"), 5000)

    pipeline_state = (
        "high-risk"     if any(g["severity"] == "high"   for g in finance_gaps) else
        "moderate-risk" if any(g["severity"] == "medium" for g in finance_gaps) else
        "stable"
    )
    return {
        "pipeline_stage": "finance_gap_detection",
        "pipeline_state": pipeline_state,
        "snapshot":       snapshot,
        "finance_gaps":   finance_gaps,
        "plan":           plan,
    }
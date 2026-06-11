"""
etl_formal_wages.py
-------------------
Reads dosm_salary_benchmarks_full.xlsx (DOSM Formal Sector Wages 2025)
and produces data/processed/formal_wages_benchmark.json.

Output schema
-------------
{
  "metadata": {
    "source":       "DOSM Formal Sector Wages Q1-Q4 2025",
    "benchmark_month": "Dec-25",
    "generated_at": "<ISO datetime>",
    "url": "https://open.dosm.gov.my/dashboard/formal-sector-wages"
  },
  "by_age_group": {
    "<20":   { "median_wage": 1700, "label": "Below 20" },
    "20-24": { "median_wage": 2000, "label": "20 to 24 years" },
    ...
  },
  "by_state": {
    "W.P. Kuala Lumpur": { "median_wage": 4391, "normalized": "wp kuala lumpur" },
    "Selangor":          { "median_wage": 3400, "normalized": "selangor" },
    ...
  },
  "monthly_trend": {
    "by_age_group": {
      "20-24": { "Jan-25": 1827, "Feb-25": 1845, ..., "Dec-25": 2000 },
      ...
    },
    "by_state": {
      "Selangor": { "Jan-25": 3445, ..., "Dec-25": 3400 },
      ...
    }
  }
}
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

# ── Config ────────────────────────────────────────────────────────────────────

EXCEL_PATH  = Path(__file__).parent.parent / "data" / "raw" / "dosm_salary_benchmarks_full.xlsx"
OUTPUT_PATH = Path(__file__).parent.parent / "data" / "processed" / "formal_wages_benchmark.json"
BENCHMARK_MONTH = "Dec-25"          # most recent month used as primary benchmark

# Human-readable labels for age groups
AGE_LABELS = {
    "<20":   "Below 20 years",
    "20-24": "20 to 24 years",
    "25-29": "25 to 29 years",
    "30-34": "30 to 34 years",
    "35-39": "35 to 39 years",
    "40-44": "40 to 44 years",
    "45-49": "45 to 49 years",
    "50-54": "50 to 54 years",
    "55-59": "55 to 59 years",
    "60-64": "60 to 64 years",
    ">64":   "65 years and above",
}

# Canonical state name → normalized key (matches normalize_state_name in utils.py)
def normalize_state(name: str) -> str:
    return (
        str(name)
        .lower()
        .strip()
        .replace("w.p.", "wp")
        .replace("  ", " ")
        .replace(".", "")
    )

# Month columns in order (all 12 months)
MONTH_COLS = [
    "Jan-25", "Feb-25", "Mar-25",
    "Apr-25", "May-25", "Jun-25",
    "Jul-25", "Aug-25", "Sep-25",
    "Oct-25", "Nov-25", "Dec-25",
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def safe_int(val) -> int:
    try:
        return int(float(val))
    except (TypeError, ValueError):
        return 0


def load_age_sheet(path: Path) -> pd.DataFrame:
    # Row 4 (0-indexed 3) is the month header row
    df = pd.read_excel(path, sheet_name="By Age Group", header=3)
    df = df.rename(columns={"Age Group": "age_group"})
    df = df.dropna(subset=["age_group"])
    df["age_group"] = df["age_group"].astype(str).str.strip()
    # Drop the duplicate benchmark column — keep named month cols only
    keep = ["age_group"] + MONTH_COLS
    return df[keep]


def load_state_sheet(path: Path) -> pd.DataFrame:
    # Row 5 (0-indexed 4) is the month header row
    df = pd.read_excel(path, sheet_name="By State", header=4)
    df = df.rename(columns={"State / Territory": "state"})
    df = df.dropna(subset=["state"])
    df["state"] = df["state"].astype(str).str.strip()
    keep = ["state"] + MONTH_COLS
    return df[keep]


# ── Main ETL ──────────────────────────────────────────────────────────────────

def run():
    if not EXCEL_PATH.exists():
        print(f"[ERROR] Excel file not found: {EXCEL_PATH}")
        print("  Place dosm_salary_benchmarks_full.xlsx in data/raw/ and re-run.")
        sys.exit(1)

    print(f"[ETL] Reading: {EXCEL_PATH}")
    df_age   = load_age_sheet(EXCEL_PATH)
    df_state = load_state_sheet(EXCEL_PATH)

    # ── by_age_group ──────────────────────────────────────────────────────────
    by_age_group = {}
    for _, row in df_age.iterrows():
        ag = row["age_group"]
        by_age_group[ag] = {
            "median_wage": safe_int(row[BENCHMARK_MONTH]),
            "label":       AGE_LABELS.get(ag, ag),
        }

    # ── by_state ──────────────────────────────────────────────────────────────
    by_state = {}
    for _, row in df_state.iterrows():
        st = row["state"]
        by_state[st] = {
            "median_wage": safe_int(row[BENCHMARK_MONTH]),
            "normalized":  normalize_state(st),
        }

    # ── monthly_trend ─────────────────────────────────────────────────────────
    trend_age = {}
    for _, row in df_age.iterrows():
        ag = row["age_group"]
        trend_age[ag] = {m: safe_int(row[m]) for m in MONTH_COLS}

    trend_state = {}
    for _, row in df_state.iterrows():
        st = row["state"]
        trend_state[st] = {m: safe_int(row[m]) for m in MONTH_COLS}

    # ── Assemble output ───────────────────────────────────────────────────────
    output = {
        "metadata": {
            "source":          "DOSM Formal Sector Wages (Sektor Formal) Q1-Q4 2025",
            "benchmark_month": BENCHMARK_MONTH,
            "generated_at":    datetime.now(timezone.utc).isoformat(),
            "url":             "https://open.dosm.gov.my/dashboard/formal-sector-wages",
            "note":            "State medians cover all age groups combined. Age group medians are more accurate for peer comparison.",
        },
        "by_age_group":   by_age_group,
        "by_state":       by_state,
        "monthly_trend": {
            "by_age_group": trend_age,
            "by_state":     trend_state,
        },
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"[ETL] Done. Output → {OUTPUT_PATH}")
    print(f"      Age groups : {len(by_age_group)}")
    print(f"      States     : {len(by_state)}")
    print(f"      Months     : {len(MONTH_COLS)}")


if __name__ == "__main__":
    run()

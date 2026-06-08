"""ETL pipeline for HIES Table 1.8 — expenditure by age group.

Reads the raw CSV file (Table 1 - Main Statistics.csv), extracts
mean monthly household consumption expenditure by age group,
Malaysia 2024, and writes a clean JSON benchmark file to data/processed/.

Run this once after placing the CSV file in data/raw/:
    python scripts/etl_expenditure.py

Output: data/processed/expenditure_by_age.json
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Any

PROJECT_ROOT  = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = PROJECT_ROOT / "data" / "raw" / "Table 1 - Main Statistics.csv"
DEFAULT_OUTPUT = PROJECT_ROOT / "data" / "processed" / "expenditure_by_age.json"

# Age group column indices in the CSV (0-based)
# Row layout: col 0=code, col 1=label, col 2=sublabel, col 3=15-24, col 4=25-34, ...
AGE_GROUPS = {
    "15_24": 3,
    "25_34": 4,
    "35_44": 5,
    "45_64": 6,
    "65_plus": 7,
}

# Category codes and their English labels as they appear in the sheet
# We use the category code (col A) to identify rows reliably
CATEGORY_MAP = {
    "01": "food_beverages",
    "02": "alcohol_tobacco",
    "03": "clothing_footwear",
    "04": "housing_utilities",      # Housing, Water, Electricity, Gas — KEY for us
    "05": "furnishings_maintenance",
    "06": "health",
    "07": "transport",
    "08": "communication",
    "09": "recreation_culture",
    "10": "education",
    "11": "restaurants_accommodation",
    "12": "insurance_finance",
    "13": "personal_care_misc",
}

# Human-readable labels for the output JSON
CATEGORY_LABELS = {
    "food_beverages":           "Food & Beverages",
    "alcohol_tobacco":          "Alcohol & Tobacco",
    "clothing_footwear":        "Clothing & Footwear",
    "housing_utilities":        "Housing, Water, Electricity & Gas",
    "furnishings_maintenance":  "Furnishings & Household Maintenance",
    "health":                   "Health",
    "transport":                "Transport",
    "communication":            "Information & Communication",
    "recreation_culture":       "Recreation, Sport & Culture",
    "education":                "Education Services",
    "restaurants_accommodation":"Restaurants & Accommodation",
    "insurance_finance":        "Insurance & Financial Services",
    "personal_care_misc":       "Personal Care & Miscellaneous",
}


def _parse_value(val: Any) -> float | None:
    """Convert a CSV string value like '1,202' or '715' to float."""
    s = str(val).strip().replace(",", "")
    try:
        return float(s)
    except ValueError:
        return None


def extract(csv_path: Path) -> list[tuple]:
    """Read CSV and return all non-empty rows as tuples of strings."""
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV file not found: {csv_path}")

    rows = []
    with csv_path.open(encoding="utf-8-sig") as f:
        for row in csv.reader(f):
            if any(cell.strip() for cell in row):
                rows.append(tuple(row))
    return rows


def transform(raw_rows: list[tuple]) -> dict[str, Any]:
    """Parse raw rows into a structured dict keyed by age group."""
    data: dict[str, dict[str, float]] = {age: {} for age in AGE_GROUPS}
    total_row: dict[str, float] = {}

    for row in raw_rows:
        code = str(row[0]).strip() if row[0] else ""

        if code in CATEGORY_MAP:
            category_key = CATEGORY_MAP[code]
            for age_key, col_idx in AGE_GROUPS.items():
                val = row[col_idx] if col_idx < len(row) else None
                parsed = _parse_value(val)
                if parsed is not None:
                    data[age_key][category_key] = round(parsed, 2)

        # Detect the total row — label contains "01" and "13" and "expenditure"
        label = str(row[1] if len(row) > 1 else "").lower()
        if "01" in label and "13" in label and "expenditure" in label:
            for age_key, col_idx in AGE_GROUPS.items():
                val = row[col_idx] if col_idx < len(row) else None
                parsed = _parse_value(val)
                if parsed is not None:
                    total_row[age_key] = round(parsed, 2)

    if not total_row:
        for age_key in AGE_GROUPS:
            total_row[age_key] = round(sum(data[age_key].values()), 2)

    return {
        "source":      "DOSM HIES Table 1.8, Malaysia 2024",
        "description": "Mean monthly household consumption expenditure (RM) by age group of household head",
        "age_groups":  list(AGE_GROUPS.keys()),
        "categories":  CATEGORY_LABELS,
        "benchmarks":  data,
        "totals":      total_row,
    }


def load(payload: dict[str, Any], output_path: Path) -> None:
    """Write the transformed data to JSON."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
        f.write("\n")


def run_pipeline(input_path: Path, output_path: Path) -> dict[str, Any]:
    raw_rows   = extract(input_path)
    structured = transform(raw_rows)
    load(structured, output_path)

    # Quick validation — 25_34 housing_utilities should be ~1201
    housing_25_34 = structured["benchmarks"].get("25_34", {}).get("housing_utilities")
    categories_found = len(structured["benchmarks"].get("25_34", {}))

    return {
        "input":               str(input_path),
        "output":              str(output_path),
        "categories_extracted": categories_found,
        "25_34_housing_utilities_rm": housing_25_34,
        "25_34_total_rm":      structured["totals"].get("25_34"),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract HIES expenditure benchmarks by age group")
    parser.add_argument("--input",  type=Path, default=DEFAULT_INPUT,  help="Path to CSV file")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Output JSON path")
    return parser.parse_args()


def main() -> int:
    args   = parse_args()
    result = run_pipeline(args.input, args.output)
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

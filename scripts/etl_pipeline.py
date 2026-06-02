"""Simple ETL pipeline for the HIES state dataset.

This script follows a three-stage ETL flow:
- Extract: read the raw CSV from data/hies_state.csv
- Transform: validate, clean, and enrich the rows
- Load: write processed CSV and summary artifacts to data/processed/

The implementation uses only the Python standard library so it can run in a
minimal environment.
"""

from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from statistics import mean
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = PROJECT_ROOT / "data" / "hies_state.csv"
DEFAULT_OUTPUT_DIR = PROJECT_ROOT / "data" / "processed"

REQUIRED_COLUMNS = {
    "date",
    "state",
    "income_mean",
    "income_median",
    "expenditure_mean",
    "gini",
    "poverty",
}

NUMERIC_COLUMNS = {
    "income_mean",
    "income_median",
    "expenditure_mean",
    "gini",
    "poverty",
}


@dataclass(frozen=True)
class PipelinePaths:
    source: Path
    output_dir: Path
    cleaned_csv: Path
    transformed_csv: Path
    summary_json: Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the HIES ETL pipeline")
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT, help="Path to the raw CSV file")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help="Directory where cleaned and transformed outputs will be written",
    )
    return parser.parse_args()


def build_paths(source: Path, output_dir: Path) -> PipelinePaths:
    return PipelinePaths(
        source=source,
        output_dir=output_dir,
        cleaned_csv=output_dir / "hies_state_cleaned.csv",
        transformed_csv=output_dir / "hies_state_transformed.csv",
        summary_json=output_dir / "hies_state_summary.json",
    )


def ingest(source_path: Path) -> list[dict[str, str]]:
    if not source_path.exists():
        raise FileNotFoundError(f"Input file not found: {source_path}")

    with source_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        missing_columns = REQUIRED_COLUMNS.difference(reader.fieldnames or [])
        if missing_columns:
            raise ValueError(f"Missing required columns: {', '.join(sorted(missing_columns))}")
        return [row for row in reader if any((value or "").strip() for value in row.values())]


def parse_date(value: str) -> str:
    parsed = datetime.strptime(value.strip(), "%Y-%m-%d").date()
    return parsed.isoformat()


def parse_number(value: str, column_name: str) -> float:
    cleaned_value = value.strip()
    if cleaned_value == "":
        raise ValueError(f"Empty numeric value in column '{column_name}'")
    return float(cleaned_value)


def process(raw_rows: list[dict[str, str]]) -> list[dict[str, Any]]:
    processed_rows: list[dict[str, Any]] = []

    for index, row in enumerate(raw_rows, start=1):
        try:
            cleaned_row: dict[str, Any] = {
                "date": parse_date(row["date"]),
                "state": row["state"].strip(),
            }

            if not cleaned_row["state"]:
                raise ValueError("State name is empty")

            for column_name in NUMERIC_COLUMNS:
                cleaned_row[column_name] = parse_number(row[column_name], column_name)

            cleaned_row["source_row"] = index
            processed_rows.append(cleaned_row)
        except Exception as exc:
            raise ValueError(f"Failed to process row {index}: {exc}") from exc

    processed_rows.sort(key=lambda item: (item["date"], item["state"]))
    return processed_rows


def transform(processed_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    transformed_rows: list[dict[str, Any]] = []

    for row in processed_rows:
        income_mean = float(row["income_mean"])
        expenditure_mean = float(row["expenditure_mean"])
        income_median = float(row["income_median"])
        savings_mean = income_mean - expenditure_mean

        transformed_rows.append(
            {
                **row,
                "income_gap": income_mean - income_median,
                "savings_mean": savings_mean,
                "savings_rate": round(savings_mean / income_mean, 4) if income_mean else None,
                "expenditure_share": round(expenditure_mean / income_mean, 4) if income_mean else None,
                "income_to_expenditure_ratio": round(income_mean / expenditure_mean, 4)
                if expenditure_mean
                else None,
            }
        )

    return transformed_rows


def summarize(rows: list[dict[str, Any]]) -> dict[str, Any]:
    dates = sorted({row["date"] for row in rows})
    states = sorted({row["state"] for row in rows})

    by_date: dict[str, list[dict[str, Any]]] = defaultdict(list)
    by_state: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        by_date[row["date"]].append(row)
        by_state[row["state"]].append(row)

    date_summary = []
    for summary_date in dates:
        date_rows = by_date[summary_date]
        date_summary.append(
            {
                "date": summary_date,
                "records": len(date_rows),
                "avg_income_mean": round(mean(row["income_mean"] for row in date_rows), 2),
                "avg_expenditure_mean": round(mean(row["expenditure_mean"] for row in date_rows), 2),
                "avg_poverty": round(mean(row["poverty"] for row in date_rows), 2),
                "highest_income_state": max(date_rows, key=lambda row: row["income_mean"])["state"],
                "lowest_poverty_state": min(date_rows, key=lambda row: row["poverty"])["state"],
            }
        )

    state_summary = []
    for state_name in states:
        state_rows = by_state[state_name]
        state_summary.append(
            {
                "state": state_name,
                "records": len(state_rows),
                "avg_income_mean": round(mean(row["income_mean"] for row in state_rows), 2),
                "avg_income_median": round(mean(row["income_median"] for row in state_rows), 2),
                "avg_expenditure_mean": round(mean(row["expenditure_mean"] for row in state_rows), 2),
                "avg_gini": round(mean(row["gini"] for row in state_rows), 5),
                "avg_poverty": round(mean(row["poverty"] for row in state_rows), 2),
                "avg_savings_mean": round(mean(row["savings_mean"] for row in state_rows), 2),
            }
        )

    return {
        "source_rows": len(rows),
        "date_range": {"start": dates[0] if dates else None, "end": dates[-1] if dates else None},
        "state_count": len(states),
        "states": states,
        "date_summary": date_summary,
        "state_summary": state_summary,
    }


def write_csv(rows: list[dict[str, Any]], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = list(rows[0].keys()) if rows else []
    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def write_json(payload: dict[str, Any], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2, ensure_ascii=True)
        handle.write("\n")


def run_pipeline(source_path: Path, output_dir: Path) -> dict[str, Any]:
    paths = build_paths(source_path, output_dir)
    raw_rows = ingest(paths.source)
    cleaned_rows = process(raw_rows)
    transformed_rows = transform(cleaned_rows)
    summary = summarize(transformed_rows)

    write_csv(cleaned_rows, paths.cleaned_csv)
    write_csv(transformed_rows, paths.transformed_csv)
    write_json(summary, paths.summary_json)

    return {
        "input": str(paths.source),
        "output_dir": str(paths.output_dir),
        "cleaned_csv": str(paths.cleaned_csv),
        "transformed_csv": str(paths.transformed_csv),
        "summary_json": str(paths.summary_json),
        "records_ingested": len(raw_rows),
        "records_loaded": len(transformed_rows),
    }


def main() -> int:
    args = parse_args()
    result = run_pipeline(args.input, args.output_dir)

    print(json.dumps(result, indent=2, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

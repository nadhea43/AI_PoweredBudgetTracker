# Week 2: Finance Gap Detection AI Component

## Project Overview

This module now acts as the AI decision component for the budget tracker. It reads the processed HIES state dataset from `data/processed/`, compares the user's financial profile against state benchmarks, detects finance gaps, and returns a structured analysis payload for the frontend.

The component focuses on three tasks:

1. **Snapshot generation** - converts frontend form input into deductions, take-home pay, remaining cash, and benchmark comparisons.
2. **Finance gap detection** - identifies income, cash-flow, spending, and savings gaps relative to the selected state benchmark and savings goal.
3. **Action planning** - produces a financial health score, recommended budget split, ranked recommendations, and a short savings projection.

---

## Data Source

The AI component uses the processed HIES artifacts generated in `data/processed/`:

- `hies_state_summary.json`
- `hies_state_transformed.csv`
- `hies_state_cleaned.csv`

If these files are missing, run the ETL pipeline first:

```bash
python scripts/etl_pipeline.py
```

---

## Backend Endpoint

The main entry point is `main.py`, which starts a small HTTP server.

### Health check

```bash
GET /api/health
```

### Finance analysis

```bash
POST /api/analyze
```

Example payload:

```json
{
  "name": "John Doe",
  "state": "Penang",
  "gross_salary": 2800,
  "rent": 650,
  "study_loan": 200,
  "car_loan": 350,
  "phone_bill": 80,
  "food_spending": 500,
  "transport_spending": 200,
  "entertainment": 150,
  "savings_goal": 10000,
  "goal_months": 12
}
```

Example response shape:

```json
{
  "pipeline_stage": "finance_gap_detection",
  "pipeline_state": "high-risk",
  "snapshot": { "...": "..." },
  "finance_gaps": [
    {
      "type": "cashflow_gap",
      "severity": "high",
      "amount": 0,
      "message": "...",
      "driver": "total_commitments"
    }
  ],
  "plan": { "...": "..." }
}
```

---

## Running the component

From the repository root:

```bash
python backend/week_2/main.py
```

Optional port override:

```bash
BACKEND_PORT=8000 python backend/week_2/main.py
```

The frontend can then call the backend with `VITE_BACKEND_URL=http://localhost:8000`.

---

## What changed from the old project

This folder previously contained a job-skill gap pipeline. It now serves as the financial AI layer for this project and no longer depends on resume parsing or job database analysis.

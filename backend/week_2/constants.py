# This holds constant lookup maps and data structures without cluttering the business logic.

from pathlib import Path

try:
    PROJECT_ROOT = Path(__file__).resolve().parents[2]
except IndexError:
    PROJECT_ROOT = Path(__file__).resolve().parent

DATA_DIR = PROJECT_ROOT / "data" / "processed"
SUMMARY_PATH = DATA_DIR / "hies_state_summary.json"
EXPENDITURE_AGE_PATH = DATA_DIR / "expenditure_by_age.json"

STATE_ALIASES = {
    "penang":           "Pulau Pinang",
    "pulau pinang":     "Pulau Pinang",
    "kuala lumpur":     "W.P. Kuala Lumpur",
    "wp kuala lumpur":  "W.P. Kuala Lumpur",
    "w.p. kuala lumpur":"W.P. Kuala Lumpur",
    "labuan":           "W.P. Labuan",
    "w.p. labuan":      "W.P. Labuan",
    "putrajaya":        "W.P. Putrajaya",
    "w.p. putrajaya":   "W.P. Putrajaya",
}

CATEGORY_TO_BENCHMARK = {
    "food & drinks":                     "food_beverages",
    "groceries":                         "food_beverages",
    "transport / petrol":                "transport",
    "grab / taxi":                       "transport",
    "entertainment":                     "recreation_culture",
    "shopping / clothing":               "clothing_footwear",
    "gym / sports":                      "recreation_culture",
    "medical / pharmacy":                "health",
    "subscriptions (netflix etc.)":      "communication",
    "utilities (water/electricity/gas)": "housing_utilities",
    "wifi bill":                         "communication",
    "internet bill":                     "communication",
    "insurance":                         "insurance_finance",
}
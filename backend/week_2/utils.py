# This holds the generic data scrubbing and numerical processing helpers.

from typing import Any
from constants import STATE_ALIASES

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

def normalize_state_name(value: str | None) -> str:
    if not value:
        return "Selangor"
    cleaned = " ".join(value.strip().split())
    return STATE_ALIASES.get(cleaned.lower(), cleaned)

def sum_dynamic_list(items: list) -> float:
    return round_currency(sum(safe_float(item.get("amount")) for item in items))
"""Simple Gemini (Google Generative) client wrapper.

Updated to use the modern Google GenAI REST endpoint.
"""
from __future__ import annotations

import os
import json
from typing import Optional

import requests

API_URL_TEMPLATE = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


def _get_api_key() -> Optional[str]:
    return os.environ.get("GEMINI_API_KEY")  # ← fixed from GENAI_API_KEY


def generate_text(prompt: str, model: Optional[str] = None, temperature: float = 0.2, max_tokens: int = 512, json_mode: bool = False) -> str:
    """Generate text using a Gemini model via REST."""
    api_key = _get_api_key()
    model = model or os.environ.get("GEMINI_MODEL", "gemini-2.5-flash-lite")

    if not api_key:
        return f"[mock-gemini:{model}] Summarized: {prompt[:200]}" if prompt else "[mock-gemini] no prompt"

    url = API_URL_TEMPLATE.format(model=model)
    params = {"key": api_key}

    generation_config = {
        "temperature": temperature,
        "maxOutputTokens": max_tokens,
    }

    # Only force JSON mode when explicitly requested (e.g. build_plan)
    if json_mode:
        generation_config["responseMimeType"] = "application/json"

    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": generation_config,
    }

    resp = requests.post(url, params=params, json=body, timeout=20)
    resp.raise_for_status()
    data = resp.json()

    if not data:
        return ""

    if isinstance(data, dict):
        candidates = data.get("candidates")
        if candidates and isinstance(candidates, list) and len(candidates) > 0:
            content = candidates[0].get("content", {})
            parts = content.get("parts", [])
            if parts and isinstance(parts, list) and len(parts) > 0:
                return parts[0].get("text", "")

    return json.dumps(data, ensure_ascii=False)


__all__ = ["generate_text"]
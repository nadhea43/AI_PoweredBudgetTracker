"""Simple Gemini (Google Generative) client wrapper.

Updated to use the modern Google GenAI REST endpoint.
"""
from __future__ import annotations

import os
import json
from typing import Optional

import requests
# 1. ADD THIS IMPORT
from dotenv import load_dotenv 

# 2. CALL IT IMMEDIATELY HERE TO LOAD YOUR .ENV FILE
load_dotenv() 

API_URL_TEMPLATE = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


def _get_api_key() -> Optional[str]:
    return os.environ.get("GENAI_API_KEY")


def generate_text(prompt: str, model: Optional[str] = None, temperature: float = 0.2, max_tokens: int = 512) -> str:
    """Generate text using a Gemini model via REST."""
    api_key = _get_api_key()
    # model = model or os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

    # Option A: For gemini-2.5-flash-lite
    model = model or os.environ.get("GEMINI_MODEL", "gemini-2.5-flash-lite")

    # Option B: For gemini-3.0-flash-preview
    # model = model or os.environ.get("GEMINI_MODEL", "gemini-3.0-flash-preview")

    if not api_key:
        return f"[mock-gemini:{model}] Summarized: {prompt[:200]}" if prompt else "[mock-gemini] no prompt"

    url = API_URL_TEMPLATE.format(model=model)
    params = {"key": api_key}
    
    # FIXED: Modern Gemini models expect the prompt inside a 'contents' -> 'parts' -> 'text' structure
    body = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_tokens,
            "responseMimeType": "application/json",
        }
    }

    resp = requests.post(url, params=params, json=body, timeout=20)
    resp.raise_for_status()
    data = resp.json()

    if not data:
        return ""

    # FIXED: Modern Gemini response parsing structure
    if isinstance(data, dict):
        candidates = data.get("candidates")
        if candidates and isinstance(candidates, list) and len(candidates) > 0:
            first_candidate = candidates[0]
            content = first_candidate.get("content", {})
            parts = content.get("parts", [])
            if parts and isinstance(parts, list) and len(parts) > 0:
                return parts[0].get("text", "")

    return json.dumps(data, ensure_ascii=False)


__all__ = ["generate_text"]
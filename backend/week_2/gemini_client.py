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

    model = model or os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
    print(model)

    if not api_key:
        raise ValueError("GENAI_API_KEY is not set. Add it to backend/week_2/.env")

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

    print(f"[Gemini] Sending request to: {url}")
    print(f"[Gemini] Max tokens: {max_tokens}, Temperature: {temperature}")

    resp = requests.post(url, params=params, json=body, timeout=60)

    print(f"[Gemini] HTTP status: {resp.status_code}")

    if resp.status_code != 200:
        print(f"[Gemini] ERROR response body: {resp.text}")

    resp.raise_for_status()
    data = resp.json()

    print(f"[Gemini] Raw response keys: {list(data.keys()) if isinstance(data, dict) else type(data)}")

    if not data:
        print("[Gemini] Empty response received")
        return ""

    # FIXED: Modern Gemini response parsing structure
    if isinstance(data, dict):
        candidates = data.get("candidates")
        if candidates and isinstance(candidates, list) and len(candidates) > 0:
            first_candidate = candidates[0]
            finish_reason = first_candidate.get("finishReason", "unknown")
            print(f"[Gemini] Finish reason: {finish_reason}")
            content = first_candidate.get("content", {})
            parts = content.get("parts", [])
            if parts and isinstance(parts, list) and len(parts) > 0:
                text = parts[0].get("text", "")
                print(f"[Gemini] Response text (first 500 chars): {text[:500]}")
                print(f"[Gemini] Total response length: {len(text)} chars")
                return text
        else:
            print(f"[Gemini] No candidates in response. Full response: {json.dumps(data, indent=2)[:1000]}")

    return json.dumps(data, ensure_ascii=False)


__all__ = ["generate_text"]
"""
backend/src/lib/http_utils.py
Thin HTTP response helpers for Lambda / API Gateway HTTP API (payload format 2.0).
"""

from __future__ import annotations
import json
from typing import Any


def respond(status_code: int, data: Any) -> dict:
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(data, default=str),
    }


def respond_error(status_code: int, message: str, details: Any = None) -> dict:
    body: dict[str, Any] = {"error": message}
    if details is not None:
        body["details"] = details
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }


def parse_body(event: dict) -> dict:
    """Parse JSON body from an API Gateway HTTP API event."""
    import base64
    raw = event.get("body") or "{}"
    if event.get("isBase64Encoded"):
        raw = base64.b64decode(raw).decode("utf-8")
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, Exception):
        return {}

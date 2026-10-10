"""
backend/src/lib/validate.py
Input validation helpers for Lambda handlers.
Returns a list of error strings (empty = valid).
"""

from __future__ import annotations
import re
from typing import Any

SEVERITY_VALUES = {"low", "medium", "high", "critical"}
SITE_TYPE_VALUES = {"road", "footpath", "park", "residential", "commercial", "other"}
STATUS_VALUES = {"open", "in_progress", "resolved"}
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}

REPORT_ID_RE = re.compile(r"^rpt_[A-Za-z0-9_-]{6,36}$")
S3_KEY_PREFIX = "uploads/"


def validate_create_report(body: dict[str, Any]) -> list[str]:
    """Validate a POST /reports request body. Returns list of error messages."""
    errors: list[str] = []

    report_id = body.get("report_id") or body.get("reportId")
    if not report_id or not REPORT_ID_RE.match(str(report_id)):
        errors.append("report_id must match pattern rpt_<nanoid> (6-36 alphanum chars)")

    severity = body.get("severity")
    if severity not in SEVERITY_VALUES:
        errors.append(f"severity must be one of: {', '.join(sorted(SEVERITY_VALUES))}")

    site_type = body.get("site_type") or body.get("siteType")
    if site_type not in SITE_TYPE_VALUES:
        errors.append(f"site_type must be one of: {', '.join(sorted(SITE_TYPE_VALUES))}")

    try:
        lat = float(body.get("latitude", "NaN"))
        if not (-90 <= lat <= 90):
            raise ValueError
    except (TypeError, ValueError):
        errors.append("latitude must be a number between -90 and 90")

    try:
        lon = float(body.get("longitude", "NaN"))
        if not (-180 <= lon <= 180):
            raise ValueError
    except (TypeError, ValueError):
        errors.append("longitude must be a number between -180 and 180")

    description = body.get("description")
    if description is not None:
        if not isinstance(description, str) or len(description) > 500:
            errors.append("description must be a string of max 500 characters")

    image_key = body.get("image_key") or body.get("imageKey")
    if image_key is not None:
        if not isinstance(image_key, str) or not image_key.startswith(S3_KEY_PREFIX):
            errors.append("image_key must be a string starting with uploads/")

    return errors


def validate_update_status(body: dict[str, Any]) -> list[str]:
    """Validate a PATCH /reports/{id}/status request body."""
    errors: list[str] = []

    status = body.get("status")
    if status not in STATUS_VALUES:
        errors.append(f"status must be one of: {', '.join(sorted(STATUS_VALUES))}")

    verification_key = body.get("verification_image_key") or body.get("verificationImageKey")
    if verification_key is not None:
        if not isinstance(verification_key, str) or not verification_key.startswith(S3_KEY_PREFIX):
            errors.append("verification_image_key must be a string starting with uploads/")

    return errors


def validate_presign(body: dict[str, Any]) -> list[str]:
    """Validate a POST /uploads/presign request body."""
    errors: list[str] = []

    report_id = body.get("report_id") or body.get("reportId")
    if not report_id or not REPORT_ID_RE.match(str(report_id)):
        errors.append("report_id must match pattern rpt_<nanoid>")

    content_type = body.get("content_type") or body.get("contentType")
    if content_type not in ALLOWED_CONTENT_TYPES:
        errors.append(f"content_type must be one of: {', '.join(sorted(ALLOWED_CONTENT_TYPES))}")

    return errors

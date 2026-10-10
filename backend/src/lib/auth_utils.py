"""
backend/src/lib/auth_utils.py
Cognito JWT claims extraction, role-based access control, and status transition validation.
"""

from __future__ import annotations
import json
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

# Permitted forward transitions strictly enforced by the backend
PERMITTED_TRANSITIONS: dict[str, list[str]] = {
    "open": ["in_progress"],
    "in_progress": ["resolved"],
    "resolved": [],
}


def extract_auth_claims(event: dict[str, Any]) -> dict[str, Any]:
    """
    Extract JWT claims from API Gateway HTTP API v2 requestContext.
    In API Gateway HTTP API with JWT Authorizer, claims reside in:
    event['requestContext']['authorizer']['jwt']['claims']
    """
    request_context = event.get("requestContext") or {}
    authorizer = request_context.get("authorizer") or {}
    jwt = authorizer.get("jwt") or {}
    claims = jwt.get("claims") or {}
    return claims if isinstance(claims, dict) else {}


def get_user_groups(claims: dict[str, Any]) -> list[str]:
    """
    Extract Cognito groups from claims.
    Handles multiple serialization formats:
    - list: ['admin'] or ['user']
    - JSON string: '["admin"]'
    - comma/space separated: 'admin,user'
    """
    raw_groups = claims.get("cognito:groups") or claims.get("groups")
    if not raw_groups:
        return []

    if isinstance(raw_groups, list):
        return [str(g).strip() for g in raw_groups if str(g).strip()]

    if isinstance(raw_groups, str):
        raw_groups = raw_groups.strip()
        if raw_groups.startswith("[") and raw_groups.endswith("]"):
            try:
                parsed = json.loads(raw_groups)
                if isinstance(parsed, list):
                    return [str(g).strip() for g in parsed if str(g).strip()]
            except Exception:
                pass
        if "," in raw_groups:
            return [g.strip() for g in raw_groups.split(",") if g.strip()]
        return [g.strip() for g in raw_groups.split() if g.strip()]

    return []


def is_admin(claims: dict[str, Any]) -> bool:
    """Check if the authenticated user belongs to the 'admin' group."""
    groups = get_user_groups(claims)
    return "admin" in groups


def get_user_identifier(claims: dict[str, Any]) -> Optional[str]:
    """Return human-readable user identifier (username or email or sub)."""
    return (
        claims.get("cognito:username")
        or claims.get("username")
        or claims.get("email")
        or claims.get("sub")
    )


def validate_status_transition(current_status: str, target_status: str) -> tuple[bool, Optional[str]]:
    """
    Validate that the requested status change is a permitted forward transition:
    - open -> in_progress
    - in_progress -> resolved
    """
    allowed_next = PERMITTED_TRANSITIONS.get(current_status)
    if allowed_next is None:
        return False, f"Unknown current report status '{current_status}'"

    if target_status == current_status:
        return False, f"Report is already in '{current_status}' status"

    if target_status not in allowed_next:
        allowed_str = ", ".join(f"{current_status} -> {nxt}" for nxt in allowed_next) or "no further transitions permitted"
        return False, (
            f"Invalid transition from '{current_status}' to '{target_status}'. "
            f"Permitted forward transition(s): {allowed_str}."
        )

    return True, None

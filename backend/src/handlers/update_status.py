"""
backend/src/handlers/update_status.py
PATCH /reports/{id}/status — update cleanup workflow status.
Requires admin role and enforces permitted forward status transitions.
"""

import logging
from datetime import datetime, timezone

from botocore.exceptions import ClientError

from src.lib.http_utils import respond, respond_error, parse_body
from src.lib.validate import validate_update_status
from src.lib.dynamo_client import get_report, update_report_status
from src.lib.auth_utils import extract_auth_claims, is_admin, get_user_identifier, validate_status_transition

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def handler(event, context):
    try:
        # 1. Require valid authentication claims
        claims = extract_auth_claims(event)
        if not claims:
            return respond_error(401, "Unauthorized: Authentication token required")

        # 2. Enforce admin role strictly on the backend
        if not is_admin(claims):
            return respond_error(403, "Forbidden: Admin privileges required to update report status")

        # 3. Path parameter validation
        report_id = (event.get("pathParameters") or {}).get("id")
        if not report_id:
            return respond_error(400, "Missing report id in path")

        # 4. Body validation
        body = parse_body(event)
        errors = validate_update_status(body)
        if errors:
            return respond_error(400, "Validation failed", errors)

        target_status = body["status"]

        # 5. Fetch existing report to verify existence and check current status
        existing = get_report(report_id)
        if not existing:
            return respond_error(404, "Report not found")

        current_status = existing.get("status", "open")

        # 6. Enforce permitted forward transitions: open -> in_progress, in_progress -> resolved
        is_valid, transition_error = validate_status_transition(current_status, target_status)
        if not is_valid:
            return respond_error(400, transition_error)

        now = datetime.now(timezone.utc).isoformat()
        resolved_at = now if target_status == "resolved" else None
        verification_key = body.get("verification_image_key") or body.get("verificationImageKey")
        updated_by = get_user_identifier(claims)

        try:
            update_report_status(
                report_id=report_id,
                status=target_status,
                updated_at=now,
                resolved_at=resolved_at,
                verification_key=verification_key,
                updated_by=updated_by,
            )
        except ClientError as exc:
            code = exc.response["Error"]["Code"]
            if code == "ConditionalCheckFailedException":
                return respond_error(404, "Report not found")
            raise

        response_data = {
            "report_id":   report_id,
            "reportId":    report_id,
            "status":      target_status,
            "updated_at":  now,
            "updatedAt":   now,
            "resolved_at": resolved_at,
            "resolvedAt":  resolved_at,
        }
        if updated_by:
            response_data["updated_by"] = updated_by
            response_data["updatedBy"] = updated_by

        return respond(200, response_data)

    except Exception:
        logger.exception("updateStatus error")
        return respond_error(500, "Internal server error")


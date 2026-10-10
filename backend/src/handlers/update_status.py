"""
backend/src/handlers/update_status.py
PATCH /reports/{id}/status — update cleanup workflow status.
"""

import logging
from datetime import datetime, timezone

from botocore.exceptions import ClientError

from src.lib.http_utils import respond, respond_error, parse_body
from src.lib.validate import validate_update_status
from src.lib.dynamo_client import update_report_status

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def handler(event, context):
    try:
        report_id = (event.get("pathParameters") or {}).get("id")
        if not report_id:
            return respond_error(400, "Missing report id in path")

        body = parse_body(event)
        errors = validate_update_status(body)
        if errors:
            return respond_error(400, "Validation failed", errors)

        status = body["status"]
        now    = datetime.now(timezone.utc).isoformat()

        resolved_at      = now if status == "resolved" else None
        verification_key = body.get("verification_image_key") or body.get("verificationImageKey")

        try:
            update_report_status(
                report_id=report_id,
                status=status,
                updated_at=now,
                resolved_at=resolved_at,
                verification_key=verification_key,
            )
        except ClientError as exc:
            code = exc.response["Error"]["Code"]
            if code == "ConditionalCheckFailedException":
                return respond_error(404, "Report not found")
            raise

        return respond(200, {
            "report_id":   report_id,
            "reportId":    report_id,
            "status":      status,
            "updated_at":  now,
            "updatedAt":   now,
            "resolved_at": resolved_at,
            "resolvedAt":  resolved_at,
        })

    except Exception:
        logger.exception("updateStatus error")
        return respond_error(500, "Internal server error")

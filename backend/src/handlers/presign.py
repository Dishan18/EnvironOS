"""
backend/src/handlers/presign.py
POST /uploads/presign — generate presigned S3 POST for direct browser upload.
"""

import logging

from src.lib.http_utils import respond, respond_error, parse_body
from src.lib.validate import validate_presign
from src.lib.s3_client import generate_presigned_post
from src.lib.auth_utils import extract_auth_claims

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def handler(event, context):
    try:
        # Require authenticated user
        claims = extract_auth_claims(event)
        if not claims:
            return respond_error(401, "Unauthorized: Authentication token required")

        body   = parse_body(event)
        errors = validate_presign(body)
        if errors:
            return respond_error(400, "Validation failed", errors)

        report_id    = body.get("report_id") or body.get("reportId")
        content_type = body.get("content_type") or body.get("contentType")

        result = generate_presigned_post(report_id, content_type)
        return respond(200, result)

    except ValueError as exc:
        return respond_error(400, str(exc))
    except Exception:
        logger.exception("presign error")
        return respond_error(500, "Internal server error")

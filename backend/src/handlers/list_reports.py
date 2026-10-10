"""
backend/src/handlers/list_reports.py
GET /reports — list reports with optional filters and pagination.
"""

import json
import logging
import base64

from src.lib.http_utils import respond, respond_error
from src.lib.dynamo_client import list_reports
from src.lib.s3_client import generate_presigned_get

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def handler(event, context):
    try:
        q = event.get("queryStringParameters") or {}

        status       = q.get("status")
        min_priority = int(q["minPriority"]) if q.get("minPriority") else None
        limit        = int(q.get("limit", 50))
        include_demo = q.get("demo", "true").lower() != "false"

        start_key = None
        if q.get("nextToken"):
            try:
                start_key = json.loads(base64.b64decode(q["nextToken"]).decode("utf-8"))
            except Exception:
                return respond_error(400, "Invalid nextToken")

        result = list_reports(
            status=status,
            min_priority=min_priority,
            limit=limit,
            start_key=start_key,
            include_demo=include_demo,
        )

        # Attach short-lived presigned GET URLs for stored images
        enriched = []
        for r in result["items"]:
            r = dict(r)  # don't mutate the original
            img_url = generate_presigned_get(r.get("image_key") or r.get("imageKey"))
            ver_url = generate_presigned_get(r.get("verification_key") or r.get("verificationKey"))
            r["image_url"] = img_url
            r["imageUrl"] = img_url
            r["verification_url"] = ver_url
            r["verificationUrl"] = ver_url
            enriched.append(r)

        next_token = None
        if result.get("last_key"):
            next_token = base64.b64encode(
                json.dumps(result["last_key"]).encode("utf-8")
            ).decode("utf-8")

        return respond(200, {
            "items":      enriched,
            "next_token": next_token,
            "nextToken":  next_token,
            "count":      len(enriched),
        })

    except Exception as exc:
        logger.exception("listReports error")
        return respond_error(500, "Internal server error")

"""
backend/src/handlers/create_report.py
POST /reports — validate, score, persist a new drain-blockage report.
"""

import logging
import json
from datetime import datetime, timezone

from nanoid import generate as nanoid_generate

from src.lib.http_utils import respond, respond_error, parse_body
from src.lib.validate import validate_create_report
from src.lib.risk_score import calculate_risk_score
from src.lib.weather import fetch_rainfall_mm
from src.lib.dynamo_client import put_report

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def handler(event, context):
    try:
        body = parse_body(event)
        errors = validate_create_report(body)
        if errors:
            return respond_error(400, "Validation failed", errors)

        # Normalise field names (accept both snake_case and camelCase)
        report_id = body.get("report_id") or body.get("reportId")
        severity  = body["severity"]
        site_type = body.get("site_type") or body.get("siteType")
        latitude  = float(body["latitude"])
        longitude = float(body["longitude"])
        description = body.get("description")
        image_key   = body.get("image_key") or body.get("imageKey")
        is_demo     = bool(body.get("is_demo") or body.get("isDemo", False))

        # Optional: fetch live rainfall (falls back to None → default score)
        rainfall_mm, rainfall_source = fetch_rainfall_mm(latitude, longitude)

        # Server-side risk scoring — never trust the frontend
        risk = calculate_risk_score(
            severity=severity,
            site_type=site_type,
            rainfall_mm=rainfall_mm,
            rainfall_source=rainfall_source,
        )

        now = datetime.now(timezone.utc).isoformat()

        item = {
            "report_id":            report_id,
            "reportId":             report_id,
            "status":               "open",
            "severity":             severity,
            "site_type":            site_type,
            "siteType":             site_type,
            "latitude":             str(latitude),   # DynamoDB stores as Decimal-safe string
            "longitude":            str(longitude),
            "description":          description,
            "image_key":            image_key,
            "imageKey":             image_key,
            "verification_key":     None,
            "risk_score":           risk.risk_score,
            "priorityScore":        risk.risk_score,
            "priority":             risk.priority,
            "severity_component":   str(risk.severity_component),
            "rainfall_component":   str(risk.rainfall_component),
            "site_component":       str(risk.site_component),
            "rainfall_mm_forecast": str(rainfall_mm) if rainfall_mm is not None else None,
            "rainfall_source":      risk.rainfall_source,
            "risk_explanation":     risk.explanation,
            "is_demo":              is_demo,
            "isDemo":               is_demo,
            "created_at":           now,
            "createdAt":            now,
            "updated_at":           now,
            "updatedAt":            now,
            "resolved_at":          None,
        }

        # Strip None values (DynamoDB rejects explicit None for non-key attributes)
        item = {k: v for k, v in item.items() if v is not None}

        put_report(item)
        logger.info("Created report %s score=%d priority=%s", report_id, risk.risk_score, risk.priority)

        return respond(201, {
            "report_id":       report_id,
            "reportId":        report_id,
            "risk_score":      risk.risk_score,
            "priorityScore":   risk.risk_score,
            "priority":        risk.priority,
            "status":          "open",
            "explanation":     risk.explanation,
            "rainfall_source": risk.rainfall_source,
        })

    except Exception as exc:
        logger.exception("createReport error")
        return respond_error(500, "Internal server error")

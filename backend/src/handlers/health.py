"""
backend/src/handlers/health.py
GET /health — liveness probe.
"""

from src.lib.http_utils import respond


def handler(event, context):
    return respond(200, {
        "status": "ok",
        "timestamp": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "version": "2.0.0",
        "runtime": "python",
    })

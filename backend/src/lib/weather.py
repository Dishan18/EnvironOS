"""
backend/src/lib/weather.py
Optional Open-Meteo integration.
Fetches the 24-hour precipitation sum for a given lat/lon.
No API key required. Falls back gracefully on timeout or error.
"""

from __future__ import annotations
import logging
from typing import Optional

try:
    import requests as _requests
    _REQUESTS_AVAILABLE = True
except ImportError:
    _REQUESTS_AVAILABLE = False

logger = logging.getLogger(__name__)

BASE_URL = "https://api.open-meteo.com/v1/forecast"
TIMEOUT_S = 3


def fetch_rainfall_mm(latitude: float, longitude: float) -> tuple[Optional[float], str]:
    """
    Fetch 24-hour rainfall forecast (mm) for a location from Open-Meteo.

    Returns:
        (mm_value, source_label)
        mm_value is None on failure → caller should use default rainfall score.
        source_label is "open_meteo" on success, "default" on failure.
    """
    if not _REQUESTS_AVAILABLE:
        logger.warning("requests library not installed; skipping weather fetch")
        return None, "default"

    try:
        url = (
            f"{BASE_URL}?latitude={latitude}&longitude={longitude}"
            f"&daily=precipitation_sum&forecast_days=1&timezone=auto"
        )
        resp = _requests.get(url, timeout=TIMEOUT_S)
        resp.raise_for_status()
        data = resp.json()
        mm = data.get("daily", {}).get("precipitation_sum", [None])[0]
        if isinstance(mm, (int, float)):
            return float(mm), "open_meteo"
        return None, "default"
    except Exception as exc:  # timeout, network error, parse error
        logger.warning("Open-Meteo fetch failed: %s", exc)
        return None, "default"

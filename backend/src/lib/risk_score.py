"""
backend/src/lib/risk_score.py
Canonical risk-score calculation for DrainGuard.

Score formula (new Phase 2 weighted):
    score = clamp(0.45 * severity_score
                + 0.35 * rainfall_score
                + 0.20 * site_exposure_score, 0, 100)

Each component is already expressed on a 0-100 scale before weighting.

This is a preventive maintenance triage heuristic.
It does NOT predict flooding.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Optional

# ── Component mappings ────────────────────────────────────────────────────────

_SEVERITY_MAP: dict[str, float] = {
    "low": 25.0,
    "medium": 50.0,
    "high": 75.0,
    "critical": 100.0,
}

_SITE_EXPOSURE_MAP: dict[str, float] = {
    "road": 100.0,
    "footpath": 80.0,
    "residential": 80.0,
    "commercial": 60.0,
    "park": 40.0,
    "other": 40.0,
}

# Rainfall thresholds → 0-100 score
# Based on 24-hour precipitation forecast (mm)
_RAINFALL_DEFAULT = 40.0   # Used when weather data is unavailable


def _rainfall_score(rainfall_mm: Optional[float]) -> tuple[float, str]:
    """Map 24-h rainfall (mm) to a 0-100 score and a short explanation."""
    if rainfall_mm is None:
        return _RAINFALL_DEFAULT, "default (weather data unavailable)"
    if rainfall_mm >= 30:
        return 100.0, f"{rainfall_mm:.1f} mm forecast — heavy rain"
    if rainfall_mm >= 15:
        return 70.0, f"{rainfall_mm:.1f} mm forecast — moderate rain"
    if rainfall_mm >= 5:
        return 40.0, f"{rainfall_mm:.1f} mm forecast — light rain"
    if rainfall_mm > 0:
        return 15.0, f"{rainfall_mm:.1f} mm forecast — trace rain"
    return 0.0, "0 mm forecast — dry"


# ── Priority label ────────────────────────────────────────────────────────────

def _priority_label(score: float) -> str:
    if score >= 75:
        return "critical"
    if score >= 50:
        return "high"
    if score >= 25:
        return "moderate"
    return "low"


# ── Public interface ──────────────────────────────────────────────────────────

@dataclass
class RiskResult:
    risk_score: int                  # 0-100, integer
    priority: str                    # critical / high / moderate / low
    severity_component: float        # weighted contribution
    rainfall_component: float        # weighted contribution
    site_component: float            # weighted contribution
    rainfall_mm_forecast: Optional[float]
    rainfall_source: str             # "open_meteo" | "default"
    explanation: str


def calculate_risk_score(
    severity: str,
    site_type: str,
    rainfall_mm: Optional[float] = None,
    rainfall_source: str = "default",
) -> RiskResult:
    """
    Calculate the DrainGuard priority risk score.

    Args:
        severity:        "low" | "medium" | "high" | "critical"
        site_type:       "road" | "footpath" | "park" | "residential" |
                         "commercial" | "other"
        rainfall_mm:     24-h forecast precipitation in mm, or None.
        rainfall_source: "open_meteo" if fetched live, else "default".

    Returns:
        RiskResult dataclass with score, priority label and component breakdown.
    """
    sev_raw = _SEVERITY_MAP.get(severity, 25.0)
    site_raw = _SITE_EXPOSURE_MAP.get(site_type, 40.0)
    rain_raw, rain_desc = _rainfall_score(rainfall_mm)

    sev_component  = 0.45 * sev_raw
    rain_component = 0.35 * rain_raw
    site_component = 0.20 * site_raw

    raw_score = sev_component + rain_component + site_component
    clamped   = max(0.0, min(100.0, raw_score))
    score_int = round(clamped)
    priority  = _priority_label(clamped)

    explanation = (
        f"Severity '{severity}' ({sev_raw:.0f}/100) × 0.45 = {sev_component:.1f}; "
        f"Rainfall {rain_desc} ({rain_raw:.0f}/100) × 0.35 = {rain_component:.1f}; "
        f"Site '{site_type}' ({site_raw:.0f}/100) × 0.20 = {site_component:.1f}. "
        f"Total = {score_int}/100 → {priority}."
    )

    return RiskResult(
        risk_score=score_int,
        priority=priority,
        severity_component=round(sev_component, 2),
        rainfall_component=round(rain_component, 2),
        site_component=round(site_component, 2),
        rainfall_mm_forecast=rainfall_mm,
        rainfall_source=rainfall_source,
        explanation=explanation,
    )

"""
tests/python/test_risk_score.py
Unit tests for the canonical DrainGuard risk-score calculation.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend"))

import pytest
from src.lib.risk_score import calculate_risk_score, _priority_label


class TestRiskScore:

    # ── Severity component ────────────────────────────────────────────────
    def test_critical_severity_component(self):
        r = calculate_risk_score("critical", "park", rainfall_mm=0)
        # critical=100 * 0.45 = 45
        assert r.severity_component == 45.0

    def test_low_severity_component(self):
        r = calculate_risk_score("low", "park", rainfall_mm=0)
        # low=25 * 0.45 = 11.25
        assert r.severity_component == 11.25

    # ── Rainfall component ────────────────────────────────────────────────
    def test_heavy_rain_component(self):
        r = calculate_risk_score("low", "park", rainfall_mm=45.0)
        # 100 * 0.35 = 35
        assert r.rainfall_component == 35.0

    def test_dry_rain_component(self):
        r = calculate_risk_score("low", "park", rainfall_mm=0)
        # 0 * 0.35 = 0
        assert r.rainfall_component == 0.0

    def test_null_rain_uses_default(self):
        r = calculate_risk_score("low", "park", rainfall_mm=None)
        # default=40 * 0.35 = 14
        assert r.rainfall_component == 14.0
        assert r.rainfall_source == "default"

    # ── Site component ────────────────────────────────────────────────────
    def test_road_site_component(self):
        r = calculate_risk_score("low", "road", rainfall_mm=0)
        # 100 * 0.20 = 20
        assert r.site_component == 20.0

    def test_park_site_component(self):
        r = calculate_risk_score("low", "park", rainfall_mm=0)
        # 40 * 0.20 = 8
        assert r.site_component == 8.0

    # ── Max score ─────────────────────────────────────────────────────────
    def test_max_score_critical_road_heavy_rain(self):
        r = calculate_risk_score("critical", "road", rainfall_mm=50.0)
        # 45 + 35 + 20 = 100
        assert r.risk_score == 100
        assert r.priority == "critical"

    def test_score_capped_at_100(self):
        r = calculate_risk_score("critical", "road", rainfall_mm=999.0)
        assert r.risk_score <= 100

    # ── Priority labels ───────────────────────────────────────────────────
    def test_priority_critical(self):
        assert _priority_label(75) == "critical"
        assert _priority_label(100) == "critical"

    def test_priority_high(self):
        assert _priority_label(50) == "high"
        assert _priority_label(74) == "high"

    def test_priority_moderate(self):
        assert _priority_label(25) == "moderate"
        assert _priority_label(49) == "moderate"

    def test_priority_low(self):
        assert _priority_label(0) == "low"
        assert _priority_label(24) == "low"

    # ── Return shape ─────────────────────────────────────────────────────
    def test_result_has_all_fields(self):
        r = calculate_risk_score("medium", "footpath", rainfall_mm=10.0)
        assert isinstance(r.risk_score, int)
        assert isinstance(r.priority, str)
        assert isinstance(r.severity_component, float)
        assert isinstance(r.rainfall_component, float)
        assert isinstance(r.site_component, float)
        assert isinstance(r.explanation, str)
        assert r.rainfall_mm_forecast == 10.0

    def test_explanation_is_human_readable(self):
        r = calculate_risk_score("high", "road", rainfall_mm=20.0)
        assert "high" in r.explanation
        assert "road" in r.explanation
        assert "/" in r.explanation  # score/100 format

    # ── Unknown values fall back gracefully ───────────────────────────────
    def test_unknown_severity_uses_fallback(self):
        r = calculate_risk_score("extreme", "road", rainfall_mm=0)
        assert 0 <= r.risk_score <= 100

    def test_unknown_site_type_uses_fallback(self):
        r = calculate_risk_score("high", "river", rainfall_mm=0)
        assert 0 <= r.risk_score <= 100

    # ── Boundary rainfall bands ───────────────────────────────────────────
    def test_rainfall_band_trace(self):
        r = calculate_risk_score("low", "park", rainfall_mm=0.5)
        # 15 * 0.35 = 5.25
        assert r.rainfall_component == pytest.approx(5.25, abs=0.01)

    def test_rainfall_band_light(self):
        r = calculate_risk_score("low", "park", rainfall_mm=5.0)
        # 40 * 0.35 = 14
        assert r.rainfall_component == pytest.approx(14.0, abs=0.01)

    def test_rainfall_band_moderate(self):
        r = calculate_risk_score("low", "park", rainfall_mm=15.0)
        # 70 * 0.35 = 24.5
        assert r.rainfall_component == pytest.approx(24.5, abs=0.01)

    def test_rainfall_band_heavy(self):
        r = calculate_risk_score("low", "park", rainfall_mm=30.0)
        # 100 * 0.35 = 35
        assert r.rainfall_component == pytest.approx(35.0, abs=0.01)

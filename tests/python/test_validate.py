"""
tests/python/test_validate.py
Unit tests for Python input validation helpers.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend"))

from src.lib.validate import (
    validate_create_report,
    validate_update_status,
    validate_presign,
)


VALID_CREATE = {
    "report_id": "rpt_abc123def",
    "severity": "high",
    "site_type": "road",
    "latitude": 12.97,
    "longitude": 77.59,
}


class TestValidateCreateReport:

    def test_accepts_valid_minimal_body(self):
        assert validate_create_report(VALID_CREATE) == []

    def test_accepts_camelcase_fields(self):
        body = {
            "reportId": "rpt_abc123def",
            "severity": "high",
            "siteType": "road",
            "latitude": 12.97,
            "longitude": 77.59,
        }
        assert validate_create_report(body) == []

    def test_rejects_missing_report_id(self):
        body = {**VALID_CREATE, "report_id": None}
        errs = validate_create_report(body)
        assert any("report_id" in e for e in errs)

    def test_rejects_bad_report_id_prefix(self):
        body = {**VALID_CREATE, "report_id": "bad_id"}
        errs = validate_create_report(body)
        assert any("report_id" in e for e in errs)

    def test_rejects_unknown_severity(self):
        errs = validate_create_report({**VALID_CREATE, "severity": "extreme"})
        assert any("severity" in e for e in errs)

    def test_rejects_unknown_site_type(self):
        errs = validate_create_report({**VALID_CREATE, "site_type": "river"})
        assert any("site_type" in e for e in errs)

    def test_rejects_latitude_out_of_range(self):
        errs = validate_create_report({**VALID_CREATE, "latitude": 91})
        assert any("latitude" in e for e in errs)

    def test_rejects_longitude_out_of_range(self):
        errs = validate_create_report({**VALID_CREATE, "longitude": -200})
        assert any("longitude" in e for e in errs)

    def test_rejects_latitude_not_a_number(self):
        errs = validate_create_report({**VALID_CREATE, "latitude": "not-a-number"})
        assert any("latitude" in e for e in errs)

    def test_rejects_description_too_long(self):
        errs = validate_create_report({**VALID_CREATE, "description": "x" * 501})
        assert any("description" in e for e in errs)

    def test_accepts_description_at_limit(self):
        errs = validate_create_report({**VALID_CREATE, "description": "x" * 500})
        assert errs == []

    def test_rejects_bad_image_key_prefix(self):
        errs = validate_create_report({**VALID_CREATE, "image_key": "secret/file.jpg"})
        assert any("image_key" in e for e in errs)

    def test_accepts_valid_image_key(self):
        errs = validate_create_report({**VALID_CREATE, "image_key": "uploads/rpt_abc123def/photo.jpg"})
        assert errs == []

    def test_missing_severity_returns_error(self):
        body = {k: v for k, v in VALID_CREATE.items() if k != "severity"}
        errs = validate_create_report(body)
        assert any("severity" in e for e in errs)

    def test_multiple_errors_returned(self):
        errs = validate_create_report({
            "report_id": "bad",
            "severity": "unknown",
            "site_type": "unknown",
            "latitude": 999,
            "longitude": 999,
        })
        assert len(errs) >= 4


class TestValidateUpdateStatus:

    def test_accepts_valid_open(self):
        assert validate_update_status({"status": "open"}) == []

    def test_accepts_in_progress(self):
        assert validate_update_status({"status": "in_progress"}) == []

    def test_accepts_resolved_with_verification_key(self):
        errs = validate_update_status({
            "status": "resolved",
            "verification_image_key": "uploads/rpt_abc/verify.jpg",
        })
        assert errs == []

    def test_rejects_unknown_status(self):
        errs = validate_update_status({"status": "done"})
        assert any("status" in e for e in errs)

    def test_rejects_bad_verification_key(self):
        errs = validate_update_status({
            "status": "resolved",
            "verification_image_key": "private/file.jpg",
        })
        assert any("verification" in e for e in errs)


class TestValidatePresign:

    def test_accepts_valid_jpeg(self):
        assert validate_presign({"report_id": "rpt_abc123", "content_type": "image/jpeg"}) == []

    def test_accepts_png(self):
        assert validate_presign({"report_id": "rpt_abc123", "content_type": "image/png"}) == []

    def test_accepts_camelcase(self):
        assert validate_presign({"reportId": "rpt_abc123", "contentType": "image/webp"}) == []

    def test_rejects_pdf(self):
        errs = validate_presign({"report_id": "rpt_abc123", "content_type": "application/pdf"})
        assert any("content_type" in e for e in errs)

    def test_rejects_invalid_report_id(self):
        errs = validate_presign({"report_id": "bad", "content_type": "image/jpeg"})
        assert any("report_id" in e for e in errs)

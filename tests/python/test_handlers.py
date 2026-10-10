"""
tests/python/test_handlers.py
Handler tests using moto for mocked AWS services.
Tests POST /reports, GET /reports, PATCH status and handler shapes.
"""
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend"))

import pytest
import boto3
from moto import mock_aws
from unittest.mock import patch

# ── Fixtures ──────────────────────────────────────────────────────────────────

TABLE_NAME = "DrainGuardReports"
BUCKET_NAME = "drainguard-uploads-test"

@pytest.fixture(autouse=True)
def aws_credentials():
    """Fake AWS credentials so moto doesn't try real calls."""
    os.environ["AWS_ACCESS_KEY_ID"]     = "testing"
    os.environ["AWS_SECRET_ACCESS_KEY"] = "testing"
    os.environ["AWS_SECURITY_TOKEN"]    = "testing"
    os.environ["AWS_SESSION_TOKEN"]     = "testing"
    os.environ["AWS_DEFAULT_REGION"]    = "us-east-1"
    os.environ["REPORTS_TABLE"]         = TABLE_NAME
    os.environ["UPLOADS_BUCKET"]        = BUCKET_NAME
    os.environ["AWS_REGION"]            = "us-east-1"


@pytest.fixture
def dynamo_table(aws_credentials):
    with mock_aws():
        ddb = boto3.resource("dynamodb", region_name="us-east-1")
        table = ddb.create_table(
            TableName=TABLE_NAME,
            KeySchema=[{"AttributeName": "report_id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "report_id", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST",
        )
        table.wait_until_exists()

        # Patch module-level table reference so handlers use our mocked table
        import src.lib.dynamo_client as dc
        dc._table = table
        dc._dynamodb = ddb

        yield table

        # Cleanup
        dc._dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        dc._table = dc._dynamodb.Table(TABLE_NAME)


def _make_event(method="POST", body=None, path_params=None, query_params=None):
    return {
        "requestContext": {"http": {"method": method}},
        "pathParameters": path_params or {},
        "queryStringParameters": query_params or {},
        "body": json.dumps(body) if body else None,
        "isBase64Encoded": False,
    }


VALID_REPORT_BODY = {
    "report_id": "rpt_testXYZ99",
    "severity":  "high",
    "site_type": "road",
    "latitude":  12.97,
    "longitude": 77.59,
    "description": "Blocked drain near bus stop",
}

# ── Health handler ────────────────────────────────────────────────────────────

class TestHealthHandler:
    def test_returns_200(self):
        from src.handlers.health import handler
        resp = handler({}, None)
        assert resp["statusCode"] == 200

    def test_body_has_ok_status(self):
        from src.handlers.health import handler
        body = json.loads(handler({}, None)["body"])
        assert body["status"] == "ok"
        assert body["runtime"] == "python"

# ── Create report handler ─────────────────────────────────────────────────────

class TestCreateReportHandler:

    def test_creates_report_returns_201(self, dynamo_table):
        from src.handlers.create_report import handler
        with patch("src.lib.weather.fetch_rainfall_mm", return_value=(15.0, "open_meteo")):
            resp = handler(_make_event(body=VALID_REPORT_BODY), None)
        assert resp["statusCode"] == 201

    def test_response_contains_risk_score(self, dynamo_table):
        from src.handlers.create_report import handler
        with patch("src.lib.weather.fetch_rainfall_mm", return_value=(None, "default")):
            body = json.loads(handler(_make_event(body=VALID_REPORT_BODY), None)["body"])
        assert "risk_score" in body
        assert isinstance(body["risk_score"], int)
        assert 0 <= body["risk_score"] <= 100

    def test_response_contains_priority(self, dynamo_table):
        from src.handlers.create_report import handler
        with patch("src.lib.weather.fetch_rainfall_mm", return_value=(None, "default")):
            body = json.loads(handler(_make_event(body=VALID_REPORT_BODY), None)["body"])
        assert body["priority"] in {"critical", "high", "moderate", "low"}

    def test_report_persisted_in_dynamo(self, dynamo_table):
        from src.handlers.create_report import handler
        with patch("src.lib.weather.fetch_rainfall_mm", return_value=(None, "default")):
            handler(_make_event(body=VALID_REPORT_BODY), None)
        item = dynamo_table.get_item(Key={"report_id": "rpt_testXYZ99"}).get("Item")
        assert item is not None
        assert item["severity"] == "high"
        assert item["status"] == "open"

    def test_persisted_item_has_timestamps(self, dynamo_table):
        from src.handlers.create_report import handler
        with patch("src.lib.weather.fetch_rainfall_mm", return_value=(None, "default")):
            handler(_make_event(body=VALID_REPORT_BODY), None)
        item = dynamo_table.get_item(Key={"report_id": "rpt_testXYZ99"}).get("Item")
        assert "created_at" in item
        assert "updated_at" in item

    def test_rejects_missing_severity_400(self, dynamo_table):
        from src.handlers.create_report import handler
        bad = {**VALID_REPORT_BODY, "severity": None}
        resp = handler(_make_event(body=bad), None)
        assert resp["statusCode"] == 400

    def test_rejects_invalid_latitude_400(self, dynamo_table):
        from src.handlers.create_report import handler
        bad = {**VALID_REPORT_BODY, "latitude": 200}
        resp = handler(_make_event(body=bad), None)
        assert resp["statusCode"] == 400

    def test_risk_not_trusted_from_client(self, dynamo_table):
        """Score must be server-calculated, not taken from the request body."""
        from src.handlers.create_report import handler
        body_with_score = {**VALID_REPORT_BODY, "risk_score": 0}
        with patch("src.lib.weather.fetch_rainfall_mm", return_value=(None, "default")):
            resp = json.loads(handler(_make_event(body=body_with_score), None)["body"])
        # Server should calculate its own score, not honour the 0 from client
        assert resp.get("risk_score", 1) > 0  # real score for high+road is > 0

    def test_rainfall_source_in_response(self, dynamo_table):
        from src.handlers.create_report import handler
        with patch("src.lib.weather.fetch_rainfall_mm", return_value=(20.0, "open_meteo")):
            body = json.loads(handler(_make_event(body=VALID_REPORT_BODY), None)["body"])
        assert body["rainfall_source"] == "open_meteo"


# ── List reports handler ──────────────────────────────────────────────────────

class TestListReportsHandler:

    def _create_test_report(self, dynamo_table, report_id="rpt_listtest1", status="open"):
        dynamo_table.put_item(Item={
            "report_id": report_id,
            "status": status,
            "severity": "medium",
            "site_type": "footpath",
            "latitude": "12.97",
            "longitude": "77.59",
            "risk_score": 55,
            "priority": "high",
            "is_demo": False,
            "created_at": "2026-10-10T10:00:00+00:00",
            "updated_at": "2026-10-10T10:00:00+00:00",
        })

    def test_returns_200(self, dynamo_table):
        from src.handlers.list_reports import handler
        with patch("src.lib.s3_client.generate_presigned_get", return_value=None):
            resp = handler(_make_event(method="GET"), None)
        assert resp["statusCode"] == 200

    def test_empty_table_returns_empty_list(self, dynamo_table):
        from src.handlers.list_reports import handler
        with patch("src.lib.s3_client.generate_presigned_get", return_value=None):
            body = json.loads(handler(_make_event(method="GET"), None)["body"])
        assert body["items"] == []
        assert body["count"] == 0

    def test_created_report_appears_in_list(self, dynamo_table):
        from src.handlers.create_report import handler as create_handler
        from src.handlers.list_reports import handler as list_handler
        with patch("src.lib.weather.fetch_rainfall_mm", return_value=(None, "default")):
            create_handler(_make_event(body=VALID_REPORT_BODY), None)
        with patch("src.lib.s3_client.generate_presigned_get", return_value=None):
            body = json.loads(list_handler(_make_event(method="GET"), None)["body"])
        assert body["count"] == 1
        assert body["items"][0]["report_id"] == "rpt_testXYZ99"

    def test_filter_by_status(self, dynamo_table):
        from src.handlers.list_reports import handler
        self._create_test_report(dynamo_table, "rpt_open1", "open")
        self._create_test_report(dynamo_table, "rpt_resolved1", "resolved")
        with patch("src.lib.s3_client.generate_presigned_get", return_value=None):
            body = json.loads(
                handler(_make_event(method="GET", query_params={"status": "open"}), None)["body"]
            )
        assert all(item["status"] == "open" for item in body["items"])

    def test_response_shape(self, dynamo_table):
        from src.handlers.list_reports import handler
        with patch("src.lib.s3_client.generate_presigned_get", return_value=None):
            body = json.loads(handler(_make_event(method="GET"), None)["body"])
        assert "items" in body
        assert "count" in body
        assert "next_token" in body


# ── Update status handler ─────────────────────────────────────────────────────

class TestUpdateStatusHandler:

    def _seed_report(self, dynamo_table):
        dynamo_table.put_item(Item={
            "report_id": "rpt_status001",
            "status": "open",
            "severity": "high",
            "site_type": "road",
            "risk_score": 80,
            "priority": "critical",
            "created_at": "2026-10-10T10:00:00+00:00",
            "updated_at": "2026-10-10T10:00:00+00:00",
        })

    def test_update_to_in_progress(self, dynamo_table):
        from src.handlers.update_status import handler
        self._seed_report(dynamo_table)
        event = _make_event(
            method="PATCH",
            body={"status": "in_progress"},
            path_params={"id": "rpt_status001"},
        )
        resp = handler(event, None)
        assert resp["statusCode"] == 200

    def test_update_to_resolved_sets_resolved_at(self, dynamo_table):
        from src.handlers.update_status import handler
        self._seed_report(dynamo_table)
        event = _make_event(
            method="PATCH",
            body={"status": "resolved"},
            path_params={"id": "rpt_status001"},
        )
        body = json.loads(handler(event, None)["body"])
        assert body["resolved_at"] is not None

    def test_missing_report_returns_404(self, dynamo_table):
        from src.handlers.update_status import handler
        event = _make_event(
            method="PATCH",
            body={"status": "resolved"},
            path_params={"id": "rpt_doesnotexist"},
        )
        resp = handler(event, None)
        assert resp["statusCode"] == 404

    def test_invalid_status_returns_400(self, dynamo_table):
        from src.handlers.update_status import handler
        self._seed_report(dynamo_table)
        event = _make_event(
            method="PATCH",
            body={"status": "deleted"},
            path_params={"id": "rpt_status001"},
        )
        resp = handler(event, None)
        assert resp["statusCode"] == 400

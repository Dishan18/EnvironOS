"""
backend/src/lib/dynamo_client.py
DynamoDB boto3 client + helper utilities for DrainGuard.
"""

from __future__ import annotations
import os
import boto3
from boto3.dynamodb.conditions import Key, Attr
from botocore.exceptions import ClientError
from typing import Any, Optional

TABLE_NAME = os.environ.get("REPORTS_TABLE", "DrainGuardReports")
REGION = os.environ.get("AWS_REGION", "us-east-1")

# Module-level resource — re-used across warm Lambda invocations
_dynamodb = boto3.resource("dynamodb", region_name=REGION)
_table = _dynamodb.Table(TABLE_NAME)


def get_table():
    """Return the DynamoDB Table resource (allows test injection via monkeypatch)."""
    return _table


def put_report(item: dict[str, Any]) -> None:
    """Write a new report item to DynamoDB."""
    get_table().put_item(Item=item)


def get_report(report_id: str) -> Optional[dict[str, Any]]:
    """Fetch a single report by partition key. Returns None if not found."""
    response = get_table().get_item(Key={"report_id": report_id})
    return response.get("Item")


def update_report_status(
    report_id: str,
    status: str,
    updated_at: str,
    resolved_at: Optional[str] = None,
    verification_key: Optional[str] = None,
) -> None:
    """
    Update cleanup workflow status fields on an existing report.
    Raises ClientError with ConditionalCheckFailedException if report not found.
    """
    update_expr = "SET #st = :st, #ua = :ua, #ua2 = :ua"
    expr_names = {"#st": "status", "#ua": "updated_at", "#ua2": "updatedAt"}
    expr_values = {":st": status, ":ua": updated_at}

    if resolved_at:
        update_expr += ", #ra = :ra, #ra2 = :ra"
        expr_names["#ra"] = "resolved_at"
        expr_names["#ra2"] = "resolvedAt"
        expr_values[":ra"] = resolved_at

    if verification_key:
        update_expr += ", #vk = :vk, #vk2 = :vk"
        expr_names["#vk"] = "verification_key"
        expr_names["#vk2"] = "verificationKey"
        expr_values[":vk"] = verification_key

    get_table().update_item(
        Key={"report_id": report_id},
        UpdateExpression=update_expr,
        ExpressionAttributeNames=expr_names,
        ExpressionAttributeValues=expr_values,
        ConditionExpression="attribute_exists(report_id)",
    )


def list_reports(
    status: Optional[str] = None,
    min_priority: Optional[int] = None,
    limit: int = 50,
    start_key: Optional[dict] = None,
    include_demo: bool = True,
) -> dict[str, Any]:
    """
    Scan reports with optional filters. Returns {"items": [...], "last_key": ...}.
    Uses Scan (suitable for small tables; can be upgraded to GSI Query later).
    """
    limit = min(int(limit), 100)
    filter_exprs = []

    if status:
        filter_exprs.append(Attr("status").eq(status))
    if min_priority is not None:
        filter_exprs.append(Attr("risk_score").gte(int(min_priority)))
    if not include_demo:
        filter_exprs.append(Attr("is_demo").eq(False))

    scan_kwargs: dict[str, Any] = {"Limit": limit}

    if filter_exprs:
        combined = filter_exprs[0]
        for expr in filter_exprs[1:]:
            combined = combined & expr
        scan_kwargs["FilterExpression"] = combined

    if start_key:
        scan_kwargs["ExclusiveStartKey"] = start_key

    response = get_table().scan(**scan_kwargs)
    return {
        "items": response.get("Items", []),
        "last_key": response.get("LastEvaluatedKey"),
    }

"""
backend/src/lib/s3_client.py
S3 boto3 client + presigned URL helpers for DrainGuard.
"""

from __future__ import annotations
import os
import boto3
from botocore.exceptions import ClientError
from typing import Optional

BUCKET = os.environ.get("UPLOADS_BUCKET", "")
REGION = os.environ.get("AWS_REGION") or os.environ.get("AWS_DEFAULT_REGION") or "ap-south-1"
UPLOAD_EXPIRY = int(os.environ.get("PRESIGN_EXPIRY_SECONDS", "300"))
GET_EXPIRY = int(os.environ.get("PRESIGN_GET_EXPIRY_SECONDS", "3600"))

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB

_s3_client = boto3.client("s3", region_name=REGION, endpoint_url=f"https://s3.{REGION}.amazonaws.com")


def get_s3_client():
    return _s3_client


def generate_presigned_post(report_id: str, content_type: str) -> dict:
    """
    Generate a presigned POST policy for direct browser-to-S3 upload.
    The browser must POST multipart/form-data with all returned fields + 'file'.
    """
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise ValueError(f"Content-Type not allowed: {content_type}")

    ext = content_type.split("/")[1]
    object_key = f"uploads/{report_id}/photo.{ext}"

    response = get_s3_client().generate_presigned_post(
        Bucket=BUCKET,
        Key=object_key,
        Fields={"Content-Type": content_type},
        Conditions=[
            {"Content-Type": content_type},
            ["content-length-range", 1, MAX_SIZE_BYTES],
        ],
        ExpiresIn=UPLOAD_EXPIRY,
    )

    upload_url = response["url"]
    if ".s3.amazonaws.com" in upload_url and f".s3.{REGION}.amazonaws.com" not in upload_url:
        upload_url = upload_url.replace(".s3.amazonaws.com", f".s3.{REGION}.amazonaws.com")

    return {
        "upload_url": upload_url,
        "url": upload_url,
        "fields": response["fields"],
        "object_key": object_key,
        "expires_in": UPLOAD_EXPIRY,
    }


def generate_presigned_get(object_key: Optional[str]) -> Optional[str]:
    """Generate a short-lived presigned GET URL for a private S3 object."""
    if not object_key or not BUCKET:
        return None
    try:
        return get_s3_client().generate_presigned_url(
            "get_object",
            Params={"Bucket": BUCKET, "Key": object_key},
            ExpiresIn=GET_EXPIRY,
        )
    except ClientError:
        return None

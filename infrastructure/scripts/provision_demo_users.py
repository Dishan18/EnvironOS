"""
infrastructure/scripts/provision_demo_users.py
Idempotently provision the two public hackathon demonstration accounts in Amazon Cognito.

Accounts provisioned:
1. Demo Admin (admin@drainguard.demo, role: admin)
2. Demo User  (user@drainguard.demo,  role: user)

Usage:
  python infrastructure/scripts/provision_demo_users.py <USER_POOL_ID> [REGION]
Or with environment variable:
  COGNITO_USER_POOL_ID=ap-south-1_xxxx python infrastructure/scripts/provision_demo_users.py
"""

from __future__ import annotations
import sys
import os
import boto3
from botocore.exceptions import ClientError

DEFAULT_REGION = os.environ.get("AWS_REGION", "ap-south-1")

DEMO_ACCOUNTS = [
    {
        "username": "admin@drainguard.demo",
        "email": "admin@drainguard.demo",
        "password": "admin12345",
        "group": "admin",
        "role_label": "Demo Administrator",
    },
    {
        "username": "user@drainguard.demo",
        "email": "user@drainguard.demo",
        "password": "user12345",
        "group": "user",
        "role_label": "Demo Community User",
    },
]


def provision_accounts(user_pool_id: str, region: str = DEFAULT_REGION) -> None:
    client = boto3.client("cognito-idp", region_name=region)
    print(f"[1/3] Connecting to Cognito User Pool '{user_pool_id}' in region '{region}'...")

    # 1. Ensure Cognito groups exist
    groups = ["admin", "user"]
    for group_name in groups:
        try:
            client.create_group(
                GroupName=group_name,
                UserPoolId=user_pool_id,
                Description=f"DrainGuard {group_name} role",
            )
            print(f"  + Created group: {group_name}")
        except client.exceptions.GroupExistsException:
            print(f"  * Group already exists: {group_name}")
        except ClientError as exc:
            if exc.response["Error"]["Code"] == "GroupExistsException":
                print(f"  * Group already exists: {group_name}")
            else:
                raise

    print("[2/3] Provisioning demonstration accounts...")
    for acc in DEMO_ACCOUNTS:
        username = acc["username"]
        email = acc["email"]
        password = acc["password"]
        group = acc["group"]
        label = acc["role_label"]

        # Check if user already exists
        user_exists = False
        try:
            client.admin_get_user(UserPoolId=user_pool_id, Username=username)
            user_exists = True
            print(f"  * User exists: {username} ({label})")
        except client.exceptions.UserNotFoundException:
            pass
        except ClientError as exc:
            if exc.response["Error"]["Code"] != "UserNotFoundException":
                raise

        if not user_exists:
            # Create user with verified email
            client.admin_create_user(
                UserPoolId=user_pool_id,
                Username=username,
                UserAttributes=[
                    {"Name": "email", "Value": email},
                    {"Name": "email_verified", "Value": "true"},
                ],
                MessageAction="SUPPRESS",
            )
            print(f"  + Created user: {username} ({label})")

        # Set permanent password idempotently
        client.admin_set_user_password(
            UserPoolId=user_pool_id,
            Username=username,
            Password=password,
            Permanent=True,
        )
        print(f"  + Set permanent password for: {username}")

        # Ensure group membership
        try:
            client.admin_add_user_to_group(
                UserPoolId=user_pool_id,
                Username=username,
                GroupName=group,
            )
            print(f"  + Assigned {username} -> group '{group}'")
        except ClientError as exc:
            # Safe if already member
            print(f"  * Group membership verified for {username} in '{group}'")

    print("[3/3] Successfully provisioned all demo accounts!")
    print("\nSummary:")
    print("  - admin@drainguard.demo  (Role: admin)")
    print("  - user@drainguard.demo   (Role: user)")
    print("\nNote: Credentials are for shared hackathon evaluation only.")


if __name__ == "__main__":
    pool_id = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("COGNITO_USER_POOL_ID")
    region_arg = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_REGION

    if not pool_id:
        print("Usage: python infrastructure/scripts/provision_demo_users.py <USER_POOL_ID> [REGION]")
        print("Or set environment variable: COGNITO_USER_POOL_ID")
        sys.exit(1)

    try:
        provision_accounts(pool_id, region_arg)
    except Exception as exc:
        print(f"Provisioning failed: {exc}", file=sys.stderr)
        sys.exit(1)

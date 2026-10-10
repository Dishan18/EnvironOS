"""
infrastructure/scripts/deploy_amplify.py
Automated deployment script for AWS Amplify Hosting.
Zips the frontend production build in frontend/dist and deploys to the specified branch.

Usage:
    python infrastructure/scripts/deploy_amplify.py [BRANCH_NAME] [APP_ID] [REGION]
"""

import sys
import os
import zipfile
import time
import urllib.request
import boto3

DEFAULT_APP_ID = "d2mwn41m5zowww"
DEFAULT_BRANCH = "phase-4-auth"
DEFAULT_REGION = "ap-south-1"

def deploy(branch_name: str = DEFAULT_BRANCH, app_id: str = DEFAULT_APP_ID, region: str = DEFAULT_REGION):
    dist_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
    if not os.path.exists(dist_dir):
        print(f"Error: Build directory not found: {dist_dir}")
        print("Please run: npm --prefix frontend run build")
        sys.exit(1)

    zip_path = os.path.join(dist_dir, "..", "amplify_bundle.zip")

    print(f"[1/4] Archiving {dist_dir} into zip...")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for f in os.listdir(dist_dir):
            full = os.path.join(dist_dir, f)
            if os.path.isfile(full):
                z.write(full, f)
                print(f"  + {f}")

    print(f"[2/4] Creating Amplify deployment for app '{app_id}', branch '{branch_name}'...")
    client = boto3.client("amplify", region_name=region)
    dep = client.create_deployment(appId=app_id, branchName=branch_name)
    job_id = dep["jobId"]
    upload_url = dep["zipUploadUrl"]

    print(f"[3/4] Uploading build archive to S3...")
    with open(zip_path, "rb") as f:
        data = f.read()

    req = urllib.request.Request(upload_url, data=data, method="PUT")
    req.add_header("Content-Type", "application/zip")
    with urllib.request.urlopen(req) as resp:
        if resp.status not in [200, 204]:
            raise RuntimeError(f"S3 upload failed with status {resp.status}")
    print("  + Upload succeeded (HTTP 200)")

    print(f"[4/4] Starting deployment job #{job_id}...")
    client.start_deployment(appId=app_id, branchName=branch_name, jobId=job_id)

    # Clean up local zip
    if os.path.exists(zip_path):
        os.remove(zip_path)

    print("Waiting for deployment to complete...")
    for _ in range(40):
        time.sleep(3)
        job = client.get_job(appId=app_id, branchName=branch_name, jobId=job_id)
        status = job["job"]["summary"]["status"]
        print(f"  Status: {status}")
        if status == "SUCCEED":
            print(f"\nDeployment succeeded!")
            print(f"Public URL: https://{branch_name}.{app_id}.amplifyapp.com")
            return
        elif status in ["FAILED", "CANCELLED"]:
            raise RuntimeError(f"Deployment failed with status {status}")

    print("Deployment initiated. Check Amplify console for status.")

if __name__ == "__main__":
    branch = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_BRANCH
    app = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_APP_ID
    reg = sys.argv[3] if len(sys.argv) > 3 else DEFAULT_REGION
    deploy(branch, app, reg)

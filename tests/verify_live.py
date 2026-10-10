import json
import urllib.request
import urllib.error
import sys

sys.stdout.reconfigure(encoding="utf-8")

API = "https://m3sxthznac.execute-api.ap-south-1.amazonaws.com/prod"

def req(path, method="GET", body=None):
    url = f"{API}{path}"
    data = json.dumps(body).encode("utf-8") if body else None
    headers = {"Content-Type": "application/json"} if body else {}
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(request, timeout=15) as resp:
        return resp.status, json.loads(resp.read().decode("utf-8"))

print("--> 1. GET /health")
status, data = req("/health")
print(f"Status {status}:", data)

print("\n--> 2. POST /reports")
status, data = req("/reports", method="POST", body={
    "report_id": "rpt_live_01",
    "severity": "critical",
    "site_type": "road",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "description": "Live AWS integration test - storm drain blocked on MG Road",
    "is_demo": True
})
print(f"Status {status}:", data)

print("\n--> 3. GET /reports")
status, data = req("/reports")
print(f"Status {status}: Count = {data.get('count')}")
for item in data.get("items", []):
    print("  Report:", item.get("report_id"), "Score:", item.get("risk_score"), "Priority:", item.get("priority"), "Status:", item.get("status"))

print("\n--> 4. PATCH /reports/rpt_live_01/status")
status, data = req("/reports/rpt_live_01/status", method="PATCH", body={"status": "in_progress"})
print(f"Status {status}:", data)

print("\n--> 5. POST /uploads/presign")
status, data = req("/uploads/presign", method="POST", body={
    "report_id": "rpt_live_01",
    "content_type": "image/jpeg"
})
print(f"Status {status}:")
print("  URL:", data.get("url"))
print("  Key:", data.get("object_key"))
print("  Fields:", list(data.get("fields", {}).keys()))
print("\n--> ALL LIVE VERIFICATIONS PASSED!")

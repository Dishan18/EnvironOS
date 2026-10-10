#!/usr/bin/env python
"""
infrastructure/scripts/seed_demo.py
Inserts clearly-labelled synthetic demo reports into DrainGuard.

Usage:
    API_BASE_URL=https://xxx.execute-api.ap-south-1.amazonaws.com/prod python infrastructure/scripts/seed_demo.py
    # Or pass as argument:
    python infrastructure/scripts/seed_demo.py https://xxx.execute-api.ap-south-1.amazonaws.com/prod

All records have is_demo: True and appear in the UI as "Demo" badges.
They are safe to delete at any time.
"""

from __future__ import annotations
import json
import os
import sys
import urllib.error
import urllib.request
import uuid

API_URL = (
    sys.argv[1].rstrip("/")
    if len(sys.argv) > 1
    else os.environ.get("API_BASE_URL", "").rstrip("/")
)

if not API_URL:
    print("ERROR: API_BASE_URL environment variable or command-line argument is required.", file=sys.stderr)
    print("Example: python infrastructure/scripts/seed_demo.py https://xxx.execute-api.ap-south-1.amazonaws.com/prod", file=sys.stderr)
    sys.exit(1)

DEMO_REPORTS = [
    {
        "severity": "critical",
        "site_type": "road",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "description": "[DEMO] Storm drain fully blocked near Silk Board junction — standing water visible.",
    },
    {
        "severity": "high",
        "site_type": "residential",
        "latitude": 12.9611,
        "longitude": 77.6387,
        "description": "[DEMO] Drain blocked with plastic bags and construction debris.",
    },
    {
        "severity": "medium",
        "site_type": "footpath",
        "latitude": 12.9352,
        "longitude": 77.6245,
        "description": "[DEMO] Partial blockage. Slow drainage after rain.",
    },
    {
        "severity": "low",
        "site_type": "park",
        "latitude": 12.9784,
        "longitude": 77.6408,
        "description": "[DEMO] Leaf litter accumulation — low immediate risk.",
    },
    {
        "severity": "critical",
        "site_type": "road",
        "latitude": 13.0002,
        "longitude": 77.5993,
        "description": "[DEMO] Major arterial drain blocked — reported flooding during last monsoon.",
    },
    {
        "severity": "high",
        "site_type": "commercial",
        "latitude": 12.9254,
        "longitude": 77.5946,
        "description": "[DEMO] Market area drain overflowing with food waste.",
    },
    {
        "severity": "medium",
        "site_type": "road",
        "latitude": 12.9819,
        "longitude": 77.6082,
        "description": "[DEMO] Gravel and silt buildup. Drain functional but reduced capacity.",
    },
    {
        "severity": "high",
        "site_type": "residential",
        "latitude": 12.9155,
        "longitude": 77.6101,
        "description": "[DEMO] Drain cover missing — safety hazard plus blockage risk.",
    },
    {
        "severity": "low",
        "site_type": "footpath",
        "latitude": 12.9910,
        "longitude": 77.5820,
        "description": "[DEMO] Minor debris. Flagged for routine maintenance.",
    },
    {
        "severity": "medium",
        "site_type": "commercial",
        "latitude": 12.9445,
        "longitude": 77.5738,
        "description": "[DEMO] Grease trap overflow. Restaurant row drainage compromised.",
    },
]


def create_report(report: dict) -> None:
    report_id = f"rpt_{uuid.uuid4().hex[:10]}"
    payload = {
        **report,
        "report_id": report_id,
        "reportId": report_id,
        "is_demo": True,
        "isDemo": True,
    }

    req = urllib.request.Request(
        f"{API_URL}/reports",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(
                f"  [OK] {report_id}  severity={report['severity']:<9}  "
                f"score={data.get('risk_score', data.get('priorityScore'))}  "
                f"priority={data.get('priority')}"
            )
    except urllib.error.HTTPError as err:
        body = err.read().decode("utf-8", errors="replace")
        print(f"  [FAILED] {report_id} HTTP {err.code}: {body}", file=sys.stderr)
    except Exception as exc:
        print(f"  [FAILED] {report_id} Error: {exc}", file=sys.stderr)


def main() -> None:
    print(f"\nSeeding {len(DEMO_REPORTS)} demo reports to {API_URL} ...\n")
    for r in DEMO_REPORTS:
        create_report(r)
    print("\n[DONE] Demo data seeding process finished.\n")


if __name__ == "__main__":
    main()

# DrainGuard — Backend Architecture & Documentation

## Overview

DrainGuard's backend is a serverless, event-driven microservices architecture built on AWS Lambda (Python 3.11), Amazon API Gateway HTTP API (v2), Amazon DynamoDB, Amazon S3, and Amazon Cognito User Pools, deployed in the AWS Asia Pacific (Mumbai) region (`ap-south-1`).

---

## 1. Directory Structure

```
backend/
├── src/
│   ├── handlers/
│   │   ├── create_report.py    # POST /reports — ingest incident, score risk, persist to DynamoDB
│   │   ├── list_reports.py     # GET /reports — retrieve reports with status filter & presigned S3 URLs
│   │   ├── update_status.py    # PATCH /reports/{id}/status — admin-only forward workflow transitions
│   │   ├── presign.py          # POST /uploads/presign — generate S3 presigned POST policy
│   │   └── health.py           # GET /health — public operational health probe
│   └── lib/
│       ├── auth_utils.py       # Cognito claims extraction, RBAC groups parsing, transition validation
│       ├── dynamo_client.py    # DynamoDB CRUD operations with boto3
│       ├── http_utils.py       # API Gateway v2 response formatters & CORS headers
│       ├── risk_score.py       # Deterministic 0-100 risk scoring algorithm
│       ├── s3_client.py        # Presigned POST policy and presigned GET generation
│       ├── validate.py         # Request payload schema validation & sanitization
│       └── weather.py          # Live Open-Meteo rainfall query with resilient fallback
├── requirements.txt            # Production dependencies (boto3, botocore, urllib3)
└── requirements-dev.txt        # Development/testing dependencies (pytest, moto, pytest-cov)
```

---

## 2. API Endpoints & Route Definitions

| Method | Route | Authorization | Lambda Handler | Description |
|---|---|---|---|---|
| `GET` | `/health` | **None** (Public) | `src.handlers.health.handler` | Health check probe returning service uptime and status `ok`. |
| `GET` | `/reports` | **Cognito JWT** (`user`, `admin`) | `src.handlers.list_reports.handler` | Lists reports with optional `?status=` and `?limit=` filters; generates temporary presigned GET URLs for evidence photos. |
| `POST` | `/reports` | **Cognito JWT** (`user`, `admin`) | `src.handlers.create_report.handler` | Ingests report, fetches live 24h rainfall from Open-Meteo, calculates 0-100 risk score, sets `created_by` attribution, and persists to DynamoDB. |
| `POST` | `/uploads/presign` | **Cognito JWT** (`user`, `admin`) | `src.handlers.presign.handler` | Produces an Amazon S3 presigned POST policy and form fields for direct browser-to-S3 photo uploads. |
| `PATCH` | `/reports/{id}/status` | **Cognito JWT** (`admin` only) | `src.handlers.update_status.handler` | Validates permitted forward status transitions (`open -> in_progress`, `in_progress -> resolved`) and records `updated_by` / `resolved_at`. |

---

## 3. Server-Side Risk Scoring Heuristic

DrainGuard computes a deterministic, explainable risk score (0-100) based on three physical and meteorological factors:

$$\text{Risk Score} = \text{clamp}\big(0.45 \times \text{Severity} + 0.35 \times \text{Rainfall Risk} + 0.20 \times \text{Site Vulnerability}\big)$$

### Component Weights & Tiers

1. **Blockage Severity (45% weight)**:
   - `critical` $\to 100$
   - `high` $\to 75$
   - `medium` $\to 45$
   - `low` $\to 20$
2. **Rainfall Risk (35% weight)**:
   - Live Open-Meteo precipitation forecast (24h accumulation):
     - $\ge 50$ mm $\to 100$ (Heavy / Severe)
     - $20 - 49.9$ mm $\to 75$ (Moderate)
     - $5 - 19.9$ mm $\to 45$ (Light)
     - $0 - 4.9$ mm $\to 10$ (Trace / Dry)
     - Fallback if weather API times out or is unreachable: $\to 40$ (labeled `fallback_default`)
3. **Site Vulnerability (20% weight)**:
   - `road` $\to 100$ (high-traffic arterial, vehicle disruption)
   - `commercial` $\to 75$ (marketplaces, foot traffic)
   - `residential` $\to 60$ (neighborhoods, homes)
   - `footpath` $\to 35$ (pedestrian walkways)
   - `park` $\to 15$ (open ground absorption)

### Priority Classifications

- **75 - 100**: `critical` (Immediate intervention SLA < 4 hours)
- **50 - 74**: `high` (Priority cleanup SLA < 24 hours)
- **25 - 49**: `moderate` (Scheduled routine maintenance SLA < 72 hours)
- **0 - 24**: `low` (Periodic monitoring)

---

## 4. DynamoDB Schema (`DrainGuardReports`)

- **Table Name**: `DrainGuardReports`
- **Billing Mode**: `PAY_PER_REQUEST` (On-Demand)
- **Partition Key**: `report_id` (String, format `rpt_<alphanumeric>`)
- **Global Secondary Indexes**:
  - `StatusIndex`: Partition key `status`, Sort key `created_at`
  - `PriorityIndex`: Partition key `priority`, Sort key `created_at`

### Item Attributes

```json
{
  "report_id": "rpt_FVw0toM-vk",
  "status": "resolved",
  "severity": "high",
  "site_type": "road",
  "latitude": "22.16490",
  "longitude": "74.57073",
  "description": "Phase 5 Live Amplify Report - Blocked drain at junction",
  "image_key": "uploads/rpt_FVw0toM-vk/evidence.jpg",
  "risk_score": 54,
  "priority": "high",
  "rainfall_mm": "0.0",
  "rainfall_source": "open-meteo",
  "score_explanation": "Severity 'high' (75/100) x 0.45 = 33.8; Rainfall 0 mm forecast - dry (0/100) x 0.35 = 0.0; Site 'road' (100/100) x 0.20 = 20.0. Total = 54/100 -> high.",
  "created_at": "2026-10-11T02:55:00.000000+00:00",
  "created_by": "c163fd4a-30d1-70a2-2653-9861354b2dd9",
  "updated_at": "2026-10-11T03:00:15.123456+00:00",
  "updated_by": "d1936dca-3041-70b4-6134-e37f3fed244d",
  "resolved_at": "2026-10-11T03:00:15.123456+00:00"
}
```

---

## 5. Security & Authorization

1. **Fail-Closed API Gateway JWT Authorizer**:
   Every route except `/health` requires a valid Cognito ID/Access token matching the issuer `https://cognito-idp.ap-south-1.amazonaws.com/ap-south-1_lQ1aIHunD`. Requests without valid tokens are immediately rejected with HTTP 401 Unauthorized at the API Gateway layer.
2. **Backend Role-Based Access Control**:
   `update_status.py` inspects `cognito:groups` extracted from `event['requestContext']['authorizer']['jwt']['claims']`. If the authenticated subject is not a member of the `admin` group, the handler rejects the request with HTTP 403 Forbidden.
3. **State Transition Validation**:
   Status changes are strictly unidirectional:
   - `open` $\to$ `in_progress` (permitted)
   - `in_progress` $\to$ `resolved` (permitted)
   - Backward transitions (`in_progress` $\to$ `open`, `resolved` $\to$ `open`) or invalid skips (`open` $\to$ `resolved`) return HTTP 400 Bad Request.
4. **Private S3 Upload Pipeline**:
   The S3 bucket `drainguard-uploadsbucket-kuqg8s745qau` is strictly private with public access blocked. Clients receive short-lived presigned POST policies (expires in 300 seconds, restricted to `uploads/${report_id}/*` prefix and max 10MB) and view images via temporary presigned GET URLs (expires in 3600 seconds).

---

## 6. Testing

The backend includes a comprehensive pytest suite covering all business logic, validation, HTTP handlers, risk heuristics, and RBAC:

```bash
# Execute backend test suite (74 tests)
backend/.venv/Scripts/pytest tests/python/ -v
```

All 74 tests pass cleanly with mocked AWS services via `moto` and monkeypatched weather endpoints.

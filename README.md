# DrainGuard ️

> **Amazon Environmental Hacks 2026 · Track 02: Heat and Water**
> Preventive drain-maintenance and risk-triage platform.

DrainGuard empowers communities to report blocked storm drains and helps municipal / community cleanup operators triage and prioritize hotspots before conditions worsen. Every report receives an explainable 0-100 risk score combining blockage severity, forecasted precipitation, and site exposure vulnerability.

---

## Architecture & Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Backend Runtime** | Python 3.11 on AWS Lambda | Modular handlers with typed lib components |
| **API Gateway** | Amazon API Gateway (HTTP API v2) | Low-latency, built-in CORS configuration |
| **Database** | Amazon DynamoDB | On-demand PAY_PER_REQUEST, GSIs for status & priority |
| **Photo Storage** | Amazon S3 | Private bucket with secure pre-signed POST and GET URLs |
| **Infrastructure as Code** | AWS SAM / CloudFormation | Declarative IaC, least-privilege IAM policies |
| **Weather Enrichment** | Open-Meteo API | Free 24h precipitation query (graceful fallback) |
| **Testing** | Pytest + Moto | 66 comprehensive unit tests with mocked AWS services |
| **Frontend** *(Phase 3)* | React + Vite + TypeScript + Tailwind | Interactive Leaflet / OpenStreetMap triage map |

---

## Risk-Scoring Heuristic

DrainGuard computes a deterministic, explainable risk score (0-100):

$$\text{Risk Score} = \text{clamp}\big(0.45 \times \text{Severity} + 0.35 \times \text{Rainfall Risk} + 0.20 \times \text{Site Exposure}\big)$$

### Heuristic Weights & Component Ranges

1. **Severity (45% weight)**:
   - `critical` $\to 100$
   - `high` $\to 75$
   - `medium` $\to 45$
   - `low` $\to 20$
2. **Rainfall Risk (35% weight)**:
   - Based on Open-Meteo 24-hour total precipitation:
     - $\ge 50$ mm $\to 100$ (Heavy / Severe)
     - $20 - 49.9$ mm $\to 75$ (Moderate)
     - $5 - 19.9$ mm $\to 45$ (Light)
     - $0 - 4.9$ mm $\to 10$ (Trace / Dry)
     - Weather service timeout / unavailable $\to 40$ (Documented fallback; labeled `fallback_default`)
3. **Site Exposure (20% weight)**:
   - `road` $\to 100$ (high-traffic arterial, traffic disruption)
   - `commercial` $\to 75$ (marketplaces, foot traffic)
   - `residential` $\to 60$ (neighborhoods, homes)
   - `footpath` $\to 35$ (pedestrian walkways)
   - `park` $\to 15$ (open ground absorption)

### Priority Tiers

| Score Range | Priority Tier | Recommended SLA |
|---|---|---|
| **75 - 100** | `Critical` | Immediate intervention (< 4 hours) |
| **50 - 74** | `High` | Priority cleanup (< 24 hours) |
| **25 - 49** | `Moderate` | Scheduled routine maintenance (< 72 hours) |
| **0 - 24** | `Low` | Periodic monitoring |

> **Disclaimer**: This is a preventive triage heuristic, not a hydrologic flood forecast model.

---

## Local Setup & Development (Windows PowerShell)

### 1. Prerequisites
- Python 3.11+
- AWS CLI v2 (`aws --version`)
- AWS SAM CLI (`sam --version`)
- Git

### 2. Python Virtual Environment Setup

In PowerShell from repository root:

```powershell
# Create dedicated virtual environment
python -m venv backend\.venv

# Activate the virtual environment
.\backend\.venv\Scripts\Activate.ps1

# Install runtime and development dependencies
pip install -r backend\requirements.txt -r backend\requirements-dev.txt
```

### 3. Running Unit Tests

Unit tests execute without needing live AWS credentials via `moto`:

```powershell
# Run all tests
backend\.venv\Scripts\pytest

# Run with verbose output and coverage
backend\.venv\Scripts\pytest -v --cov=backend/src
```

All 66 tests validate risk scoring boundaries, validation edge cases, and all Lambda handlers with DynamoDB persistence and S3 pre-signed URLs.

---

## AWS Configuration & Deployment

### 1. AWS Identity Check
Ensure your AWS credentials and target region are set:

```powershell
# Verify active IAM identity
aws sts get-caller-identity

# Check or set active AWS region (e.g. ap-south-1 or us-east-1)
aws configure get region
aws configure set region ap-south-1
```

### 2. Build SAM Application

```powershell
# SAM builds Python 3.11 packages using backend/requirements.txt
sam build --template infrastructure/template.yaml
```

### 3. Deploy to AWS

Deploy using the automated PowerShell script:
```powershell
.\infrastructure\scripts\deploy.ps1 -Stage prod -Region ap-south-1
```

Or deploy manually via SAM CLI:
```powershell
sam deploy `
  --template-file .aws-sam/build/template.yaml `
  --stack-name drainguard `
  --region ap-south-1 `
  --resolve-s3 `
  --capabilities CAPABILITY_IAM `
  --parameter-overrides Stage=prod `
  --no-confirm-changeset
```

---

## API Endpoints & Contract Reference

Base URL format: `https://{ApiId}.execute-api.{Region}.amazonaws.com/prod`

### 1. `GET /health`
Liveness probe.
- **Response `200`**:
  ```json
  {
    "status": "ok",
    "timestamp": "2026-10-10T18:00:00.000000+00:00"
  }
  ```

### 2. `POST /reports`
Submit a new drain-blockage report. Risk score is computed strictly server-side.
- **Request Body**:
  ```json
  {
    "report_id": "rpt_abc1234567",
    "severity": "critical",
    "site_type": "road",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "description": "Drain fully blocked near Silk Board junction with debris.",
    "image_key": "uploads/rpt_abc1234567/photo.jpg",
    "is_demo": false
  }
  ```
- **Response `201`**:
  ```json
  {
    "report_id": "rpt_abc1234567",
    "reportId": "rpt_abc1234567",
    "risk_score": 85,
    "priorityScore": 85,
    "priority": "Critical",
    "status": "open",
    "explanation": "Score 85/100 (Critical) : critical severity (45.0 pts), light rainfall (15.8 pts), road site (20.0 pts)",
    "rainfall_source": "open-meteo"
  }
  ```

### 3. `GET /reports`
Retrieve submitted reports. Enriches items with time-limited pre-signed S3 viewing URLs.
- **Query Parameters**:
  - `status` (optional): `open` | `in_progress` | `resolved`
  - `minPriority` (optional): integer (e.g. `50`)
  - `demo` (optional): `true` (default) | `false`
  - `limit` (optional): `1` to `100` (default: 50)
  - `nextToken` (optional): base64 pagination cursor
- **Response `200`**:
  ```json
  {
    "items": [
      {
        "report_id": "rpt_abc1234567",
        "status": "open",
        "severity": "critical",
        "site_type": "road",
        "latitude": "12.9716",
        "longitude": "77.5946",
        "risk_score": 85,
        "priority": "Critical",
        "image_url": "https://drainguard-uploads...s3.amazonaws.com/uploads/...",
        "created_at": "2026-10-10T18:00:00.000000+00:00"
      }
    ],
    "next_token": null,
    "count": 1
  }
  ```

### 4. `PATCH /reports/{id}/status`
Update cleanup workflow status.
- **Request Body**:
  ```json
  {
    "status": "resolved",
    "verification_image_key": "uploads/rpt_abc1234567/resolved.jpg"
  }
  ```
- **Response `200`**:
  ```json
  {
    "report_id": "rpt_abc1234567",
    "status": "resolved",
    "updated_at": "2026-10-10T18:30:00+00:00",
    "resolved_at": "2026-10-10T18:30:00+00:00"
  }
  ```

### 5. `POST /uploads/presign`
Generates pre-signed S3 POST payload for direct browser-to-S3 photo uploads.
- **Request Body**:
  ```json
  {
    "report_id": "rpt_abc1234567",
    "content_type": "image/jpeg"
  }
  ```
- **Response `200`**:
  ```json
  {
    "url": "https://drainguard-uploads-xxxx.s3.amazonaws.com/",
    "fields": {
      "key": "uploads/rpt_abc1234567/photo.jpg",
      "Content-Type": "image/jpeg",
      "policy": "...",
      "x-amz-signature": "..."
    },
    "object_key": "uploads/rpt_abc1234567/photo.jpg"
  }
  ```

---

---

## Frontend Development & Operation (Phase 3)

The DrainGuard web client is built with React 19, Vite, TypeScript, Tailwind CSS, Leaflet, and Lucide React.

### 1. Local Setup & Execution

```powershell
# Navigate to frontend and install dependencies
cd frontend
npm install

# Configure environment (points to live AWS backend)
Copy-Item .env.example .env.local

# Start Vite dev server on http://localhost:5173
npm run dev
```

### 2. Frontend Unit Tests & Build

```powershell
# Run Vitest component and API client test suite (12 tests)
npm --prefix frontend run test

# Compile production bundle
npm --prefix frontend run build
```

---

## AWS Amplify Hosting Deployment

An `amplify.yml` build specification is provided in the repository root for AWS Amplify hosting.

### Minimal AWS Console Deployment Steps

1. Sign in to the **AWS Management Console** and navigate to **AWS Amplify** (`ap-south-1` or `us-east-1`).
2. Select **Deploy an app** $\to$ **GitHub**.
3. Choose the repository: `Dishan18/EnvironOS` and branch `phase-3-frontend` (or `master` once merged).
4. In **Build Settings**, Amplify will automatically detect the root `amplify.yml`.
5. Under **Advanced Settings** $\to$ **Environment variables**, set:
   - `VITE_API_BASE_URL` = `https://m3sxthznac.execute-api.ap-south-1.amazonaws.com/prod`
6. Click **Save and Deploy**.
7. Once deployed, copy your Amplify domain (e.g. `https://main.xxxx.amplifyapp.com`).
8. The backend's API Gateway CORS is already pre-configured with `Access-Control-Allow-Origin: *`, allowing your Amplify domain to communicate with the live backend immediately without additional stack redeployments!

---

## Seeding Synthetic Demo Data

Populate realistic test reports with Bangalore coordinates:

```powershell
python infrastructure\scripts\seed_demo.py https://m3sxthznac.execute-api.ap-south-1.amazonaws.com/prod
```

All seeded reports include `is_demo: true` and are safe to query or delete at any time.

---

## Known Limitations & Architecture Notes

1. **Table Queries vs Scans**: `list_reports` currently uses a DynamoDB Scan filter, suitable for hackathon scale (<10,000 reports). In high-volume production, query directly by GSI (`StatusCreatedAtIndex` and `PriorityIndex`).
2. **Open-Meteo Rate Limits**: Weather enrichment calls Open-Meteo's free tier with a 3-second timeout and gracefully falls back to default seasonal risk scores if the weather API is unreachable or rate-limited.


# DrainGuard 🌧️

> **Amazon Environmental Hacks 2026 · Track 02: Heat and Water**

DrainGuard is a preventive drain-maintenance and risk-triage platform. Communities report blocked drains; cleanup operators prioritise locations before conditions worsen. Reports are scored 0–100 using blockage severity, rainfall forecast and site exposure.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Maps | Leaflet + OpenStreetMap |
| Backend | Node.js 22 on AWS Lambda |
| API | Amazon API Gateway HTTP API |
| Database | Amazon DynamoDB (on-demand) |
| Images | Private Amazon S3 + presigned URLs |
| IaC | AWS SAM + CloudFormation |
| Hosting | AWS Amplify |
| Weather | Open-Meteo (optional, no API key required) |

## Prerequisites

- Node.js 22+
- AWS CLI configured (`aws sts get-caller-identity`)
- AWS SAM CLI 1.x+
- An S3 bucket for SAM deployment artifacts

## Quick Start — Backend

```bash
# 1. Install backend dependencies
cd backend && npm install && cd ..

# 2. Copy and edit SAM parameters
cp infrastructure/samconfig.toml.example infrastructure/samconfig.toml
# edit samconfig.toml with your S3 bucket and stack name

# 3. Build + deploy
cd infrastructure
sam build
sam deploy

# 4. Smoke-test
curl $(aws cloudformation describe-stacks \
  --stack-name drainguard \
  --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" \
  --output text)/health
```

## Quick Start — Frontend

```bash
cd frontend
cp .env.local.example .env.local
# Set VITE_API_BASE_URL to the ApiEndpoint output from above
npm install
npm run dev
```

## Seed Demo Data

```bash
cd infrastructure
./scripts/seed-demo.sh
```

## Project Structure

```
EnvironOS/
├── frontend/        # React + Vite app
├── backend/         # Lambda handlers
├── infrastructure/  # AWS SAM template + scripts
└── tests/           # Vitest + backend unit tests
```

## Disclaimer

DrainGuard provides **maintenance prioritisation** using a heuristic risk score. It does not predict flooding. Rainfall data is a 24-hour forecast used as one input factor only.

---

*Built for Amazon Environmental Hacks 2026.*

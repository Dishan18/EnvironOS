#!/usr/bin/env bash
# infrastructure/scripts/deploy.sh
# One-shot deploy script for DrainGuard backend.
# Usage: ./scripts/deploy.sh [dev|prod]
set -euo pipefail

STAGE="${1:-prod}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"

echo "==> Building SAM application (stage: $STAGE)..."
cd "$INFRA_DIR"
sam build

echo "==> Deploying to AWS (stage: $STAGE)..."
sam deploy \
  --parameter-overrides "Stage=$STAGE" \
  --no-confirm-changeset

echo ""
echo "==> Deployment complete. Outputs:"
aws cloudformation describe-stacks \
  --stack-name drainguard \
  --query "Stacks[0].Outputs[*].[OutputKey,OutputValue]" \
  --output table

echo ""
echo "==> Smoke-testing /health endpoint..."
API_URL=$(aws cloudformation describe-stacks \
  --stack-name drainguard \
  --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" \
  --output text)

curl -sf "$API_URL/health" | python3 -m json.tool
echo ""
echo "✅ Health check passed."

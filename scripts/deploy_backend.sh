#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

AWS_REGION="${AWS_REGION:-us-east-1}"
BACKEND_LAMBDA_NAME="${BACKEND_LAMBDA_NAME:-pennypilot-api-dev-use1}"

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

need_cmd aws

export AWS_REGION AWS_DEFAULT_REGION="$AWS_REGION"
export AWS_PAGER=""

echo "[package] backend lambda"
"$ROOT_DIR/scripts/package_backend_lambda.sh" >/dev/null

echo "[deploy] aws lambda update-function-code -> $BACKEND_LAMBDA_NAME"
aws lambda update-function-code \
  --function-name "$BACKEND_LAMBDA_NAME" \
  --zip-file "fileb://$ROOT_DIR/dist/backend_lambda.zip" >/dev/null

echo "[done] Backend lambda code updated: $BACKEND_LAMBDA_NAME"

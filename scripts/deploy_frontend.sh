#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONT_DIR="$ROOT_DIR/front"

AWS_REGION="${AWS_REGION:-us-east-1}"
WEB_BUCKET="${WEB_BUCKET:-pennypilot-web-dev-use1}"
WEB_DOMAIN="${WEB_DOMAIN:-app.vinuelax.cl}"
FRONTEND_API_BASE_URL_SSM_PARAM="${FRONTEND_API_BASE_URL_SSM_PARAM:-/pennypilot/dev/frontend/api_base_url}"
DEFAULT_API_BASE_URL="${DEFAULT_API_BASE_URL:-https://api.vinuelax.cl/api/v1}"

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

need_cmd aws
need_cmd pnpm

export AWS_REGION AWS_DEFAULT_REGION="$AWS_REGION"
export AWS_PAGER=""

API_BASE_URL="$(aws ssm get-parameter --name "$FRONTEND_API_BASE_URL_SSM_PARAM" --query 'Parameter.Value' --output text 2>/dev/null || true)"
if [[ -z "$API_BASE_URL" || "$API_BASE_URL" == "None" ]]; then
  API_BASE_URL="$DEFAULT_API_BASE_URL"
fi

echo "[build] front/ with NEXT_PUBLIC_API_BASE_URL=$API_BASE_URL"
(
  cd "$FRONT_DIR"
  pnpm install --frozen-lockfile
  NEXT_PUBLIC_API_BASE_URL="$API_BASE_URL" pnpm build
)

if [[ ! -f "$FRONT_DIR/out/index.html" ]]; then
  echo "Build succeeded but front/out/index.html is missing" >&2
  exit 1
fi

echo "[upload] s3://$WEB_BUCKET"
aws s3 sync "$FRONT_DIR/out/" "s3://$WEB_BUCKET" --delete

echo "[discover] CloudFront distribution for $WEB_DOMAIN"
DISTRIBUTION_ID="$(aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items && contains(Aliases.Items, '${WEB_DOMAIN}')].Id | [0]" --output text 2>/dev/null || true)"
if [[ "$DISTRIBUTION_ID" == "None" || -z "$DISTRIBUTION_ID" ]]; then
  echo "[skip] CloudFront distribution not found for $WEB_DOMAIN"
  exit 0
fi

echo "[invalidate] distribution $DISTRIBUTION_ID"
aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/*" >/dev/null
echo "[done] Frontend deployed to https://$WEB_DOMAIN"

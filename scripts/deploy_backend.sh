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
need_cmd python3

export AWS_REGION AWS_DEFAULT_REGION="$AWS_REGION"
export AWS_PAGER=""

run_db_migrations() {
  local db_url="${DATABASE_URL:-}"

  if [[ -z "$db_url" ]]; then
    echo "[migrate] resolving DATABASE_URL from lambda env: $BACKEND_LAMBDA_NAME"
    db_url="$(aws lambda get-function-configuration \
      --function-name "$BACKEND_LAMBDA_NAME" \
      --query 'Environment.Variables.DATABASE_URL' \
      --output text 2>/dev/null || true)"
  fi

  if [[ -z "$db_url" || "$db_url" == "None" ]]; then
    echo "[migrate] DATABASE_URL not found (env or lambda config); skipping migrations" >&2
    echo "[migrate] export DATABASE_URL=... and rerun, or set SKIP_DB_MIGRATIONS=true to skip intentionally" >&2
    exit 1
  fi

  echo "[migrate] applying DB migrations"
  (
    cd "$ROOT_DIR"
    export DB_BACKEND=postgres
    export DATABASE_URL="$db_url"
    export PYTHONPATH="$ROOT_DIR${PYTHONPATH:+:$PYTHONPATH}"
    python3 scripts/migrate_db.py
  )
}

if [[ "${SKIP_DB_MIGRATIONS:-}" != "true" ]]; then
  run_db_migrations
else
  echo "[migrate] skipped (SKIP_DB_MIGRATIONS=true)"
fi

echo "[package] backend lambda"
"$ROOT_DIR/scripts/package_backend_lambda.sh" >/dev/null

echo "[deploy] aws lambda update-function-code -> $BACKEND_LAMBDA_NAME"
aws lambda update-function-code \
  --function-name "$BACKEND_LAMBDA_NAME" \
  --zip-file "fileb://$ROOT_DIR/dist/backend_lambda.zip" >/dev/null

echo "[done] Backend lambda code updated: $BACKEND_LAMBDA_NAME"

#!/usr/bin/env bash
# Build the api + web images and push them to GHCR.
#
#   echo "$GHCR_PAT" | docker login ghcr.io -u <github-user> --password-stdin
#   IMAGE_TAG=v1 ./scripts/build_push_images.sh
#
# NEXT_PUBLIC_API_BASE_URL is baked into the web image at build time.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REGISTRY="${REGISTRY:-ghcr.io/vinuelax}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-https://app.vinuelax.cl/api/v1}"

API_IMAGE="${REGISTRY}/personal-finance-app-api:${IMAGE_TAG}"
WEB_IMAGE="${REGISTRY}/personal-finance-app-web:${IMAGE_TAG}"

echo "[build] $API_IMAGE"
docker build --target prod -t "$API_IMAGE" "$ROOT_DIR/back"

echo "[build] $WEB_IMAGE (NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL)"
docker build \
  -f "$ROOT_DIR/front/Dockerfile.static" \
  --build-arg "NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL" \
  -t "$WEB_IMAGE" "$ROOT_DIR/front"

echo "[push] $API_IMAGE"
docker push "$API_IMAGE"
echo "[push] $WEB_IMAGE"
docker push "$WEB_IMAGE"

echo "[done] pushed tag '$IMAGE_TAG'"

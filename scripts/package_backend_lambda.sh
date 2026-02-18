#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
BUILD_DIR="$DIST_DIR/backend_lambda"
ZIP_PATH="$DIST_DIR/backend_lambda.zip"

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

python3 -m pip install --upgrade pip >/dev/null
python3 -m pip install -r "$ROOT_DIR/back/requirements.txt" -t "$BUILD_DIR"

cp -R "$ROOT_DIR/back/app" "$BUILD_DIR/"
cp -R "$ROOT_DIR/back/config" "$BUILD_DIR/"
cp -R "$ROOT_DIR/back/db" "$BUILD_DIR/"
cp -R "$ROOT_DIR/back/utils" "$BUILD_DIR/"

(
  cd "$BUILD_DIR"
  zip -rq "$ZIP_PATH" .
)

echo "$ZIP_PATH"

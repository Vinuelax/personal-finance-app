#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
BUILD_DIR="$DIST_DIR/ocr_lambda"
ZIP_PATH="$DIST_DIR/ocr_lambda.zip"

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

python3 -m pip install --upgrade pip >/dev/null
python3 -m pip install -r "$ROOT_DIR/ocr-lambda/requirements.txt" -t "$BUILD_DIR"

cp "$ROOT_DIR/ocr-lambda/handler.py" "$BUILD_DIR/"
cp "$ROOT_DIR/ocr-lambda/providers.py" "$BUILD_DIR/"
cp "$ROOT_DIR/ocr-lambda/normalizer.py" "$BUILD_DIR/"
cp "$ROOT_DIR/ocr-lambda/callback.py" "$BUILD_DIR/"

(
  cd "$BUILD_DIR"
  zip -rq "$ZIP_PATH" .
)

echo "$ZIP_PATH"

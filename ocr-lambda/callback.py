import json
import os
from typing import Any, Dict
from urllib import request


def post_ocr_result(payload: Dict[str, Any]) -> Dict[str, Any]:
    api_base = os.getenv("OCR_CALLBACK_BASE_URL", "http://localhost:8001/api/v1")
    token = os.getenv("INTERNAL_SERVICE_TOKEN", "dev-internal-token")
    url = f"{api_base.rstrip('/')}/internal/receipts/ocr-callback"

    body = json.dumps(payload).encode("utf-8")
    req = request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-Internal-Token": token,
        },
    )

    with request.urlopen(req, timeout=20) as resp:
        response_data = resp.read().decode("utf-8")
        return {
            "statusCode": resp.status,
            "body": response_data,
        }

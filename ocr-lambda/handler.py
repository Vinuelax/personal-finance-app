import json
from typing import Any, Dict, Iterable, List

from callback import post_ocr_result
from normalizer import normalize_receipt
from providers import get_provider


def _records_from_event(event: Dict[str, Any]) -> Iterable[Dict[str, Any]]:
    records = event.get("Records")
    if isinstance(records, list):
        for rec in records:
            body = rec.get("body") if isinstance(rec, dict) else None
            if isinstance(body, str):
                try:
                    yield json.loads(body)
                    continue
                except json.JSONDecodeError:
                    pass
            if isinstance(rec, dict):
                yield rec
        return
    yield event


def _process_one(payload: Dict[str, Any]) -> Dict[str, Any]:
    user_id = payload["user_id"]
    receipt_id = payload["receipt_id"]
    image_uri = payload["image_url"]

    provider = get_provider()
    try:
        ocr_result = provider.extract(image_uri)
        parsed = normalize_receipt(ocr_result["raw_text"], ocr_result.get("raw_blocks"))

        callback_payload = {
            "userId": user_id,
            "receiptId": receipt_id,
            "status": "ocr_done",
            "merchant": parsed.get("merchant", ""),
            "date": parsed.get("purchaseDate"),
            "total": parsed.get("totals", {}).get("grandTotal", 0),
            "lineItems": parsed.get("items", []),
            "ocrProvider": ocr_result.get("provider", "unknown"),
            "ocrConfidence": ocr_result.get("confidence", parsed.get("confidence", 0.0)),
            "ocrRawText": ocr_result.get("raw_text", ""),
            "ocrRawBlocks": ocr_result.get("raw_blocks", []),
            "parsedReceipt": parsed,
            "needsReview": bool(parsed.get("needsReview", True)),
            "ocrError": None,
        }
        post_ocr_result(callback_payload)
        return {"receipt_id": receipt_id, "status": "ok"}
    except Exception as exc:  # noqa: BLE001
        failure_payload = {
            "userId": user_id,
            "receiptId": receipt_id,
            "status": "ocr_failed",
            "ocrError": str(exc),
            "needsReview": True,
        }
        post_ocr_result(failure_payload)
        return {"receipt_id": receipt_id, "status": "failed", "error": str(exc)}


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    results: List[Dict[str, Any]] = []
    for payload in _records_from_event(event):
        results.append(_process_one(payload))
    return {"processed": len(results), "results": results}

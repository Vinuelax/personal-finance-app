from fastapi.testclient import TestClient


def test_internal_ocr_callback_updates_receipt(client: TestClient):
    create_payload = {
        "merchant": "",
        "date": "2026-02-10",
        "total": 0,
        "status": "uploading",
        "transactionId": None,
    }
    created = client.post("/receipts", json=create_payload)
    assert created.status_code == 200
    receipt_id = created.json()["receiptId"]

    callback_payload = {
        "userId": "u_001",
        "receiptId": receipt_id,
        "status": "ocr_done",
        "merchant": "Sample Store",
        "date": "2026-02-10",
        "total": 599,
        "lineItems": [
            {
                "id": "li_1",
                "description": "Milk",
                "amount": 349,
                "confidence": 0.9,
            }
        ],
        "ocrProvider": "mock",
        "ocrConfidence": 0.88,
        "ocrRawText": "Sample Store\\nMilk 3.49\\nTotal 5.99",
        "parsedReceipt": {
            "totals": {
                "grandTotal": 599,
            }
        },
        "needsReview": False,
    }

    callback = client.post(
        "/internal/receipts/ocr-callback",
        json=callback_payload,
        headers={"X-Internal-Token": "dev-internal-token"},
    )
    assert callback.status_code == 200

    receipts = client.get("/receipts")
    assert receipts.status_code == 200
    updated = next(r for r in receipts.json() if r["receiptId"] == receipt_id)
    assert updated["status"] == "ocr_done"
    assert updated["merchant"] == "Sample Store"
    assert updated["ocrProvider"] == "mock"
    assert updated["ocrConfidence"] == 0.88
    assert updated["needsReview"] is False
    assert updated["parsedReceipt"]["totals"]["grandTotal"] == 599


def test_internal_ocr_callback_requires_token(client: TestClient):
    callback = client.post(
        "/internal/receipts/ocr-callback",
        json={
            "userId": "u_001",
            "receiptId": "rcpt_missing",
            "status": "ocr_failed",
        },
    )
    assert callback.status_code == 401

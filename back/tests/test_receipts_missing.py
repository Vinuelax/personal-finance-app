from fastapi.testclient import TestClient


def test_receipt_not_found(client: TestClient):
    resp = client.patch("/receipts/does-not-exist", json={"merchant": "X", "date": "2026-02-01", "total": 1, "status": "uploading", "transactionId": None})
    assert resp.status_code == 404

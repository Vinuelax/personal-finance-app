from fastapi.testclient import TestClient


def test_receipts_crud(client: TestClient):
    # list existing
    resp = client.get("/receipts")
    assert resp.status_code == 200

    payload = {
        "merchant": "Test Receipt",
        "date": "2026-02-01",
        "total": 9999,
        "status": "uploading",
        "transactionId": None,
    }
    resp = client.post("/receipts", json=payload)
    assert resp.status_code == 200
    rcpt = resp.json()
    rcpt_id = rcpt.get("receiptId")

    update_payload = payload | {"status": "complete"}
    resp = client.patch(f"/receipts/{rcpt_id}", json=update_payload)
    assert resp.status_code == 200
    assert resp.json().get("status") == "complete"

    # link to a transaction id and ensure it is reflected
    link_payload = payload | {"status": "complete", "transactionId": "txn_link_test"}
    resp = client.patch(f"/receipts/{rcpt_id}", json=link_payload)
    assert resp.status_code == 200
    assert resp.json().get("transactionId") == "txn_link_test"

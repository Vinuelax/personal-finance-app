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

    # link to a real transaction and ensure it is reflected
    txn_resp = client.post("/transactions", json={
        "date": "2026-02-01",
        "merchant": "Linked Merchant",
        "amount": -9999,
        "currency": "CLP",
        "source": "manual",
    })
    assert txn_resp.status_code == 200
    txn_id = txn_resp.json()["txnId"]

    link_payload = payload | {"status": "complete", "transactionId": txn_id}
    resp = client.patch(f"/receipts/{rcpt_id}", json=link_payload)
    assert resp.status_code == 200
    assert resp.json().get("transactionId") == txn_id

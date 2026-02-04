from fastapi.testclient import TestClient


def test_list_transactions(client: TestClient):
    resp = client.get("/api/transactions?limit=5")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) <= 5
    if data:
        first = data[0]
        assert "txnId" in first
        assert "date" in first


def test_create_get_update_delete_transaction(client: TestClient):
    payload = {
        "date": "2026-02-01",
        "merchant": "Test Merchant",
        "description": "",
        "amount": -1234,
        "currency": "CLP",
        "categoryId": None,
        "notes": "",
        "source": "manual",
        "accountId": None,
        "receiptId": None,
    }
    # create
    resp = client.post("/api/transactions", json=payload)
    assert resp.status_code == 200
    created = resp.json()
    txn_id = created["txnId"]

    # get
    resp = client.get(f"/api/transactions/{txn_id}", params={"date": payload["date"]})
    assert resp.status_code == 200
    # update
    payload_update = payload | {"merchant": "Updated Merchant"}
    resp = client.patch(f"/api/transactions/{txn_id}", params={"date": payload["date"]}, json=payload_update)
    assert resp.status_code == 200
    assert resp.json()["merchant"] == "Updated Merchant"

    # delete
    resp = client.delete(f"/api/transactions/{txn_id}", params={"date": payload["date"]})
    assert resp.status_code == 200
    assert resp.json()["deleted"] is True


def test_transactions_filters(client: TestClient):
    # date range
    resp = client.get("/api/transactions", params={"date_from": "2025-11-15", "date_to": "2025-11-16"})
    assert resp.status_code == 200
    data = resp.json()
    for item in data:
        assert "2025-11-15" <= item["date"] <= "2025-11-16"

    # uncategorized only
    resp = client.get("/api/transactions", params={"uncategorized": "true"})
    assert resp.status_code == 200
    data = resp.json()
    for item in data:
        assert item["categoryId"] in (None, "")

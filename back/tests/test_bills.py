from fastapi.testclient import TestClient


def test_list_bills(client: TestClient):
    resp = client.get("/api/bills")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    if data:
        assert "billId" in data[0]


def test_update_bill_status(client: TestClient):
    # find a bill
    resp = client.get("/api/bills")
    data = resp.json()
    if not data:
        return
    bill = data[0]
    bill_id = bill["billId"]
    resp = client.patch(f"/api/bills/{bill_id}", json={"status": "PAID"})
    assert resp.status_code == 200
    assert resp.json().get("status") == "PAID"

    # ensure persisted on subsequent read
    resp = client.get("/api/bills")
    assert any(b["billId"] == bill_id and b.get("status") == "PAID" for b in resp.json())


def test_missing_bill_returns_404(client: TestClient):
    resp = client.patch("/api/bills/nonexistent", json={"status": "PAID"})
    assert resp.status_code == 404

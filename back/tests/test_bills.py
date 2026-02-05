from fastapi.testclient import TestClient


def test_list_bills(client: TestClient):
    resp = client.get("/bills")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    if data:
        assert "billId" in data[0]


def test_update_bill_status(client: TestClient):
    # find a bill
    resp = client.get("/bills")
    data = resp.json()
    if not data:
        return
    bill = data[0]
    bill_id = bill["billId"]
    resp = client.patch(f"/bills/{bill_id}", json={"status": "PAID"})
    assert resp.status_code == 200
    assert resp.json().get("status") == "PAID"

    # ensure persisted on subsequent read
    resp = client.get("/bills")
    assert any(b["billId"] == bill_id and b.get("status") == "PAID" for b in resp.json())


def test_missing_bill_returns_404(client: TestClient):
    resp = client.patch("/bills/nonexistent", json={"status": "PAID"})
    assert resp.status_code == 404

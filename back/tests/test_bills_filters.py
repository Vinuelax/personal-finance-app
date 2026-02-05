from fastapi.testclient import TestClient

def test_bills_date_filter(client: TestClient):
    resp = client.get("/bills", params={"date_from": "2026-02-05", "date_to": "2026-02-20"})
    assert resp.status_code == 200
    data = resp.json()
    for b in data:
        assert "2026-02-05" <= b["dueDate"] <= "2026-02-20"


def test_bills_status_filter(client: TestClient):
    # mark one as PAID first
    resp = client.get("/bills")
    data = resp.json()
    if data:
        bill_id = data[0]["billId"]
        client.patch(f"/bills/{bill_id}", json={"status": "PAID"})
        resp = client.get("/bills", params={"status": "PAID"})
        assert resp.status_code == 200
        filtered = resp.json()
        for b in filtered:
            assert b.get("status") == "PAID"

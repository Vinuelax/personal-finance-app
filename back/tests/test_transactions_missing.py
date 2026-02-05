from fastapi.testclient import TestClient


def test_transaction_not_found(client: TestClient):
    resp = client.get("/transactions/missing-id", params={"date": "2026-01-01"})
    assert resp.status_code == 404

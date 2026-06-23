from fastapi.testclient import TestClient


def test_get_me(client: TestClient):
    resp = client.get("/user/me")
    assert resp.status_code == 200
    body = resp.json()
    assert body["userId"] == "u_001"
    assert body["email"] == "user@example.com"


def test_delete_user_data_keeps_account(client: TestClient):
    resp = client.post(
        "/budgets",
        json={"month": "2026-03", "categoryId": "cat_groceries", "limit": 1000},
    )
    assert resp.status_code == 200

    resp = client.delete("/user/me/data")
    assert resp.status_code == 200
    body = resp.json()
    assert body["deleted"] is True
    assert body["counts"]["budgets"] >= 1
    assert body["counts"]["categories"] >= 1

    # Data is gone...
    resp = client.get("/budgets", params={"month": "2026-03"})
    assert resp.json() == []

    # ...but the account itself still exists.
    resp = client.get("/user/me")
    assert resp.status_code == 200
    assert resp.json()["userId"] == "u_001"

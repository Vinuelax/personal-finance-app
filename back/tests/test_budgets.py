from fastapi.testclient import TestClient


def test_budgets_crud(client: TestClient):
    # list
    resp = client.get("/budgets")
    assert resp.status_code == 200

    payload = {"month": "2026-03", "categoryId": "cat_groceries", "limit": 123456, "rollover": False}
    # create
    resp = client.post("/budgets", json=payload)
    assert resp.status_code == 200

    # update
    payload_update = {"month": "2026-03", "categoryId": "cat_groceries", "limit": 200000, "rollover": True}
    resp = client.patch("/budgets/2026-03/cat_groceries", json=payload_update)
    assert resp.status_code == 200
    # delete
    resp = client.delete("/budgets/2026-03/cat_groceries")
    assert resp.status_code == 200
    assert resp.json().get("deleted") is True

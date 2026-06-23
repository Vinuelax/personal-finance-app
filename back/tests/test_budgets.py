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


def test_budget_date_range_listing(client: TestClient):
    payload = {
        "month": "2026-02",
        "startMonth": "2026-02",
        "endMonth": "2026-04",
        "categoryId": "cat_groceries",
        "limit": 50000,
        "rollover": False,
    }
    resp = client.post("/budgets", json=payload)
    assert resp.status_code == 200

    # A month inside the range resolves the budget and echoes the range.
    resp = client.get("/budgets", params={"month": "2026-03"})
    assert resp.status_code == 200
    inside = {b["categoryId"]: b for b in resp.json()}
    assert "cat_groceries" in inside
    assert inside["cat_groceries"]["startMonth"] == "2026-02"
    assert inside["cat_groceries"]["endMonth"] == "2026-04"

    # A month after end_month no longer sees it.
    resp = client.get("/budgets", params={"month": "2026-05"})
    assert "cat_groceries" not in {b["categoryId"] for b in resp.json()}

    # A month before start_month no longer sees it.
    resp = client.get("/budgets", params={"month": "2026-01"})
    assert "cat_groceries" not in {b["categoryId"] for b in resp.json()}


def test_budget_rejects_inverted_range(client: TestClient):
    payload = {
        "month": "2026-02",
        "startMonth": "2026-06",
        "endMonth": "2026-04",
        "categoryId": "cat_dining",
        "limit": 1000,
    }
    resp = client.post("/budgets", json=payload)
    assert resp.status_code == 400

def _create_category(client, name: str) -> str:
    resp = client.post("/categories", json={"name": name, "icon": "repeat", "color": "#06b6d4"})
    assert resp.status_code == 200
    return resp.json()["categoryId"]


def _upsert_budget(client, month: str, category_id: str, limit: int, **kwargs):
    payload = {
        "month": month,
        "categoryId": category_id,
        "limit": limit,
        "rollover": False,
        "carryForwardEnabled": kwargs.get("carryForwardEnabled", True),
        "isTerminal": kwargs.get("isTerminal", False),
    }
    resp = client.put(f"/budgets/{month}/{category_id}", json=payload)
    assert resp.status_code == 200
    return resp.json()


def test_budget_fallback_respects_carry_forward_disabled(client):
    category_id = _create_category(client, "One Month Only")
    _upsert_budget(client, "2026-01", category_id, 100000, carryForwardEnabled=False)

    jan = client.get("/budgets?month=2026-01")
    feb = client.get("/budgets?month=2026-02")
    assert jan.status_code == 200
    assert feb.status_code == 200
    jan_items = [b for b in jan.json() if b["categoryId"] == category_id]
    feb_items = [b for b in feb.json() if b["categoryId"] == category_id]
    assert len(jan_items) == 1
    assert len(feb_items) == 0


def test_budget_fallback_respects_terminal(client):
    category_id = _create_category(client, "Terminal Budget")
    _upsert_budget(client, "2026-01", category_id, 100000, isTerminal=True)

    jan = client.get("/budgets?month=2026-01")
    mar = client.get("/budgets?month=2026-03")
    assert jan.status_code == 200
    assert mar.status_code == 200
    jan_items = [b for b in jan.json() if b["categoryId"] == category_id]
    mar_items = [b for b in mar.json() if b["categoryId"] == category_id]
    assert len(jan_items) == 1
    assert len(mar_items) == 0


def test_budget_current_month_visible_when_terminal(client):
    category_id = _create_category(client, "Terminal Current Month")
    _upsert_budget(client, "2026-04", category_id, 100000, isTerminal=True, carryForwardEnabled=False)
    resp = client.get("/budgets?month=2026-04")
    assert resp.status_code == 200
    items = [b for b in resp.json() if b["categoryId"] == category_id]
    assert len(items) == 1
    assert items[0]["isTerminal"] is True


def test_create_objective_generates_budget_rows(client):
    payload = {
        "name": "Patagonia Trip",
        "currency": "CLP",
        "plans": [
            {"month": "2025-12", "amount": 700000, "kind": "SPEND", "isLastMonth": False},
            {"month": "2026-01", "amount": 300000, "kind": "SPEND", "isLastMonth": False},
            {"month": "2026-02", "amount": 250000, "kind": "SPEND", "isLastMonth": True},
        ],
    }
    resp = client.post("/objectives", json=payload)
    assert resp.status_code == 200
    objective = resp.json()
    assert objective["name"] == "Patagonia Trip"
    assert len(objective["plans"]) == 3

    feb = client.get("/budgets?month=2026-02")
    assert feb.status_code == 200
    matching = [b for b in feb.json() if b.get("objectiveId") == objective["objectiveId"]]
    assert len(matching) == 1
    assert matching[0]["purpose"] == "Patagonia Trip"
    assert matching[0]["isTerminal"] is False
    assert matching[0]["carryForwardEnabled"] is False


def test_objective_conflict_returns_409_without_force(client):
    category_id = _create_category(client, "Trip Conflict")
    _upsert_budget(client, "2026-01", category_id, 100000)

    resp = client.post("/objectives", json={
        "name": "Trip Conflict",
        "categoryId": category_id,
        "currency": "CLP",
        "plans": [{"month": "2026-01", "amount": 300000, "kind": "SPEND", "isLastMonth": True}],
    })
    assert resp.status_code == 409
    detail = resp.json().get("detail", {})
    assert detail.get("message") == "Budget conflicts"
    assert detail.get("conflicts")


def test_objective_force_overwrite_replaces_conflicts(client):
    category_id = _create_category(client, "Trip Force")
    _upsert_budget(client, "2026-01", category_id, 100000)

    resp = client.post("/objectives?force=true", json={
        "name": "Trip Force",
        "categoryId": category_id,
        "currency": "CLP",
        "plans": [{"month": "2026-01", "amount": 300000, "kind": "SPEND", "isLastMonth": True}],
    })
    assert resp.status_code == 200
    objective_id = resp.json()["objectiveId"]

    jan = client.get("/budgets?month=2026-01")
    assert jan.status_code == 200
    matching = [b for b in jan.json() if b["categoryId"] == category_id]
    assert len(matching) == 1
    assert matching[0]["objectiveId"] == objective_id
    assert matching[0]["limit"] == 300000

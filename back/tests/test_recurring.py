from fastapi.testclient import TestClient


def test_list_recurring(client: TestClient):
    resp = client.get("/api/recurring")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)


def test_create_pause_resume_stop_recurring(client: TestClient):
    payload = {
        "name": "Test Rec",
        "amount": -5000,
        "currency": "CLP",
        "categoryId": None,
        "cadence": "MONTHLY",
        "dayOfMonth": 1,
        "startDate": "2026-02-01",
        "endDate": None,
        "autopostMode": "PROJECT_ONLY",
        "isPaused": False,
    }
    resp = client.post("/api/recurring", json=payload)
    assert resp.status_code == 200
    rule_id = resp.json()["ruleId"]

    resp = client.post(f"/api/recurring/{rule_id}/pause")
    assert resp.status_code == 200
    assert resp.json()["isPaused"] is True

    resp = client.post(f"/api/recurring/{rule_id}/resume")
    assert resp.status_code == 200
    assert resp.json()["isPaused"] is False

    resp = client.post(f"/api/recurring/{rule_id}/stop")
    assert resp.status_code == 200
    assert resp.json()["isPaused"] is True


def test_recurring_validation_error(client: TestClient):
    payload = {
        "name": "Bad Cadence",
        "amount": -1000,
        "currency": "CLP",
        "categoryId": None,
        "cadence": "YEARLY",  # invalid per regex
        "dayOfMonth": 1,
        "startDate": "2026-02-01",
        "endDate": None,
        "autopostMode": "PROJECT_ONLY",
        "isPaused": False,
    }
    resp = client.post("/api/recurring", json=payload)
    assert resp.status_code == 422

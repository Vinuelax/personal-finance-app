from fastapi.testclient import TestClient

def test_login_success(client: TestClient):
    resp = client.post("/auth/login", json={"email": "user@example.com", "password": "pw"})
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("access_token")
    assert data.get("token_type") == "bearer"


def test_login_missing_credentials(client: TestClient):
    resp = client.post("/auth/login", json={"email": "", "password": ""})
    assert resp.status_code == 400

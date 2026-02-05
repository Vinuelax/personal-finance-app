from fastapi.testclient import TestClient

def test_protected_requires_auth(client: TestClient):
    # use a fresh client without auth header
    from app.main import app
    from tests.conftest import SyncASGIClient
    unauth_client = SyncASGIClient(app, base_prefix="/api/v1")
    resp = unauth_client.get("/categories")
    assert resp.status_code == 401

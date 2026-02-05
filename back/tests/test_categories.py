from fastapi.testclient import TestClient


def test_list_categories(client: TestClient):
    resp = client.get("/categories")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) > 0
    assert data[0]["categoryId"].startswith("cat_") or "cat_" in data[0]["categoryId"]


def test_create_update_delete_category(client: TestClient):
    # create
    payload = {"name": "Test Cat", "group": "Test", "icon": "star", "color": "blue"}
    resp = client.post("/categories", json=payload)
    assert resp.status_code == 200
    cat = resp.json()
    cat_id = cat["categoryId"]

    # update
    payload_update = {"name": "Test Cat 2", "group": "Test", "icon": "heart", "color": "red"}
    resp = client.patch(f"/categories/{cat_id}", json=payload_update)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Test Cat 2"

    # delete
    resp = client.delete(f"/categories/{cat_id}")
    assert resp.status_code == 200
    assert resp.json()["deleted"] is True

import os
import shutil
import tempfile
from pathlib import Path

import pytest
import httpx
import anyio
from httpx import ASGITransport

# Ensure we import the app from the back package
from app.main import app
from app.deps import get_db


class SyncASGIClient:
    """Minimal sync wrapper over httpx.AsyncClient + ASGITransport."""

    def __init__(self, app):
        self.transport = ASGITransport(app=app)
        self.base_url = "http://testserver"

    def request(self, method: str, url: str, **kwargs):
        async def _do():
            async with httpx.AsyncClient(transport=self.transport, base_url=self.base_url) as client:
                return await client.request(method, url, **kwargs)
        return anyio.run(_do)

    def get(self, url: str, **kwargs):
        return self.request("GET", url, **kwargs)

    def post(self, url: str, **kwargs):
        return self.request("POST", url, **kwargs)

    def patch(self, url: str, **kwargs):
        return self.request("PATCH", url, **kwargs)

    def delete(self, url: str, **kwargs):
        return self.request("DELETE", url, **kwargs)


def copy_fixture(tmpdir: Path):
    # copy the jsonl fixture into the tmp dir and point DB_JSON_PATH to it
    src = Path(__file__).resolve().parent.parent / "data" / "dummy_db.jsonl"
    dest = tmpdir / "dummy_db.jsonl"
    shutil.copy(src, dest)
    return dest


@pytest.fixture()
def client(monkeypatch):
    with tempfile.TemporaryDirectory() as tmp:
        tmpdir = Path(tmp)
        json_path = copy_fixture(tmpdir)
        monkeypatch.setenv("DB_BACKEND", "jsonl")
        monkeypatch.setenv("DB_JSON_PATH", str(json_path))
        # ensure DB uses the temp file for this test only
        get_db.cache_clear()

        yield SyncASGIClient(app)

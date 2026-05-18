import binascii
import hashlib
import os
import secrets
from typing import Iterator

import pytest
import httpx
import anyio
from httpx import ASGITransport
from testcontainers.postgres import PostgresContainer


class SyncASGIClient:
    """Minimal sync wrapper over httpx.AsyncClient + ASGITransport."""

    def __init__(self, app, base_prefix: str = ""):
        self.transport = ASGITransport(app=app)
        self.base_url = "http://testserver" + base_prefix
        self.auth_header: dict = {}

    def request(self, method: str, url: str, **kwargs):
        async def _do():
            async with httpx.AsyncClient(transport=self.transport, base_url=self.base_url) as client:
                headers = kwargs.pop("headers", {})
                merged = {**self.auth_header, **headers}
                return await client.request(method, url, headers=merged, **kwargs)
        return anyio.run(_do)

    def get(self, url: str, **kwargs):
        return self.request("GET", url, **kwargs)

    def post(self, url: str, **kwargs):
        return self.request("POST", url, **kwargs)

    def patch(self, url: str, **kwargs):
        return self.request("PATCH", url, **kwargs)

    def put(self, url: str, **kwargs):
        return self.request("PUT", url, **kwargs)

    def delete(self, url: str, **kwargs):
        return self.request("DELETE", url, **kwargs)


TEST_USER_ID = "u_001"
TEST_USER_EMAIL = "user@example.com"
TEST_USER_PASSWORD = "pw"
PBKDF2_ITERATIONS = 100_000

# Tables to truncate between tests. Order doesn't matter with CASCADE, but the
# list documents which entities the suite touches.
_RESET_TABLES = (
    "objective_month_plans",
    "budget_rule_month_overrides",
    "budget_rules",
    "budgets",
    "bills",
    "recurring_rules",
    "receipts",
    "transactions",
    "investment_txs",
    "fund_prices",
    "funds",
    "objectives",
    "categories",
    "users",
)


@pytest.fixture(scope="session")
def _postgres_url() -> Iterator[str]:
    """Spin up a real Postgres for the whole test session via testcontainers."""
    with PostgresContainer("postgres:16-alpine") as pg:
        raw_url = pg.get_connection_url()
        # testcontainers defaults to the psycopg2 driver string; the app uses psycopg3.
        url = raw_url.replace("postgresql+psycopg2://", "postgresql+psycopg://")
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+psycopg://", 1)

        os.environ["DATABASE_URL"] = url
        os.environ["DB_BACKEND"] = "postgres"
        # Schema comes from SQLAlchemy models, not from the migration files.
        os.environ["DB_SKIP_SCHEMA_CHECK"] = "true"
        os.environ["ENVIRONMENT"] = "development"
        os.environ.setdefault("AUTH_SECRET", "test-secret")
        os.environ.setdefault("AUTH_ISSUER", "ledger-backend-tests")
        yield url


@pytest.fixture(scope="session")
def _schema(_postgres_url) -> None:
    """Create the full schema once per session."""
    # Import inside the fixture so the env vars set above are visible to
    # back/db/session.py at module load time.
    from db.models import Base
    from db.session import engine

    Base.metadata.create_all(bind=engine)


def _seed_user(session) -> None:
    from db import models

    salt = secrets.token_bytes(16)
    derived_hex = binascii.hexlify(
        hashlib.pbkdf2_hmac("sha256", TEST_USER_PASSWORD.encode(), salt, PBKDF2_ITERATIONS)
    ).decode()
    session.add(models.User(
        id=TEST_USER_ID,
        email=TEST_USER_EMAIL,
        password_algo="PBKDF2-HMAC-SHA256",
        password_salt=salt.hex(),
        password_iterations=PBKDF2_ITERATIONS,
        password_hash=derived_hex,
        currency="CLP",
    ))


def _seed_categories(session) -> None:
    from db import models

    seeds = [
        ("cat_groceries", "Groceries"),
        ("cat_dining", "Dining"),
        ("cat_transport", "Transport"),
    ]
    for cid, name in seeds:
        session.add(models.Category(
            id=cid,
            user_id=TEST_USER_ID,
            name=name,
            kind="expense",
        ))


@pytest.fixture()
def client(_schema) -> Iterator[SyncASGIClient]:
    from sqlalchemy import text

    from app.main import app
    from db.session import SessionLocal
    from utils.deps import create_access_token

    with SessionLocal() as session:
        session.execute(text(
            "TRUNCATE TABLE " + ", ".join(_RESET_TABLES) + " RESTART IDENTITY CASCADE"
        ))
        _seed_user(session)
        _seed_categories(session)
        session.commit()

    cli = SyncASGIClient(app, base_prefix="/api/v1")
    token = create_access_token({"sub": TEST_USER_EMAIL, "user_id": TEST_USER_ID})
    cli.auth_header = {"Authorization": f"Bearer {token}"}
    yield cli

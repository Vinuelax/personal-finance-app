import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from config.db import load_db_config
from .migrations import get_pending_migrations

# Load configuration once
cfg = load_db_config()
DATABASE_URL = cfg.get("database_url") or os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://postgres:postgres@localhost:5432/pfa",
)

# Sync engine keeps FastAPI routes unchanged (they are sync defs today)
engine = create_engine(
    DATABASE_URL,
    future=True,
    echo=False,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def init_db():
    """Create tables if they do not exist.

    Versioned schema changes should be applied via `scripts/migrate_db.py`.
    """
    from .models import Base
    Base.metadata.create_all(bind=engine)

    # Fail fast if the DB is behind code. Migrations are applied explicitly during deploy.
    # Set DB_SKIP_SCHEMA_CHECK=true only for local/dev workflows that intentionally skip migrations.
    skip_check = os.getenv("DB_SKIP_SCHEMA_CHECK", "").strip().lower() in {"1", "true", "yes"}
    if skip_check:
        return

    with engine.begin() as conn:
        pending = get_pending_migrations(conn)
        if pending:
            pending_names = ", ".join(p.name for p in pending)
            raise RuntimeError(
                "Database schema is behind application code. "
                f"Pending migrations: {pending_names}. "
                "Run `python3 scripts/migrate_db.py` before starting the app."
            )

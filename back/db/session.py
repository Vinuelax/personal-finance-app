import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from config.db import load_db_config

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
    """Create tables if they do not exist. Use Alembic in real deployments."""
    from .models import Base
    Base.metadata.create_all(bind=engine)

    # Lightweight, backward-compatible migrations for budgets table
    with engine.begin() as conn:
        conn.exec_driver_sql(
            """
            ALTER TABLE budgets ADD COLUMN IF NOT EXISTS currency TEXT;
            ALTER TABLE budgets ADD COLUMN IF NOT EXISTS rollover_target_category_id TEXT REFERENCES categories(id) ON DELETE SET NULL;
            ALTER TABLE budgets ADD COLUMN IF NOT EXISTS copied_from_month TEXT;
            ALTER TABLE budgets ADD COLUMN IF NOT EXISTS purpose TEXT;
            ALTER TABLE budgets ADD COLUMN IF NOT EXISTS carry_forward_enabled BOOLEAN NOT NULL DEFAULT TRUE;
            ALTER TABLE budgets ADD COLUMN IF NOT EXISTS is_terminal BOOLEAN NOT NULL DEFAULT FALSE;
            ALTER TABLE budgets ADD COLUMN IF NOT EXISTS objective_id TEXT;
            ALTER TABLE objectives ADD COLUMN IF NOT EXISTS total_amount_cents INTEGER;
            """
        )

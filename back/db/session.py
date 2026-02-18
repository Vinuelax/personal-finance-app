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

    # Lightweight, backward-compatible migrations for existing deployments.
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
            ALTER TABLE receipts ADD COLUMN IF NOT EXISTS ocr_provider TEXT;
            ALTER TABLE receipts ADD COLUMN IF NOT EXISTS ocr_confidence NUMERIC(5,4);
            ALTER TABLE receipts ADD COLUMN IF NOT EXISTS ocr_raw_text TEXT;
            ALTER TABLE receipts ADD COLUMN IF NOT EXISTS ocr_raw_blocks JSONB;
            ALTER TABLE receipts ADD COLUMN IF NOT EXISTS ocr_error TEXT;
            ALTER TABLE receipts ADD COLUMN IF NOT EXISTS parsed_receipt JSONB;
            ALTER TABLE receipts ADD COLUMN IF NOT EXISTS needs_review BOOLEAN NOT NULL DEFAULT FALSE;
            """
        )

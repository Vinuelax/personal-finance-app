#!/usr/bin/env python3
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
# Support imports whether invoked directly, from repo root, or via scripts/deploy_backend.sh.
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "back"))

from sqlalchemy import create_engine

from config.db import load_db_config
from back.db.migrations import MIGRATIONS_DIR, apply_pending_migrations, list_migration_files


def get_database_url() -> str:
    cfg = load_db_config()
    return cfg.get("database_url") or os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://postgres:postgres@localhost:5432/pfa",
    )


def main() -> int:
    engine = create_engine(get_database_url(), future=True, pool_pre_ping=True)

    files = list_migration_files()
    if not files:
        print(f"No migration files found in {MIGRATIONS_DIR}")
        return 0

    with engine.begin() as conn:
        applied_now = apply_pending_migrations(conn)
        if not applied_now:
            print("No pending migrations.")
            return 0

        for name in applied_now:
            print(f"Applied {name}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""In-image migration entrypoint: `python -m db.migrate`.

Applies pending SQL migrations against DATABASE_URL. Used by the `migrate`
one-shot service in docker-compose.prod.yml before the API starts. The
repo-checkout equivalent for the Lambda deploy is `scripts/migrate_db.py`.
"""
import os

from sqlalchemy import create_engine

from config.db import load_db_config
from db.migrations import MIGRATIONS_DIR, apply_pending_migrations, list_migration_files


def main() -> int:
    cfg = load_db_config()
    url = cfg.get("database_url") or os.environ["DATABASE_URL"]
    engine = create_engine(url, future=True, pool_pre_ping=True)

    if not list_migration_files():
        print(f"No migration files found in {MIGRATIONS_DIR}")
        return 0

    with engine.begin() as conn:
        applied = apply_pending_migrations(conn)
    print("Applied: " + (", ".join(applied) if applied else "none (up to date)"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

from pathlib import Path

from sqlalchemy import text


ROOT = Path(__file__).resolve().parents[2]
MIGRATIONS_DIR = ROOT / "back" / "db" / "migrations"


def ensure_schema_migrations_table(conn) -> None:
    conn.exec_driver_sql(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )


def list_migration_files() -> list[Path]:
    if not MIGRATIONS_DIR.exists():
        return []
    files = [p for p in MIGRATIONS_DIR.iterdir() if p.is_file() and p.suffix == ".sql"]
    return sorted(files, key=lambda p: p.name)


def get_applied_versions(conn) -> set[str]:
    rows = conn.execute(text("SELECT version FROM schema_migrations")).fetchall()
    return {row[0] for row in rows}


def get_pending_migrations(conn) -> list[Path]:
    ensure_schema_migrations_table(conn)
    applied = get_applied_versions(conn)
    return [p for p in list_migration_files() if p.name not in applied]


def apply_migration(conn, path: Path) -> None:
    sql = path.read_text(encoding="utf-8")
    conn.exec_driver_sql(sql)
    conn.execute(
        text("INSERT INTO schema_migrations(version) VALUES (:version)"),
        {"version": path.name},
    )


def apply_pending_migrations(conn) -> list[str]:
    pending = get_pending_migrations(conn)
    applied_now: list[str] = []
    for path in pending:
        apply_migration(conn, path)
        applied_now.append(path.name)
    return applied_now

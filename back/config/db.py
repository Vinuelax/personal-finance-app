import os
from pathlib import Path
from typing import Literal, TypedDict

DBBackend = Literal["jsonl", "dynamodb", "postgres"]


class DBConfig(TypedDict, total=False):
    backend: DBBackend
    json_path: Path
    table_prefix: str | None
    database_url: str


def _load_env_from_file() -> None:
    """
    Load key=value pairs from .env.dev (or .env) when running locally without docker-compose.
    Only fills vars that are currently unset, so compose-provided env still wins.
    """
    if "DB_BACKEND" in os.environ and ("DB_JSON_PATH" in os.environ or "DATABASE_URL" in os.environ):
        return  # already configured, nothing to do

    candidate_roots = [
        Path.cwd(),
        Path(__file__).resolve().parent.parent,           # /app when running inside back/
        Path(__file__).resolve().parent.parent.parent,    # repo root when invoked from back/
    ]
    for root in candidate_roots:
        for name in (".env.dev", ".env"):
            env_path = root / name
            if not env_path.exists():
                continue
            for line in env_path.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip()
                os.environ.setdefault(key, value)
            return


def load_db_config() -> DBConfig:
    _load_env_from_file()
    backend: DBBackend = os.getenv("DB_BACKEND", "postgres").lower()  # default to postgres now

    cfg: DBConfig = {"backend": backend}

    backend_root = Path(__file__).resolve().parent.parent
    if backend == "jsonl":
        env_path_value = os.getenv("DB_JSON_PATH", backend_root / "data" / "dummy_db.jsonl")
        raw_path = Path(env_path_value)
        json_path = (backend_root / raw_path).resolve() if not raw_path.is_absolute() else raw_path
        cfg["json_path"] = json_path
    elif backend == "postgres":
        cfg["database_url"] = os.getenv(
            "DATABASE_URL",
            "postgresql+psycopg://postgres:postgres@localhost:5432/pfa",  # sensible default
        )

    table_prefix = os.getenv("DB_TABLE_PREFIX")
    cfg["table_prefix"] = table_prefix
    return cfg


def ensure_dummy_file(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        # For jsonl we start with an empty file
        path.write_text("", encoding="utf-8")


__all__ = ["DBConfig", "load_db_config", "ensure_dummy_file", "DBBackend"]

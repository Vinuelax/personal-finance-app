import json
import os
from pathlib import Path
from typing import Literal, TypedDict, Any

DBBackend = Literal["jsonl", "dynamodb"]


class DBConfig(TypedDict):
    backend: DBBackend
    json_path: Path
    table_prefix: str | None


def load_db_config() -> DBConfig:
    backend: DBBackend = os.getenv("DB_BACKEND", "jsonl").lower()  # switch to "dynamodb" later
    default_json_path = Path(os.getenv("DB_JSON_PATH", Path(__file__).resolve().parent.parent / "data" / "dummy_db.jsonl"))
    json_path = Path(default_json_path)
    table_prefix = os.getenv("DB_TABLE_PREFIX")
    return DBConfig(backend=backend, json_path=json_path, table_prefix=table_prefix)


def ensure_dummy_file(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        # For jsonl we start with an empty file
        path.write_text("", encoding="utf-8")


__all__ = ["DBConfig", "load_db_config", "ensure_dummy_file", "DBBackend"]

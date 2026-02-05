import json
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import uuid

from config.db import load_db_config, ensure_dummy_file, DBConfig

_lock = threading.Lock()


class JsonlDB:
    """Lightweight newline-delimited JSON store that mirrors DynamoDB PK/SK layout."""

    def __init__(self, config: DBConfig):
        self.path: Path = config["json_path"]
        ensure_dummy_file(self.path)

    def _read_lines(self) -> List[Dict[str, Any]]:
        with self.path.open("r", encoding="utf-8") as f:
            return [json.loads(line) for line in f if line.strip()]

    def _write_lines(self, items: List[Dict[str, Any]]) -> None:
        with self.path.open("w", encoding="utf-8") as f:
            for item in items:
                f.write(json.dumps(item) + "\n")

    # ---- Dynamo-ish helpers ----
    def query(self, pk: str, begins_with: str | None = None) -> List[Dict[str, Any]]:
        """Return all items with PK match; optionally filter SK by prefix."""
        with _lock:
            rows = self._read_lines()
            return [
                r for r in rows
                if r.get("PK") == pk and (begins_with is None or str(r.get("SK", "")).startswith(begins_with))
            ]

    def get_item(self, pk: str, sk: str) -> Optional[Dict[str, Any]]:
        with _lock:
            rows = self._read_lines()
            return next((r for r in rows if r.get("PK") == pk and r.get("SK") == sk), None)

    # GSI lookups (linear scan locally; in Dynamo these would be indexed)
    def gsi_query(self, gsi_pk: str, begins_with: str | None = None, index: str = "GSI1") -> List[Dict[str, Any]]:
        pk_key = f"{index}PK"
        sk_key = f"{index}SK"
        with _lock:
            rows = self._read_lines()
            return [
                r for r in rows
                if r.get(pk_key) == gsi_pk and (begins_with is None or str(r.get(sk_key, "")).startswith(begins_with))
            ]

    # ---- Mutations for dev only ----
    def put(self, item: Dict[str, Any]) -> Dict[str, Any]:
        with _lock:
            rows = self._read_lines()
            rows.append(item)
            self._write_lines(rows)
            return item

    def delete(self, pk: str, sk: str) -> bool:
        with _lock:
            rows = self._read_lines()
            new_rows = [r for r in rows if not (r.get("PK") == pk and r.get("SK") == sk)]
            changed = len(new_rows) != len(rows)
            if changed:
                self._write_lines(new_rows)
            return changed

    def update(self, pk: str, sk: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Shallow merge update by PK/SK."""
        with _lock:
            rows = self._read_lines()
            for idx, r in enumerate(rows):
                if r.get("PK") == pk and r.get("SK") == sk:
                    rows[idx] = {**r, **updates}
                    self._write_lines(rows)
                    return rows[idx]
            return None


class DB:
    """Facade to allow swapping to DynamoDB later."""

    def __init__(self, config: DBConfig | None = None):
        self.config = config or load_db_config()
        if self.config["backend"] == "jsonl":
            self.impl = JsonlDB(self.config)
        else:
            # Placeholder for future DynamoDB implementation
            raise NotImplementedError("DynamoDB backend not implemented yet")

    # Read helpers
    def query(self, pk: str, begins_with: str | None = None):
        return self.impl.query(pk, begins_with)

    def get_item(self, pk: str, sk: str):
        return self.impl.get_item(pk, sk)

    def gsi_query(self, gsi_pk: str, begins_with: str | None = None, index: str = "GSI1"):
        return self.impl.gsi_query(gsi_pk, begins_with, index=index)

    # Write helpers (dev only)
    def put(self, item: Dict[str, Any]) -> Dict[str, Any]:
        return self.impl.put(item)

    def delete(self, pk: str, sk: str) -> bool:
        return self.impl.delete(pk, sk)

    def update(self, pk: str, sk: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        return self.impl.update(pk, sk, updates)


__all__ = ["DB", "JsonlDB"]


# ---------- Domain convenience helpers for endpoints ----------

def _user_pk(user_id: str) -> str:
    return f"USER#{user_id}"


def list_categories(db: DB, user_id: str) -> List[Dict[str, Any]]:
    """Return all categories for a user."""
    return db.query(_user_pk(user_id), begins_with="CAT#")


def list_budgets(db: DB, user_id: str, month: str | None = None) -> List[Dict[str, Any]]:
    """Return budgets; filter by YYYY-MM month prefix if provided."""
    prefix = f"BUD#{month}" if month else "BUD#"
    return db.query(_user_pk(user_id), begins_with=prefix)


def list_recurring_rules(db: DB, user_id: str) -> List[Dict[str, Any]]:
    return db.query(_user_pk(user_id), begins_with="REC#")


def list_bills(
    db: DB,
    user_id: str,
    date_from: str | None = None,
    date_to: str | None = None,
    status: str | None = None,
) -> List[Dict[str, Any]]:
    """Scan upcoming bills using GSI3 (date-sorted)."""
    items = db.gsi_query(f"{_user_pk(user_id)}#UPCOMING", begins_with="DATE#", index="GSI3")
    # keep only bill instances
    items = [i for i in items if i.get("entityType") == "BillInstance"]
    def within_date(item: Dict[str, Any]) -> bool:
        due = item.get("dueDate")
        if not due:
            return False
        if date_from and due < date_from:
            return False
        if date_to and due > date_to:
            return False
        return True
    res = [i for i in items if within_date(i)]
    if status:
        res = [i for i in res if i.get("status") == status.upper()]
    return res


def list_transactions(
    db: DB,
    user_id: str,
    date_from: str | None = None,
    date_to: str | None = None,
    category_id: str | None = None,
    uncategorized_only: bool = False,
    limit: int | None = None,
) -> List[Dict[str, Any]]:
    """Date-ordered transaction feed via GSI1."""
    items = db.gsi_query(_user_pk(user_id), begins_with="DATE#", index="GSI1")
    def keep(item: Dict[str, Any]) -> bool:
        if item.get("entityType") != "Transaction":
            return False
        date = item.get("date")
        if date_from and date < date_from:
            return False
        if date_to and date > date_to:
            return False
        if uncategorized_only and item.get("categoryId"):
            return False
        if category_id and item.get("categoryId") != category_id:
            return False
        return True
    filtered = [i for i in items if keep(i)]
    return filtered[:limit] if limit else filtered


def get_transaction(db: DB, user_id: str, txn_id: str, date: str) -> Optional[Dict[str, Any]]:
    return db.get_item(_user_pk(user_id), f"TX#{date}#{txn_id}")


def create_transaction(
    db: DB,
    user_id: str,
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    txn_id = payload.get("txnId") or f"txn_{uuid.uuid4().hex[:12]}"
    date = payload["date"]
    item = {
        **payload,
        "PK": _user_pk(user_id),
        "SK": f"TX#{date}#{txn_id}",
        "entityType": "Transaction",
        "txnId": txn_id,
        "GSI1PK": _user_pk(user_id),
        "GSI1SK": f"DATE#{date}#TX#{txn_id}",
    }
    # mark uncategorized for GSI2 if no category
    if not item.get("categoryId"):
        item["GSI2PK"] = f"{_user_pk(user_id)}#UNCAT"
        item["GSI2SK"] = f"DATE#{date}#TX#{txn_id}"
    return db.put(item)


def delete_transaction(db: DB, user_id: str, txn_id: str, date: str) -> bool:
    return db.delete(_user_pk(user_id), f"TX#{date}#{txn_id}")


def list_receipts(db: DB, user_id: str) -> List[Dict[str, Any]]:
    return db.query(_user_pk(user_id), begins_with="RCPT#")

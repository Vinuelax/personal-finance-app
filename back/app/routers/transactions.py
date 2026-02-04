from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from datetime import datetime, timezone

from app.deps import get_db
from utils.db import DB, list_transactions, get_transaction, create_transaction, delete_transaction

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


class TransactionIn(BaseModel):
    date: str
    merchant: str
    description: Optional[str] = ""
    amount: int
    currency: str = "CLP"
    categoryId: Optional[str] = None
    notes: Optional[str] = ""
    source: str = "manual"
    accountId: Optional[str] = None
    receiptId: Optional[str] = None


class TransactionOut(TransactionIn):
    txnId: str


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("", response_model=List[TransactionOut])
def api_list_transactions(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    category_id: Optional[str] = None,
    uncategorized: bool = False,
    limit: Optional[int] = None,
    user_id: str = Query("u_001"),
    db: DB = Depends(get_db),
):
    items = list_transactions(db, user_id, date_from, date_to, category_id, uncategorized, limit)
    return [
        {
            "txnId": i.get("txnId"),
            "date": i.get("date"),
            "merchant": i.get("merchant"),
            "description": i.get("description"),
            "amount": i.get("amount"),
            "currency": i.get("currency"),
            "categoryId": i.get("categoryId"),
            "notes": i.get("notes", ""),
            "source": i.get("source"),
            "accountId": i.get("accountId"),
            "receiptId": i.get("receiptId"),
        }
        for i in items
    ]


@router.post("", response_model=TransactionOut)
def api_create_transaction(payload: TransactionIn, user_id: str = Query("u_001"), db: DB = Depends(get_db)):
    created = create_transaction(db, user_id, payload.model_dump())
    return {k: created.get(k) for k in ["txnId", "date", "merchant", "description", "amount", "currency", "categoryId", "notes", "source", "accountId", "receiptId"]}


@router.get("/{txn_id}", response_model=TransactionOut)
def api_get_transaction(txn_id: str, date: str, user_id: str = Query("u_001"), db: DB = Depends(get_db)):
    item = get_transaction(db, user_id, txn_id, date)
    if not item:
        raise HTTPException(404, "Transaction not found")
    return {k: item.get(k) for k in ["txnId", "date", "merchant", "description", "amount", "currency", "categoryId", "notes", "source", "accountId", "receiptId"]}


@router.patch("/{txn_id}", response_model=TransactionOut)
def api_update_transaction(txn_id: str, payload: TransactionIn, date: str, user_id: str = Query("u_001"), db: DB = Depends(get_db)):
    pk = f"USER#{user_id}"
    sk = f"TX#{date}#{txn_id}"
    updated = db.update(pk, sk, {**payload.model_dump(), "updatedAt": _now_iso()})
    if not updated:
        raise HTTPException(404, "Transaction not found")
    return {k: updated.get(k) for k in ["txnId", "date", "merchant", "description", "amount", "currency", "categoryId", "notes", "source", "accountId", "receiptId"]}


@router.delete("/{txn_id}")
def api_delete_transaction(txn_id: str, date: str, user_id: str = Query("u_001"), db: DB = Depends(get_db)):
    ok = delete_transaction(db, user_id, txn_id, date)
    if not ok:
        raise HTTPException(404, "Transaction not found")
    return {"deleted": True}

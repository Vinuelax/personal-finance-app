from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
import uuid
from datetime import datetime, timezone

from app.deps import get_db
from utils.db import DB, list_receipts

router = APIRouter(prefix="/api/receipts", tags=["receipts"])


class ReceiptIn(BaseModel):
    merchant: str
    date: str
    total: int
    status: str = "uploading"
    transactionId: Optional[str] = None


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("")
def api_list_receipts(user_id: str = Query("u_001"), db: DB = Depends(get_db)):
    return list_receipts(db, user_id)


@router.post("")
def api_create_receipt(payload: ReceiptIn, user_id: str = Query("u_001"), db: DB = Depends(get_db)):
    rcpt_id = f"rcpt_{uuid.uuid4().hex[:8]}"
    item = {
        "PK": f"USER#{user_id}",
        "SK": f"RCPT#{rcpt_id}",
        "entityType": "Receipt",
        "receiptId": rcpt_id,
        **payload.model_dump(),
        "createdAt": _now_iso(),
        "updatedAt": _now_iso(),
    }
    db.put(item)
    return item


@router.patch("/{receipt_id}")
def api_update_receipt(receipt_id: str, payload: ReceiptIn, user_id: str = Query("u_001"), db: DB = Depends(get_db)):
    pk = f"USER#{user_id}"
    sk = f"RCPT#{receipt_id}"
    updated = db.update(pk, sk, {**payload.model_dump(), "updatedAt": _now_iso()})
    if not updated:
        raise HTTPException(404, "Receipt not found")
    return updated

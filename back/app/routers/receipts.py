from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import uuid
from datetime import datetime, timezone

from utils.deps import get_db, get_current_user
from utils.db import DB, list_receipts

router = APIRouter(tags=["receipts"])


class ReceiptIn(BaseModel):
    merchant: str
    date: str
    total: int
    status: str = "uploading"
    transactionId: Optional[str] = None


class ReceiptPatch(BaseModel):
    merchant: Optional[str] = None
    date: Optional[str] = None
    total: Optional[int] = None
    status: Optional[str] = None
    transactionId: Optional[str] = None


class ReceiptOut(ReceiptIn):
    receiptId: str
    createdAt: str | None = None
    updatedAt: str | None = None


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _public_receipt(item: dict) -> ReceiptOut:
    return ReceiptOut(
        receiptId=item.get("receiptId"),
        merchant=item.get("merchant", ""),
        date=item.get("date", ""),
        total=item.get("total", 0),
        status=item.get("status", ""),
        transactionId=item.get("transactionId"),
        createdAt=item.get("createdAt"),
        updatedAt=item.get("updatedAt"),
    )


@router.get("", response_model=List[ReceiptOut])
def api_list_receipts(current_user=Depends(get_current_user), db: DB = Depends(get_db)):
    items = list_receipts(db, current_user["user_id"])
    return [_public_receipt(i) for i in items]


@router.post("", response_model=ReceiptOut)
def api_create_receipt(payload: ReceiptIn, current_user=Depends(get_current_user), db: DB = Depends(get_db)):
    rcpt_id = f"rcpt_{uuid.uuid4().hex[:8]}"
    item = {
        "PK": f"USER#{current_user['user_id']}",
        "SK": f"RCPT#{rcpt_id}",
        "entityType": "Receipt",
        "receiptId": rcpt_id,
        **payload.model_dump(),
        "createdAt": _now_iso(),
        "updatedAt": _now_iso(),
    }
    db.put(item)
    return _public_receipt(item)


@router.patch("/{receipt_id}", response_model=ReceiptOut)
def api_update_receipt(receipt_id: str, payload: ReceiptPatch, current_user=Depends(get_current_user), db: DB = Depends(get_db)):
    pk = f"USER#{current_user['user_id']}"
    sk = f"RCPT#{receipt_id}"
    updates = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    updates["updatedAt"] = _now_iso()
    updated = db.update(pk, sk, updates)
    if not updated:
        raise HTTPException(404, "Receipt not found")
    return _public_receipt(updated)

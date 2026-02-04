from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from datetime import datetime, timezone

from app.deps import get_db
from utils.db import DB, list_bills

router = APIRouter(prefix="/api/bills", tags=["bills"])


class BillUpdate(BaseModel):
    status: Optional[str] = None
    amount: Optional[int] = None


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("")
def api_list_bills(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    status: Optional[str] = None,
    user_id: str = Query("u_001"),
    db: DB = Depends(get_db),
):
    return list_bills(db, user_id, date_from, date_to, status)


@router.patch("/{bill_id}")
def api_update_bill(bill_id: str, payload: BillUpdate, user_id: str = Query("u_001"), db: DB = Depends(get_db)):
    pk = f"USER#{user_id}"
    items = db.query(pk, begins_with="BILL#")
    target = next((i for i in items if i.get("billId") == bill_id), None)
    if not target:
        raise HTTPException(404, "Bill not found")
    updated = db.update(
        pk,
        target["SK"],
        {**{k: v for k, v in payload.model_dump().items() if v is not None}, "updatedAt": _now_iso()},
    )
    return updated

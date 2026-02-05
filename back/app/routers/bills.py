from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone

from utils.deps import get_db, get_current_user
from utils.db import DB, list_bills

router = APIRouter(tags=["bills"])


class BillUpdate(BaseModel):
    status: Optional[str] = None
    amount: Optional[int] = None


class BillOut(BaseModel):
    billId: str
    ruleId: str | None = None
    name: str | None = None
    dueDate: str | None = None
    amount: int | None = None
    currency: str | None = None
    categoryId: str | None = None
    status: str | None = None
    linkedTxnId: str | None = None
    createdAt: str | None = None
    updatedAt: str | None = None


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _public_bill(item: dict) -> BillOut:
    return BillOut(
        billId=item.get("billId"),
        ruleId=item.get("ruleId"),
        name=item.get("name"),
        dueDate=item.get("dueDate"),
        amount=item.get("amount"),
        currency=item.get("currency"),
        categoryId=item.get("categoryId"),
        status=item.get("status"),
        linkedTxnId=item.get("linkedTxnId"),
        createdAt=item.get("createdAt"),
        updatedAt=item.get("updatedAt"),
    )


@router.get("", response_model=List[BillOut])
def api_list_bills(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    status: Optional[str] = None,
    current_user=Depends(get_current_user),
    db: DB = Depends(get_db),
):
    items = list_bills(db, current_user["user_id"], date_from, date_to, status)
    return [_public_bill(i) for i in items]


@router.patch("/{bill_id}", response_model=BillOut)
def api_update_bill(bill_id: str, payload: BillUpdate, current_user=Depends(get_current_user), db: DB = Depends(get_db)):
    pk = f"USER#{current_user['user_id']}"
    items = db.query(pk, begins_with="BILL#")
    target = next((i for i in items if i.get("billId") == bill_id), None)
    if not target:
        raise HTTPException(404, "Bill not found")
    updated = db.update(
        pk,
        target["SK"],
        {**{k: v for k, v in payload.model_dump().items() if v is not None}, "updatedAt": _now_iso()},
    )
    return _public_bill(updated)

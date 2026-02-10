from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime, timezone

from utils.deps import get_db, get_current_user
from utils.db import DB, list_bills

router = APIRouter(tags=["bills"])


class BillUpdate(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "status": "PAID",
            "amount": -85000
        }
    })

    status: Optional[str] = Field(None, description="New status (e.g. PROJECTED, DUE, PAID)")
    amount: Optional[int] = Field(None, description="Updated amount in minor units")


class BillOut(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "billId": "bill_0007",
            "ruleId": "rec_util",
            "name": "Utilities",
            "dueDate": "2026-03-10",
            "amount": -85000,
            "currency": "CLP",
            "categoryId": "cat_utilities",
            "status": "PROJECTED",
            "linkedTxnId": None,
            "createdAt": "2026-01-20T00:00:00Z",
            "updatedAt": "2026-01-20T00:00:00Z"
        }
    })

    billId: str = Field(..., description="Bill instance identifier")
    ruleId: str | None = Field(None, description="Origin recurring rule ID, if any")
    name: str | None = Field(None, description="Bill name")
    dueDate: str | None = Field(None, description="Due date YYYY-MM-DD")
    amount: int | None = Field(None, description="Amount in minor units (negative for payables)")
    currency: str | None = Field(None, description="ISO currency code")
    categoryId: str | None = Field(None, description="Category ID")
    status: str | None = Field(None, description="Bill status")
    linkedTxnId: str | None = Field(None, description="Linked transaction ID")
    createdAt: str | None = Field(None, description="Creation timestamp (ISO8601)")
    updatedAt: str | None = Field(None, description="Last update timestamp (ISO8601)")


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


@router.get(
    "",
    response_model=List[BillOut],
    summary="List bills",
    description="List bill instances for the authenticated user, optionally filtered by date range or status."
)
def api_list_bills(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    status: Optional[str] = None,
    current_user=Depends(get_current_user),
    db: DB = Depends(get_db),
):
    items = list_bills(db, current_user["user_id"], date_from, date_to, status)
    return [_public_bill(i) for i in items]


@router.patch(
    "/{bill_id}",
    response_model=BillOut,
    summary="Update bill",
    description="Update bill amount or status."
)
def api_update_bill(bill_id: str, payload: BillUpdate, current_user=Depends(get_current_user), db: DB = Depends(get_db)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    updated = db.update_bill(current_user["user_id"], bill_id, updates)
    if not updated:
        raise HTTPException(404, "Bill not found")
    return _public_bill(updated)

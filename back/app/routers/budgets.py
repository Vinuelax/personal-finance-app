from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from datetime import datetime

from app.deps import get_db
from utils.db import DB, list_budgets

router = APIRouter(prefix="/api/budgets", tags=["budgets"])


class BudgetIn(BaseModel):
    month: str
    categoryId: str
    limit: int
    rollover: bool = False


class Budget(BudgetIn):
    pass


def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


@router.get("", response_model=List[Budget])
def api_list_budgets(month: Optional[str] = None, user_id: str = Query("u_001"), db: DB = Depends(get_db)):
    items = list_budgets(db, user_id, month)
    return [
        {
            "month": i.get("month"),
            "categoryId": i.get("categoryId"),
            "limit": i.get("limit"),
            "rollover": i.get("rollover", False),
        }
        for i in items
    ]


@router.post("", response_model=Budget)
def api_create_budget(payload: BudgetIn, user_id: str = Query("u_001"), db: DB = Depends(get_db)):
    sk = f"BUD#{payload.month}#{payload.categoryId}"
    item = {
        "PK": f"USER#{user_id}",
        "SK": sk,
        "entityType": "Budget",
        **payload.dict(),
        "createdAt": _now_iso(),
        "updatedAt": _now_iso(),
    }
    db.put(item)
    return payload


@router.patch("/{month}/{category_id}", response_model=Budget)
def api_update_budget(month: str, category_id: str, payload: BudgetIn, user_id: str = Query("u_001"), db: DB = Depends(get_db)):
    pk = f"USER#{user_id}"
    sk = f"BUD#{month}#{category_id}"
    updated = db.update(pk, sk, {**payload.dict(), "updatedAt": _now_iso()})
    if not updated:
        raise HTTPException(404, "Budget not found")
    return payload


@router.delete("/{month}/{category_id}")
def api_delete_budget(month: str, category_id: str, user_id: str = Query("u_001"), db: DB = Depends(get_db)):
    ok = db.delete(f"USER#{user_id}", f"BUD#{month}#{category_id}")
    if not ok:
        raise HTTPException(404, "Budget not found")
    return {"deleted": True}

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone

from utils.deps import get_db, get_current_user
from utils.db import DB, list_budgets

router = APIRouter(tags=["budgets"])


class BudgetIn(BaseModel):
    month: str
    categoryId: str
    limit: int
    rollover: bool = False


class BudgetUpdate(BaseModel):
    limit: Optional[int] = None
    rollover: Optional[bool] = None


class Budget(BudgetIn):
    pass


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("", response_model=List[Budget])
def api_list_budgets(month: Optional[str] = None, current_user=Depends(get_current_user), db: DB = Depends(get_db)):
    items = list_budgets(db, current_user["user_id"], month)
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
def api_create_budget(payload: BudgetIn, current_user=Depends(get_current_user), db: DB = Depends(get_db)):
    sk = f"BUD#{payload.month}#{payload.categoryId}"
    item = {
        "PK": f"USER#{current_user['user_id']}",
        "SK": sk,
        "entityType": "Budget",
        **payload.model_dump(),
        "createdAt": _now_iso(),
        "updatedAt": _now_iso(),
    }
    db.put(item)
    return payload


@router.patch("/{month}/{category_id}", response_model=Budget)
def api_update_budget(month: str, category_id: str, payload: BudgetUpdate, current_user=Depends(get_current_user), db: DB = Depends(get_db)):
    pk = f"USER#{current_user['user_id']}"
    sk = f"BUD#{month}#{category_id}"
    updates = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    updates["updatedAt"] = _now_iso()
    updated = db.update(pk, sk, updates)
    if not updated:
        raise HTTPException(404, "Budget not found")
    return {
        "month": month,
        "categoryId": category_id,
        "limit": updated.get("limit"),
        "rollover": updated.get("rollover", False),
    }


@router.delete("/{month}/{category_id}")
def api_delete_budget(month: str, category_id: str, current_user=Depends(get_current_user), db: DB = Depends(get_db)):
    ok = db.delete(f"USER#{current_user['user_id']}", f"BUD#{month}#{category_id}")
    if not ok:
        raise HTTPException(404, "Budget not found")
    return {"deleted": True}

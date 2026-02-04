from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
import uuid
from datetime import datetime, timezone

from app.deps import get_db
from utils.db import DB, list_recurring_rules

router = APIRouter(prefix="/api/recurring", tags=["recurring"])


class RecurringRuleIn(BaseModel):
    name: str
    amount: int
    currency: str = "CLP"
    categoryId: str | None = None
    cadence: str = Field(..., pattern="^(MONTHLY|WEEKLY)$")
    dayOfMonth: int | None = None
    startDate: str
    endDate: str | None = None
    autopostMode: str = "PROJECT_ONLY"
    isPaused: bool = False


class RecurringRule(RecurringRuleIn):
    ruleId: str


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("", response_model=List[RecurringRule])
def api_list_recurring(user_id: str = Query("u_001"), db: DB = Depends(get_db)):
    items = list_recurring_rules(db, user_id)
    results: List[dict] = []
    for i in items:
        results.append({
            "ruleId": i.get("ruleId"),
            "name": i.get("name"),
            "amount": i.get("amount"),
            "currency": i.get("currency"),
            "categoryId": i.get("categoryId"),
            "cadence": i.get("cadence"),
            "dayOfMonth": i.get("dayOfMonth"),
            "startDate": i.get("startDate"),
            "endDate": i.get("endDate"),
            "autopostMode": i.get("autopostMode"),
            "isPaused": i.get("isPaused"),
        })
    return results


@router.post("", response_model=RecurringRule)
def api_create_recurring(payload: RecurringRuleIn, user_id: str = Query("u_001"), db: DB = Depends(get_db)):
    rule_id = f"rec_{uuid.uuid4().hex[:8]}"
    item = {
        "PK": f"USER#{user_id}",
        "SK": f"REC#{rule_id}",
        "entityType": "RecurringRule",
        "ruleId": rule_id,
        **payload.model_dump(),
        "createdAt": _now_iso(),
        "updatedAt": _now_iso(),
    }
    db.put(item)
    return {"ruleId": rule_id, **payload.model_dump()}


@router.patch("/{rule_id}", response_model=RecurringRule)
def api_update_recurring(rule_id: str, payload: RecurringRuleIn, user_id: str = Query("u_001"), db: DB = Depends(get_db)):
    updated = db.update(f"USER#{user_id}", f"REC#{rule_id}", {**payload.model_dump(), "updatedAt": _now_iso()})
    if not updated:
        raise HTTPException(404, "Recurring rule not found")
    return {"ruleId": rule_id, **payload.dict()}


@router.post("/{rule_id}/pause")
def api_pause_recurring(rule_id: str, user_id: str = Query("u_001"), db: DB = Depends(get_db)):
    updated = db.update(f"USER#{user_id}", f"REC#{rule_id}", {"isPaused": True, "updatedAt": _now_iso()})
    if not updated:
        raise HTTPException(404, "Recurring rule not found")
    return {"ruleId": rule_id, "isPaused": True}


@router.post("/{rule_id}/resume")
def api_resume_recurring(rule_id: str, user_id: str = Query("u_001"), db: DB = Depends(get_db)):
    updated = db.update(f"USER#{user_id}", f"REC#{rule_id}", {"isPaused": False, "updatedAt": _now_iso()})
    if not updated:
        raise HTTPException(404, "Recurring rule not found")
    return {"ruleId": rule_id, "isPaused": False}


@router.post("/{rule_id}/stop")
def api_stop_recurring(rule_id: str, user_id: str = Query("u_001"), db: DB = Depends(get_db)):
    today = datetime.now(timezone.utc).date().isoformat()
    updated = db.update(f"USER#{user_id}", f"REC#{rule_id}", {"endDate": today, "isPaused": True, "updatedAt": _now_iso()})
    if not updated:
        raise HTTPException(404, "Recurring rule not found")
    return {"ruleId": rule_id, "endDate": today, "isPaused": True}

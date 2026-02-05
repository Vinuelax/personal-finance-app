from typing import List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
import uuid
from datetime import datetime, timezone

from utils.deps import get_db, get_current_user
from utils.db import DB, list_recurring_rules

router = APIRouter(tags=["recurring"])


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
    createdAt: str | None = None
    updatedAt: str | None = None


class RecurringToggle(BaseModel):
    ruleId: str
    isPaused: bool
    endDate: str | None = None
    updatedAt: str | None = None


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _public_rule(item: dict) -> RecurringRule:
    return RecurringRule(
        ruleId=item.get("ruleId"),
        name=item.get("name"),
        amount=item.get("amount"),
        currency=item.get("currency"),
        categoryId=item.get("categoryId"),
        cadence=item.get("cadence"),
        dayOfMonth=item.get("dayOfMonth"),
        startDate=item.get("startDate"),
        endDate=item.get("endDate"),
        autopostMode=item.get("autopostMode"),
        isPaused=item.get("isPaused"),
        createdAt=item.get("createdAt"),
        updatedAt=item.get("updatedAt"),
    )


def _public_toggle(item: dict) -> RecurringToggle:
    return RecurringToggle(
        ruleId=item.get("ruleId"),
        isPaused=item.get("isPaused"),
        endDate=item.get("endDate"),
        updatedAt=item.get("updatedAt"),
    )


@router.get("", response_model=List[RecurringRule])
def api_list_recurring(current_user=Depends(get_current_user), db: DB = Depends(get_db)):
    items = list_recurring_rules(db, current_user["user_id"])
    return [_public_rule(i) for i in items]


@router.post("", response_model=RecurringRule)
def api_create_recurring(payload: RecurringRuleIn, current_user=Depends(get_current_user), db: DB = Depends(get_db)):
    rule_id = f"rec_{uuid.uuid4().hex[:8]}"
    item = {
        "PK": f"USER#{current_user['user_id']}",
        "SK": f"REC#{rule_id}",
        "entityType": "RecurringRule",
        "ruleId": rule_id,
        **payload.model_dump(),
        "createdAt": _now_iso(),
        "updatedAt": _now_iso(),
    }
    db.put(item)
    return _public_rule(item)


@router.patch("/{rule_id}", response_model=RecurringRule)
def api_update_recurring(rule_id: str, payload: RecurringRuleIn, current_user=Depends(get_current_user), db: DB = Depends(get_db)):
    updated = db.update(f"USER#{current_user['user_id']}", f"REC#{rule_id}", {**payload.model_dump(), "updatedAt": _now_iso()})
    if not updated:
        raise HTTPException(404, "Recurring rule not found")
    return _public_rule(updated)


@router.post("/{rule_id}/pause", response_model=RecurringToggle)
def api_pause_recurring(rule_id: str, current_user=Depends(get_current_user), db: DB = Depends(get_db)):
    updated = db.update(f"USER#{current_user['user_id']}", f"REC#{rule_id}", {"isPaused": True, "updatedAt": _now_iso()})
    if not updated:
        raise HTTPException(404, "Recurring rule not found")
    return _public_toggle(updated)


@router.post("/{rule_id}/resume", response_model=RecurringToggle)
def api_resume_recurring(rule_id: str, current_user=Depends(get_current_user), db: DB = Depends(get_db)):
    updated = db.update(f"USER#{current_user['user_id']}", f"REC#{rule_id}", {"isPaused": False, "updatedAt": _now_iso()})
    if not updated:
        raise HTTPException(404, "Recurring rule not found")
    return _public_toggle(updated)


@router.post("/{rule_id}/stop", response_model=RecurringToggle)
def api_stop_recurring(rule_id: str, current_user=Depends(get_current_user), db: DB = Depends(get_db)):
    today = datetime.now(timezone.utc).date().isoformat()
    updated = db.update(f"USER#{current_user['user_id']}", f"REC#{rule_id}", {"endDate": today, "isPaused": True, "updatedAt": _now_iso()})
    if not updated:
        raise HTTPException(404, "Recurring rule not found")
    return _public_toggle(updated)

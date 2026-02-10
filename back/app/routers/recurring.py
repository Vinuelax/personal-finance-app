from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime, timezone

from utils.deps import get_db, get_current_user
from utils.db import DB, list_recurring_rules

router = APIRouter(tags=["recurring"])


class RecurringRuleIn(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "name": "Internet bill",
            "amount": -25000,
            "currency": "CLP",
            "categoryId": "cat_utilities",
            "cadence": "MONTHLY",
            "dayOfMonth": 15,
            "startDate": "2025-01-01",
            "endDate": None,
            "autopostMode": "PROJECT_ONLY",
            "isPaused": False
        }
    })

    name: str = Field(..., description="Recurring item name")
    amount: int = Field(..., description="Signed amount in minor units (negative for bills)")
    currency: str = Field("CLP", description="ISO currency code")
    categoryId: str | None = Field(None, description="Category to assign when posted")
    cadence: str = Field(..., pattern="^(MONTHLY|WEEKLY)$", description="Posting cadence")
    dayOfMonth: int | None = Field(None, description="Day of month for MONTHLY cadence")
    startDate: str = Field(..., description="Start date YYYY-MM-DD")
    endDate: str | None = Field(None, description="Optional end date YYYY-MM-DD")
    autopostMode: str = Field("PROJECT_ONLY", description="Autopost behavior (e.g. PROJECT_ONLY)")
    isPaused: bool = Field(False, description="Whether the rule is paused")


class RecurringRule(RecurringRuleIn):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "ruleId": "rec_abcdef12",
            "name": "Internet bill",
            "amount": -25000,
            "currency": "CLP",
            "categoryId": "cat_utilities",
            "cadence": "MONTHLY",
            "dayOfMonth": 15,
            "startDate": "2025-01-01",
            "endDate": None,
            "autopostMode": "PROJECT_ONLY",
            "isPaused": False,
            "createdAt": "2025-01-01T00:00:00Z",
            "updatedAt": "2026-01-15T00:00:00Z"
        }
    })

    ruleId: str
    createdAt: str | None = None
    updatedAt: str | None = None


class RecurringRulePatch(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "amount": -27000,
            "dayOfMonth": 12,
            "isPaused": True
        }
    })

    name: Optional[str] = Field(None, description="Updated name")
    amount: Optional[int] = Field(None, description="Updated amount")
    currency: Optional[str] = Field(None, description="Updated currency code")
    categoryId: Optional[str] = Field(None, description="Updated category")
    cadence: Optional[str] = Field(default=None, pattern="^(MONTHLY|WEEKLY)$", description="Updated cadence")
    dayOfMonth: Optional[int] = Field(None, description="Updated day of month")
    startDate: Optional[str] = Field(None, description="Updated start date")
    endDate: Optional[str] = Field(None, description="Updated end date")
    autopostMode: Optional[str] = Field(None, description="Updated autopost behavior")
    isPaused: Optional[bool] = Field(None, description="Pause/unpause the rule")


class RecurringToggle(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "ruleId": "rec_abcdef12",
            "isPaused": True,
            "endDate": None,
            "updatedAt": "2026-02-05T10:00:00Z"
        }
    })

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


@router.get(
    "",
    response_model=List[RecurringRule],
    summary="List recurring rules",
    description="Return recurring rules (subscriptions/bills) for the authenticated user."
)
def api_list_recurring(current_user=Depends(get_current_user), db: DB = Depends(get_db)):
    items = list_recurring_rules(db, current_user["user_id"])
    return [_public_rule(i) for i in items]


@router.post(
    "",
    response_model=RecurringRule,
    summary="Create recurring rule",
    description="Create a recurring bill or income rule."
)
def api_create_recurring(payload: RecurringRuleIn, current_user=Depends(get_current_user), db: DB = Depends(get_db)):
    item = db.create_recurring(current_user["user_id"], payload.model_dump())
    return _public_rule(item)


@router.patch(
    "/{rule_id}",
    response_model=RecurringRule,
    summary="Update recurring rule",
    description="Update fields on a recurring rule."
)
def api_update_recurring(rule_id: str, payload: RecurringRulePatch, current_user=Depends(get_current_user), db: DB = Depends(get_db)):
    updates = payload.model_dump(exclude_none=True)
    updated = db.update_recurring(current_user["user_id"], rule_id, updates)
    if not updated:
        raise HTTPException(404, "Recurring rule not found")
    return _public_rule(updated)


@router.post(
    "/{rule_id}/pause",
    response_model=RecurringToggle,
    summary="Pause recurring rule",
    description="Pause a recurring rule to stop future postings."
)
def api_pause_recurring(rule_id: str, current_user=Depends(get_current_user), db: DB = Depends(get_db)):
    updated = db.update_recurring(current_user["user_id"], rule_id, {"isPaused": True})
    if not updated:
        raise HTTPException(404, "Recurring rule not found")
    return _public_toggle(updated)


@router.post(
    "/{rule_id}/resume",
    response_model=RecurringToggle,
    summary="Resume recurring rule",
    description="Resume a paused recurring rule."
)
def api_resume_recurring(rule_id: str, current_user=Depends(get_current_user), db: DB = Depends(get_db)):
    updated = db.update_recurring(current_user["user_id"], rule_id, {"isPaused": False})
    if not updated:
        raise HTTPException(404, "Recurring rule not found")
    return _public_toggle(updated)


@router.post(
    "/{rule_id}/stop",
    response_model=RecurringToggle,
    summary="Stop recurring rule",
    description="Stop a recurring rule and set its end date to today."
)
def api_stop_recurring(rule_id: str, current_user=Depends(get_current_user), db: DB = Depends(get_db)):
    today = datetime.now(timezone.utc).date().isoformat()
    updated = db.update_recurring(current_user["user_id"], rule_id, {"endDate": today, "isPaused": True})
    if not updated:
        raise HTTPException(404, "Recurring rule not found")
    return _public_toggle(updated)

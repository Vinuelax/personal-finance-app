from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

from utils.deps import get_current_user, get_db
from utils.db import DB

router = APIRouter(tags=["objectives"])


class ObjectivePlanIn(BaseModel):
    month: str = Field(..., description="Month in YYYY-MM format")
    amount: int = Field(..., description="Planned amount in minor units")
    kind: str = Field("SPEND", description="SPEND or SAVE")
    isLastMonth: bool = Field(False, description="Reserved flag; currently ignored for objective-generated budgets")


class ObjectiveIn(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "name": "Trip to Patagonia",
            "categoryId": None,
            "currency": "CLP",
            "plans": [
                {"month": "2025-12", "amount": 700000, "kind": "SPEND", "isLastMonth": False},
                {"month": "2026-01", "amount": 300000, "kind": "SPEND", "isLastMonth": False},
                {"month": "2026-02", "amount": 250000, "kind": "SPEND", "isLastMonth": False},
            ],
        }
    })

    name: str = Field(..., description="Objective name")
    categoryId: Optional[str] = Field(None, description="Existing category id; if omitted, backend creates/reuses by name")
    currency: Optional[str] = Field(None, description="Objective currency")
    totalAmount: Optional[int] = Field(None, description="Optional total amount for the objective in minor units")
    plans: List[ObjectivePlanIn] = Field(default_factory=list, description="Monthly objective plan")


class ObjectiveUpdate(BaseModel):
    name: Optional[str] = None
    categoryId: Optional[str] = None
    currency: Optional[str] = None
    totalAmount: Optional[int] = None
    status: Optional[str] = None
    plans: Optional[List[ObjectivePlanIn]] = None


class ObjectivePlan(ObjectivePlanIn):
    pass


class ObjectiveOut(BaseModel):
    objectiveId: str
    name: str
    categoryId: str
    currency: Optional[str] = None
    totalAmount: Optional[int] = None
    status: str
    plans: List[ObjectivePlan] = Field(default_factory=list)
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


def _resolve_objective_category(db: DB, user_id: str, name: str, category_id: Optional[str]) -> str:
    if category_id:
        return category_id
    existing = db.list_categories(user_id)
    for c in existing:
        if (c.get("name") or "").strip().lower() == name.strip().lower():
            return c["categoryId"]
    created = db.create_category(user_id, {
        "name": name,
        "icon": "repeat",
        "color": "#06b6d4",
    })
    return created["categoryId"]


@router.get("", response_model=List[ObjectiveOut], summary="List objectives")
def api_list_objectives(current_user=Depends(get_current_user), db: DB = Depends(get_db)):
    return db.list_objectives(current_user["user_id"])


@router.post("", response_model=ObjectiveOut, summary="Create objective")
def api_create_objective(
    payload: ObjectiveIn,
    force: bool = Query(False, description="Replace conflicting budgets"),
    current_user=Depends(get_current_user),
    db: DB = Depends(get_db),
):
    category_id = _resolve_objective_category(db, current_user["user_id"], payload.name, payload.categoryId)
    data = payload.model_dump()
    data["categoryId"] = category_id
    try:
        return db.create_objective(current_user["user_id"], data, force=force)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail={"message": "Budget conflicts", "conflicts": exc.args[0]})


@router.patch("/{objective_id}", response_model=ObjectiveOut, summary="Update objective")
def api_update_objective(
    objective_id: str,
    payload: ObjectiveUpdate,
    force: bool = Query(False, description="Replace conflicting budgets"),
    current_user=Depends(get_current_user),
    db: DB = Depends(get_db),
):
    data = payload.model_dump(exclude_unset=True)
    if "name" in data and "categoryId" not in data:
        data["categoryId"] = _resolve_objective_category(db, current_user["user_id"], data["name"], None)
    try:
        updated = db.update_objective(current_user["user_id"], objective_id, data, force=force)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail={"message": "Budget conflicts", "conflicts": exc.args[0]})
    if not updated:
        raise HTTPException(status_code=404, detail="Objective not found")
    return updated


@router.post("/{objective_id}/complete", response_model=ObjectiveOut, summary="Complete objective")
def api_complete_objective(objective_id: str, current_user=Depends(get_current_user), db: DB = Depends(get_db)):
    completed = db.complete_objective(current_user["user_id"], objective_id)
    if not completed:
        raise HTTPException(status_code=404, detail="Objective not found")
    return completed


@router.delete("/{objective_id}", summary="Archive objective")
def api_archive_objective(objective_id: str, current_user=Depends(get_current_user), db: DB = Depends(get_db)):
    ok = db.archive_objective(current_user["user_id"], objective_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Objective not found")
    return {"deleted": True}

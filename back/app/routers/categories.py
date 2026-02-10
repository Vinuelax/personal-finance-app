from typing import List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime, timezone

from utils.deps import get_db, get_current_user
from utils.db import DB, list_categories

router = APIRouter(tags=["categories"])


class CategoryIn(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "name": "Groceries",
            "group": "Needs",
            "icon": "basket",
            "color": "green"
        }
    })

    name: str = Field(..., description="Display name of the category")
    group: str | None = Field(None, description="Grouping label, e.g. Needs/Wants/Invest")
    icon: str | None = Field(None, description="Icon slug used by the frontend")
    color: str | None = Field(None, description="Color token used by the frontend")


class Category(CategoryIn):
    categoryId: str = Field(..., description="Category identifier")


class CategoryUpdate(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "name": "Groceries",
            "icon": "basket",
        }
    })

    name: str | None = Field(None, description="Display name of the category")
    group: str | None = Field(None, description="Grouping label, e.g. Needs/Wants/Invest")
    icon: str | None = Field(None, description="Icon slug used by the frontend")
    color: str | None = Field(None, description="Color token used by the frontend")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get(
    "",
    response_model=List[Category],
    summary="List categories",
    description="List all categories for the authenticated user."
)
def api_list_categories(current_user=Depends(get_current_user), db: DB = Depends(get_db)):
    items = list_categories(db, current_user["user_id"])
    return [
        {
            "categoryId": i.get("categoryId"),
            "name": i.get("name"),
            "group": i.get("group"),
            "icon": i.get("icon"),
            "color": i.get("color"),
        }
        for i in items
    ]


@router.post(
    "",
    response_model=Category,
    summary="Create category",
    description="Create a new spending category."
)
def api_create_category(payload: CategoryIn, current_user=Depends(get_current_user), db: DB = Depends(get_db)):
    created = db.create_category(current_user["user_id"], payload.model_dump())
    return created


@router.patch(
    "/{category_id}",
    response_model=Category,
    summary="Update category",
    description="Update an existing category."
)
def api_update_category(category_id: str, payload: CategoryUpdate, current_user=Depends(get_current_user), db: DB = Depends(get_db)):
    updates = payload.model_dump(exclude_unset=True)
    updated = db.update_category(current_user["user_id"], category_id, updates)
    if not updated:
        raise HTTPException(404, "Category not found")
    return updated


@router.delete(
    "/{category_id}",
    summary="Delete category",
    description="Delete a category."
)
def api_delete_category(category_id: str, current_user=Depends(get_current_user), db: DB = Depends(get_db)):
    ok = db.delete_category(current_user["user_id"], category_id)
    if not ok:
        raise HTTPException(404, "Category not found")
    return {"deleted": True}

from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
import uuid
from datetime import datetime, timezone

from app.deps import get_db
from utils.db import DB, list_categories

router = APIRouter(prefix="/api/categories", tags=["categories"])


class CategoryIn(BaseModel):
    name: str
    group: str | None = None
    icon: str | None = None
    color: str | None = None


class Category(CategoryIn):
    categoryId: str


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("", response_model=List[Category])
def api_list_categories(user_id: str = Query("u_001"), db: DB = Depends(get_db)):
    items = list_categories(db, user_id)
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


@router.post("", response_model=Category)
def api_create_category(payload: CategoryIn, user_id: str = Query("u_001"), db: DB = Depends(get_db)):
    cat_id = f"cat_{uuid.uuid4().hex[:8]}"
    item = {
        "PK": f"USER#{user_id}",
        "SK": f"CAT#{cat_id}",
        "entityType": "Category",
        "categoryId": cat_id,
        **payload.model_dump(),
        "createdAt": _now_iso(),
        "updatedAt": _now_iso(),
    }
    db.put(item)
    return {"categoryId": cat_id, **payload.model_dump()}


@router.patch("/{category_id}", response_model=Category)
def api_update_category(category_id: str, payload: CategoryIn, user_id: str = Query("u_001"), db: DB = Depends(get_db)):
    pk = f"USER#{user_id}"
    sk = f"CAT#{category_id}"
    updated = db.update(pk, sk, {**payload.model_dump(), "updatedAt": _now_iso()})
    if not updated:
        raise HTTPException(404, "Category not found")
    return {"categoryId": category_id, **payload.model_dump()}


@router.delete("/{category_id}")
def api_delete_category(category_id: str, user_id: str = Query("u_001"), db: DB = Depends(get_db)):
    ok = db.delete(f"USER#{user_id}", f"CAT#{category_id}")
    if not ok:
        raise HTTPException(404, "Category not found")
    return {"deleted": True}

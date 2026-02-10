from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from utils.deps import get_current_user, get_db
from utils.db import DB

router = APIRouter(prefix="/user", tags=["user"])


class UserResponse(BaseModel):
    userId: str = Field(..., description="User id")
    email: str = Field(..., description="User email")
    currency: str | None = Field(None, description="ISO 4217 currency code")


class UpdateUserRequest(BaseModel):
    currency: str | None = Field(None, description="ISO 4217 currency code (e.g. CLP, USD)")


def _load_user(db: DB, user_id: str) -> dict:
    user = db.get_user(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.get("/me", response_model=UserResponse, summary="Get current user")
def get_me(current=Depends(get_current_user), db: DB = Depends(get_db)):
    user = _load_user(db, current["user_id"])
    return UserResponse(
        userId=user.get("userId"),
        email=user.get("email"),
        currency=user.get("currency"),
    )


@router.patch("/me", response_model=UserResponse, summary="Update current user")
def update_me(body: UpdateUserRequest, current=Depends(get_current_user), db: DB = Depends(get_db)):
    updates: dict = {}
    if body.currency is not None:
        normalized = body.currency.strip().upper()
        if len(normalized) != 3:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Currency must be a 3-letter ISO code")
        updates["currency"] = normalized

    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No changes provided")

    updated = db.update_user(current["user_id"], updates)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return UserResponse(
        userId=updated.get("userId"),
        email=updated.get("email"),
        currency=updated.get("currency"),
    )

import hashlib
import os

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from utils.deps import create_access_token, get_db
from utils.db import DB

router = APIRouter(prefix="/auth", tags=["auth"])

DEFAULT_USER_ID = os.getenv("DEFAULT_USER_ID", "u_001")


class AuthRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def _get_user_record(db: DB, user_id: str):
    return db.get_item(f"USER#{user_id}", f"USER#{user_id}")


@router.post("/login", response_model=TokenResponse)
def login(body: AuthRequest, db: DB = Depends(get_db)):
    if not body.email or not body.password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing credentials")

    user = _get_user_record(db, DEFAULT_USER_ID)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if body.email != user.get("email") or _hash_password(body.password) != user.get("passwordHash"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token({"sub": body.email, "user_id": DEFAULT_USER_ID})
    return TokenResponse(access_token=token)


@router.post("/signup", response_model=TokenResponse)
def signup(body: AuthRequest, db: DB = Depends(get_db)):
    # Demo signup: validate against the stored default user to keep behavior consistent
    return login(body, db=db)

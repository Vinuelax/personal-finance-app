import hashlib
import os
import binascii
import secrets
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

import logging

logger = logging.getLogger("auth")
from utils.deps import create_access_token, get_db
from utils.db import DB

router = APIRouter(prefix="/auth", tags=["auth"])

DEFAULT_CURRENCY = os.getenv("DEFAULT_CURRENCY", "CLP")
# OWASP 2023 minimum for PBKDF2-HMAC-SHA256.
PBKDF2_ITERATIONS = int(os.getenv("AUTH_PBKDF2_ITERATIONS", "600000"))
PBKDF2_ALGO = "PBKDF2-HMAC-SHA256"


class AuthRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "email": "user@example.com",
            "password": "s3cretpass"
        }
    })

    email: str = Field(..., description="User email (case-insensitive)")
    password: str = Field(..., description="Plain-text password for login or signup")


class TokenResponse(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "token_type": "bearer"
        }
    })

    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field("bearer", description="Token type (always 'bearer')")


def _derive_password(password: str, salt: bytes, iterations: int = PBKDF2_ITERATIONS) -> str:
    """PBKDF2-HMAC-SHA256 hex digest."""
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations)
    return binascii.hexlify(dk).decode()


def _get_user_by_email(db: DB, email: str):
    return db.get_user_by_email(email)


def _verify_password(password: str, user: dict) -> bool:
    if user.get("passwordAlgo") != PBKDF2_ALGO:
        return False
    salt_hex = user.get("passwordSalt")
    iterations = user.get("passwordIterations", PBKDF2_ITERATIONS)
    try:
        salt = bytes.fromhex(salt_hex)
    except Exception:
        return False
    derived = _derive_password(password, salt, iterations)
    return secrets.compare_digest(derived, user.get("passwordHash", ""))


def _maybe_rehash_password(db: DB, user: dict, password: str) -> None:
    """If the stored hash uses fewer iterations than the current floor,
    re-derive with a fresh salt at the current iteration count.

    Lets us raise PBKDF2_ITERATIONS without forcing a password reset for
    everyone — each user's hash gets upgraded the next time they log in.
    """
    stored = int(user.get("passwordIterations") or 0)
    if stored >= PBKDF2_ITERATIONS:
        return
    salt = secrets.token_bytes(16)
    db.update_user(user["userId"], {
        "passwordAlgo": PBKDF2_ALGO,
        "passwordSalt": salt.hex(),
        "passwordIterations": PBKDF2_ITERATIONS,
        "passwordHash": _derive_password(password, salt, PBKDF2_ITERATIONS),
    })


def _new_user_item(email: str, password: str) -> dict:
    user_id = f"u_{uuid.uuid4().hex[:8]}"
    salt = secrets.token_bytes(16)
    iterations = PBKDF2_ITERATIONS
    now = datetime.now(timezone.utc).isoformat()
    return {
        "userId": user_id,
        "email": email,
        "passwordAlgo": PBKDF2_ALGO,
        "passwordSalt": salt.hex(),
        "passwordIterations": iterations,
        "passwordHash": _derive_password(password, salt, iterations),
        "createdAt": now,
        "updatedAt": now,
        "currency": DEFAULT_CURRENCY,
    }


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Log in",
    description="Authenticate a user and return a bearer token."
)
def login(body: AuthRequest, db: DB = Depends(get_db)):
    logger.info("Login attempt for email=%s", body.email)
    if not body.email or not body.password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing credentials")

    user = _get_user_by_email(db, body.email)
    if not user:
        logger.warning("Login failed: user not found for email=%s", body.email)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    valid = _verify_password(body.password, user)
    logger.info(
        "Password verify email=%s user_id=%s algo=%s ok=%s",
        body.email,
        user.get("userId"),
        user.get("passwordAlgo"),
        valid,
    )
    if not valid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    _maybe_rehash_password(db, user, body.password)

    token = create_access_token(
        {
            "sub": body.email,
            "user_id": user.get("userId"),
        }
    )
    logger.info("Login success email=%s user_id=%s", body.email, user.get("userId"))
    return TokenResponse(access_token=token)


@router.post(
    "/signup",
    response_model=TokenResponse,
    summary="Sign up",
    description="Create a new user account and return a bearer token."
)
def signup(body: AuthRequest, db: DB = Depends(get_db)):
    if not body.email or not body.password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing credentials")

    existing = _get_user_by_email(db, body.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already exists")

    user_item = _new_user_item(body.email, body.password)
    db.upsert_user(user_item)

    token = create_access_token(
        {
            "sub": body.email,
            "user_id": user_item.get("userId"),
        }
    )
    return TokenResponse(access_token=token)

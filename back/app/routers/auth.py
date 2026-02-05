import hashlib
import os
import binascii
import secrets
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from utils.deps import create_access_token, get_db
from utils.db import DB

router = APIRouter(prefix="/auth", tags=["auth"])

DEFAULT_USER_ID = os.getenv("DEFAULT_USER_ID", "u_001")
PBKDF2_ITERATIONS = int(os.getenv("AUTH_PBKDF2_ITERATIONS", "100000"))
PBKDF2_ALGO = "PBKDF2-HMAC-SHA256"


class AuthRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


def _hash_password(password: str) -> str:
    """Legacy SHA256 (kept to avoid breaking default demo user)."""
    return hashlib.sha256(password.encode()).hexdigest()


def _derive_password(password: str, salt: bytes, iterations: int = PBKDF2_ITERATIONS) -> str:
    """PBKDF2-HMAC-SHA256 hex digest."""
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations)
    return binascii.hexlify(dk).decode()


def _get_user_by_email(db: DB, email: str):
    # Prefer GSI4 email index if present
    matches = db.gsi_query(f"EMAIL#{email.lower()}", index="GSI4")
    return matches[0] if matches else None


def _get_user_record(db: DB, user_id: str):
    return db.get_item(f"USER#{user_id}", f"USER#{user_id}")


def _verify_password(password: str, user: dict) -> bool:
    algo = user.get("passwordAlgo")
    if algo == PBKDF2_ALGO:
        salt_hex = user.get("passwordSalt")
        iterations = user.get("passwordIterations", PBKDF2_ITERATIONS)
        try:
            salt = bytes.fromhex(salt_hex)
        except Exception:
            return False
        derived = _derive_password(password, salt, iterations)
        return secrets.compare_digest(derived, user.get("passwordHash", ""))
    # legacy fallback
    return secrets.compare_digest(_hash_password(password), user.get("passwordHash", ""))


def _new_user_item(email: str, password: str) -> dict:
    user_id = f"u_{uuid.uuid4().hex[:8]}"
    salt = secrets.token_bytes(16)
    iterations = PBKDF2_ITERATIONS
    now = datetime.now(timezone.utc).isoformat()
    return {
        "PK": f"USER#{user_id}",
        "SK": f"USER#{user_id}",
        "GSI4PK": f"EMAIL#{email.lower()}",
        "GSI4SK": f"USER#{user_id}",
        "entityType": "User",
        "userId": user_id,
        "email": email,
        "passwordAlgo": PBKDF2_ALGO,
        "passwordSalt": salt.hex(),
        "passwordIterations": iterations,
        "passwordHash": _derive_password(password, salt, iterations),
        "createdAt": now,
        "updatedAt": now,
    }


@router.post("/login", response_model=TokenResponse)
def login(body: AuthRequest, db: DB = Depends(get_db)):
    if not body.email or not body.password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing credentials")

    user = _get_user_by_email(db, body.email)
    if not user:
        # legacy single-demo-user fallback
        legacy = _get_user_record(db, DEFAULT_USER_ID)
        if legacy and legacy.get("email") == body.email:
            user = legacy
    if not user or not _verify_password(body.password, user):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(
        {
            "sub": body.email,
            "user_id": user.get("userId"),
            "pwd_algo": user.get("passwordAlgo"),
            "pwd_salt": user.get("passwordSalt"),
            "pwd_iter": user.get("passwordIterations"),
        }
    )
    return TokenResponse(access_token=token)


@router.post("/signup", response_model=TokenResponse)
def signup(body: AuthRequest, db: DB = Depends(get_db)):
    if not body.email or not body.password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing credentials")

    existing = _get_user_by_email(db, body.email)
    if not existing:
        legacy = _get_user_record(db, DEFAULT_USER_ID)
        if legacy and legacy.get("email") == body.email:
            existing = legacy
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already exists")

    user_item = _new_user_item(body.email, body.password)
    db.put(user_item)

    token = create_access_token(
        {
            "sub": body.email,
            "user_id": user_item.get("userId"),
            "pwd_algo": user_item.get("passwordAlgo"),
            "pwd_salt": user_item.get("passwordSalt"),
            "pwd_iter": user_item.get("passwordIterations"),
        }
    )
    return TokenResponse(access_token=token)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import secrets
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from .routers.auth import (
    _hash_password,
    _derive_password,
    DEFAULT_USER_ID,
    PBKDF2_ALGO,
    PBKDF2_ITERATIONS,
    DEFAULT_CURRENCY,
)
from utils.deps import get_db
from mangum import Mangum

from .routers import main as main_router
from db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables exist (replace with Alembic for production)
    init_db()
    # Ensure demo user exists and is synced before serving requests
    # _verify_default_user()  # Disabled: no default demo user
    yield


app = FastAPI(title="Ledger Backend", version="0.1.0", lifespan=lifespan)

# CORS
origins_env = os.getenv("BACKEND_CORS_ORIGINS", "")
origins = [o.strip() for o in origins_env.split(",") if o.strip()] or ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _verify_default_user():
    """
    Ensure the default demo user credentials in the DB match the env-provided
    defaults so local logins work out of the box.
    """
    db = next(get_db())
    user = db.get_user(DEFAULT_USER_ID)

    desired_email = os.getenv("DEFAULT_USER_EMAIL", "user@example.com")
    desired_password = os.getenv("DEFAULT_USER_PASSWORD", "pw")
    desired_currency = os.getenv("DEFAULT_CURRENCY", DEFAULT_CURRENCY)

    # If missing, create the user with PBKDF2 defaults
    if not user:
        salt = secrets.token_bytes(16)
        now = datetime.now(timezone.utc).isoformat()
        new_user = {
            "userId": DEFAULT_USER_ID,
            "email": desired_email,
            "passwordAlgo": PBKDF2_ALGO,
            "passwordSalt": salt.hex(),
            "passwordIterations": PBKDF2_ITERATIONS,
            "passwordHash": _derive_password(desired_password, salt, PBKDF2_ITERATIONS),
            "createdAt": now,
            "updatedAt": now,
            "currency": desired_currency,
        }
        db.upsert_user(new_user)
        return

    updates = {}
    if user.get("email") != desired_email:
        updates["email"] = desired_email

    algo = user.get("passwordAlgo") or PBKDF2_ALGO
    if algo == PBKDF2_ALGO:
        salt_hex = user.get("passwordSalt")
        try:
            salt = bytes.fromhex(salt_hex) if salt_hex else secrets.token_bytes(16)
        except Exception:
            salt = secrets.token_bytes(16)
        iterations = int(user.get("passwordIterations") or PBKDF2_ITERATIONS)
        derived = _derive_password(desired_password, salt, iterations)
        if user.get("passwordHash") != derived or user.get("passwordSalt") != salt.hex():
            updates.update({
                "passwordAlgo": PBKDF2_ALGO,
                "passwordSalt": salt.hex(),
                "passwordIterations": iterations,
                "passwordHash": derived,
            })
    else:
        desired_hash = _hash_password(desired_password)
        if user.get("passwordHash") != desired_hash or user.get("passwordAlgo") != "SHA256":
            updates.update({
                "passwordAlgo": "SHA256",
                "passwordHash": desired_hash,
            })

    if user.get("currency") != desired_currency:
        updates["currency"] = desired_currency

    if updates:
        db.update_user(DEFAULT_USER_ID, updates)

# Routers
app.include_router(main_router.public_router, prefix="/api/v1")
app.include_router(main_router.protected_router, prefix="/api/v1")

# Lambda entrypoint
handler = Mangum(app)

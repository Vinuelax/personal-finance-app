import os
from datetime import datetime, timedelta, timezone
from typing import Dict, Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

import logging

logger = logging.getLogger("auth")

from utils.db import DB, get_session

# JWT settings
SECRET_KEY = os.getenv("AUTH_SECRET", "dev-secret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("AUTH_TOKEN_EXPIRE_MINUTES", "60"))
ISSUER = os.getenv("AUTH_ISSUER", "ledger-backend")

security = HTTPBearer(auto_error=False)


def get_db() -> DB:
    session = get_session()
    try:
        db = DB(session)
        yield db
    finally:
        session.close()


def create_access_token(data: Dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """
    Create a signed JWT carrying `data`.

    Adds standard claims: exp, iat, iss. Exp defaults to ACCESS_TOKEN_EXPIRE_MINUTES.
    """
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": now, "iss": ISSUER})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def _decode_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
            issuer=ISSUER,
            options={"require": ["exp", "iat", "iss"]},
        )
        logger.info("Token decoded user_id=%s iss=%s exp=%s", payload.get("user_id"), payload.get("iss"), payload.get("exp"))
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError as exc:
        logger.warning("Invalid token: %s", exc)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def get_current_user(token: HTTPAuthorizationCredentials = Depends(security)):
    if token is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = _decode_token(token.credentials)
    user_id: str | None = payload.get("user_id")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return {"user_id": user_id, "sub": payload.get("sub")}

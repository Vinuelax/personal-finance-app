from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from contextlib import asynccontextmanager
from mangum import Mangum

from .routers import main as main_router
from db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Ledger Backend", version="0.1.0", lifespan=lifespan)


def _resolve_cors_origins() -> list[str]:
    raw = os.getenv("BACKEND_CORS_ORIGINS", "")
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    if origins:
        return origins
    if os.getenv("ENVIRONMENT", "development").lower() == "development":
        return ["http://localhost:3000", "http://localhost:3001"]
    raise RuntimeError(
        "BACKEND_CORS_ORIGINS is required when ENVIRONMENT != 'development'. "
        "Set it to a comma-separated list of allowed origins."
    )


_cors_origins = _resolve_cors_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(main_router.public_router, prefix="/api/v1")
app.include_router(main_router.protected_router, prefix="/api/v1")

handler = Mangum(app)

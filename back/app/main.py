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

origins_env = os.getenv("BACKEND_CORS_ORIGINS", "")
origins = [o.strip() for o in origins_env.split(",") if o.strip()] or ["*"]
allow_credentials = origins != ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(main_router.public_router, prefix="/api/v1")
app.include_router(main_router.protected_router, prefix="/api/v1")

handler = Mangum(app)

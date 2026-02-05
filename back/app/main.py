from fastapi import FastAPI
from mangum import Mangum

from .routers import main as main_router

app = FastAPI(title="Ledger Backend", version="0.1.0")

# Routers
app.include_router(main_router.public_router, prefix="/api/v1")
app.include_router(main_router.protected_router, prefix="/api/v1")

# Lambda entrypoint
handler = Mangum(app)

from fastapi import FastAPI
from mangum import Mangum

from .routers import main as main_router

app = FastAPI(title="Ledger Backend", version="0.1.0")

# Routers
app.include_router(main_router.router)


# Lambda entrypoint
handler = Mangum(app)

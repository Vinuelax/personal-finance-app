from fastapi import FastAPI
from mangum import Mangum

from .routers import main as main_router
from .routers import categories, budgets, recurring, bills, transactions, receipts

app = FastAPI(title="Ledger Backend", version="0.1.0")

# Routers
app.include_router(main_router.router)
app.include_router(categories.router)
app.include_router(budgets.router)
app.include_router(recurring.router)
app.include_router(bills.router)
app.include_router(transactions.router)
app.include_router(receipts.router)


# Lambda entrypoint
handler = Mangum(app)

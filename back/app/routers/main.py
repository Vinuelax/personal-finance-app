from fastapi import APIRouter, Depends

from utils.deps import get_current_user
from . import auth, categories, budgets, recurring, bills, transactions, receipts, user, objectives, internal

# Public router (no auth)
public_router = APIRouter()


@public_router.get("/health", tags=["system"], summary="Health check")
def health():
    return {"status": "ok"}


public_router.include_router(auth.router)
public_router.include_router(internal.router)


# Protected router (requires auth)
protected_router = APIRouter(dependencies=[Depends(get_current_user)])

protected_router.include_router(categories.router, prefix="/categories")
protected_router.include_router(budgets.router, prefix="/budgets")
protected_router.include_router(recurring.router, prefix="/recurring")
protected_router.include_router(bills.router, prefix="/bills")
protected_router.include_router(transactions.router, prefix="/transactions")
protected_router.include_router(receipts.router, prefix="/receipts")
protected_router.include_router(objectives.router, prefix="/objectives")
protected_router.include_router(user.router)

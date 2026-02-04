from fastapi import APIRouter

router = APIRouter()


@router.get("/health", tags=["system"], summary="Health check")
def health():
    return {"status": "ok"}

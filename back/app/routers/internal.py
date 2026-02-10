import os
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field

from utils.deps import get_db
from utils.db import DB

router = APIRouter(prefix="/internal", tags=["internal"])
INTERNAL_SERVICE_TOKEN = os.getenv("INTERNAL_SERVICE_TOKEN", "dev-internal-token")


class OcrCallbackItem(BaseModel):
    description: str = Field(..., description="Line item description")
    amount: int = Field(..., description="Amount in minor units")
    id: Optional[str] = Field(None, description="Line item id")
    categoryId: Optional[str] = Field(None, description="Suggested category id")
    qty: Optional[float] = Field(None, description="Detected quantity")
    unitPrice: Optional[int] = Field(None, description="Unit price in minor units")
    confidence: Optional[float] = Field(None, description="Line extraction confidence")


class OcrCallbackPayload(BaseModel):
    userId: str = Field(..., description="Owner user id")
    receiptId: str = Field(..., description="Receipt id to update")
    status: str = Field(..., description="OCR status, e.g. ocr_done or ocr_failed")
    merchant: Optional[str] = Field(None, description="Detected merchant")
    date: Optional[str] = Field(None, description="Detected date YYYY-MM-DD")
    total: Optional[int] = Field(None, description="Detected total in minor units")
    lineItems: Optional[List[OcrCallbackItem]] = Field(None, description="Detected line items")
    ocrProvider: Optional[str] = Field(None, description="Provider identifier")
    ocrConfidence: Optional[float] = Field(None, description="Overall confidence")
    ocrRawText: Optional[str] = Field(None, description="Raw OCR text")
    ocrRawBlocks: Optional[List[Dict[str, Any]]] = Field(None, description="Raw OCR block payload")
    ocrError: Optional[str] = Field(None, description="Error description on failure")
    parsedReceipt: Optional[Dict[str, Any]] = Field(None, description="Normalized parsed receipt JSON")
    needsReview: Optional[bool] = Field(None, description="Whether UI review should be required")


def _verify_internal_token(x_internal_token: Optional[str] = Header(default=None)) -> None:
    if not x_internal_token or x_internal_token != INTERNAL_SERVICE_TOKEN:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid internal token")


@router.post(
    "/receipts/ocr-callback",
    summary="Internal OCR callback",
    description="Internal endpoint for OCR Lambda to write parsed receipt data.",
)
def ocr_callback(
    payload: OcrCallbackPayload,
    _: None = Depends(_verify_internal_token),
    db: DB = Depends(get_db),
):
    updates = payload.model_dump(exclude_none=True)
    updates.pop("userId", None)
    updates.pop("receiptId", None)
    updated = db.update_receipt(payload.userId, payload.receiptId, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Receipt not found")
    return {"updated": True, "receiptId": payload.receiptId}


from typing import Optional, List, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel, ConfigDict, Field
import uuid
from datetime import datetime, timezone
from pathlib import Path

from utils.deps import get_db, get_current_user
from utils.db import DB, list_receipts

router = APIRouter(tags=["receipts"])

# Local directory used to persist uploaded receipt images in dev. In production
# this would be an S3 presigned upload; we mimic it with a predictable URL.
UPLOAD_DIR = Path("/tmp/receipts")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


class ReceiptLineItem(BaseModel):
    id: str = Field(..., description="Line item id")
    description: str = Field(..., description="Line item description")
    amount: int = Field(..., description="Amount in minor units")
    categoryId: Optional[str] = Field(None, description="Category id or null if unassigned")
    qty: Optional[float] = Field(None, description="Quantity when available")
    unitPrice: Optional[int] = Field(None, description="Unit price in minor units when available")
    confidence: Optional[float] = Field(None, description="Extraction confidence")


class ReceiptIn(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "merchant": "Starbucks",
            "date": "2026-02-05",
            "total": 6200,
            "imageUrl": "https://s3.example.com/receipts/rcpt_ab12cd34.jpg",
            "status": "uploading",
            "transactionId": "txn_000123",
            "lineItems": [
                {"id": "li_1", "description": "Coffee", "amount": 3200, "categoryId": "cat_coffee"}
            ]
        }
    })

    merchant: str = Field(..., description="Merchant or store name")
    date: str = Field(..., description="Receipt date YYYY-MM-DD")
    total: int = Field(..., description="Total amount in minor units")
    status: str = Field("uploading", description="Processing status")
    imageUrl: Optional[str] = Field(None, description="Public or presigned URL of the uploaded image")
    lineItems: Optional[List[ReceiptLineItem]] = Field(default_factory=list, description="Line items parsed from OCR")
    transactionId: Optional[str] = Field(None, description="Linked transaction ID")
    ocrProvider: Optional[str] = Field(None, description="OCR provider identifier")
    ocrConfidence: Optional[float] = Field(None, description="OCR confidence between 0 and 1")
    ocrRawText: Optional[str] = Field(None, description="Raw OCR text output")
    ocrRawBlocks: Optional[List[Dict[str, Any]]] = Field(None, description="Provider raw OCR blocks")
    ocrError: Optional[str] = Field(None, description="OCR error message")
    parsedReceipt: Optional[Dict[str, Any]] = Field(None, description="Normalized parsed receipt JSON")
    needsReview: Optional[bool] = Field(False, description="Whether manual review is recommended")


class ReceiptPatch(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "status": "processed",
            "transactionId": "txn_000123"
        }
    })

    merchant: Optional[str] = Field(None, description="Updated merchant name")
    date: Optional[str] = Field(None, description="Updated date YYYY-MM-DD")
    total: Optional[int] = Field(None, description="Updated total")
    status: Optional[str] = Field(None, description="Updated status")
    imageUrl: Optional[str] = Field(None, description="Updated image URL")
    lineItems: Optional[List[ReceiptLineItem]] = Field(None, description="Updated line items")
    transactionId: Optional[str] = Field(None, description="Updated linked transaction")
    ocrProvider: Optional[str] = Field(None, description="Updated OCR provider")
    ocrConfidence: Optional[float] = Field(None, description="Updated OCR confidence")
    ocrRawText: Optional[str] = Field(None, description="Updated OCR raw text")
    ocrRawBlocks: Optional[List[Dict[str, Any]]] = Field(None, description="Updated OCR raw blocks")
    ocrError: Optional[str] = Field(None, description="Updated OCR error")
    parsedReceipt: Optional[Dict[str, Any]] = Field(None, description="Updated normalized parsed JSON")
    needsReview: Optional[bool] = Field(None, description="Updated review flag")


class ReceiptOut(ReceiptIn):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "receiptId": "rcpt_ab12cd34",
            "merchant": "Starbucks",
            "date": "2026-02-05",
            "total": 6200,
            "status": "processed",
            "transactionId": "txn_000123",
            "createdAt": "2026-02-05T15:00:00Z",
            "updatedAt": "2026-02-05T15:05:00Z"
        }
    })

    receiptId: str = Field(..., description="Receipt identifier")
    createdAt: str | None = Field(None, description="Creation timestamp (ISO8601)")
    updatedAt: str | None = Field(None, description="Last update timestamp (ISO8601)")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _public_receipt(item: dict) -> ReceiptOut:
    return ReceiptOut(
        receiptId=item.get("receiptId"),
        merchant=item.get("merchant", ""),
        date=item.get("date", ""),
        total=item.get("total", 0),
        status=item.get("status", ""),
        imageUrl=item.get("imageUrl"),
        lineItems=item.get("lineItems", []) or [],
        transactionId=item.get("transactionId"),
        ocrProvider=item.get("ocrProvider"),
        ocrConfidence=item.get("ocrConfidence"),
        ocrRawText=item.get("ocrRawText"),
        ocrRawBlocks=item.get("ocrRawBlocks"),
        ocrError=item.get("ocrError"),
        parsedReceipt=item.get("parsedReceipt"),
        needsReview=item.get("needsReview", False),
        createdAt=item.get("createdAt"),
        updatedAt=item.get("updatedAt"),
    )


@router.get(
    "",
    response_model=List[ReceiptOut],
    summary="List receipts",
    description="List uploaded receipts for the authenticated user."
)
def api_list_receipts(current_user=Depends(get_current_user), db: DB = Depends(get_db)):
    items = list_receipts(db, current_user["user_id"])
    return [_public_receipt(i) for i in items]


@router.post(
    "",
    response_model=ReceiptOut,
    summary="Create receipt",
    description="Upload or create a receipt record."
)
def api_create_receipt(payload: ReceiptIn, current_user=Depends(get_current_user), db: DB = Depends(get_db)):
    item = db.create_receipt(current_user["user_id"], payload.model_dump())
    return _public_receipt(item)


@router.post(
    "/upload",
    response_model=ReceiptOut,
    summary="Upload receipt image",
    description="Accept an image file, store it, and create a receipt in 'uploading' status. OCR is not implemented yet."
)
def api_upload_receipt(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db: DB = Depends(get_db),
):
    rcpt_id = f"rcpt_{uuid.uuid4().hex[:8]}"
    # Persist file locally to mimic S3; in real deployment this would be a presigned upload.
    filename = f"{rcpt_id}_{file.filename}"
    dest = UPLOAD_DIR / filename
    dest.write_bytes(file.file.read())
    image_url = f"s3://mock-receipts/{filename}"

    now = _now_iso()
    item = db.create_receipt(
        current_user["user_id"],
        {
            "receiptId": rcpt_id,
            "merchant": "",
            "date": datetime.now(timezone.utc).date().isoformat(),
            "total": 0,
            "status": "uploading",
            "imageUrl": image_url,
            "lineItems": [],
            "transactionId": None,
        },
    )
    return _public_receipt(item)


@router.patch(
    "/{receipt_id}",
    response_model=ReceiptOut,
    summary="Update receipt",
    description="Update receipt fields or link to a transaction."
)
def api_update_receipt(receipt_id: str, payload: ReceiptPatch, current_user=Depends(get_current_user), db: DB = Depends(get_db)):
    updates = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    updated = db.update_receipt(current_user["user_id"], receipt_id, updates)
    if not updated:
        raise HTTPException(404, "Receipt not found")
    return _public_receipt(updated)


@router.delete(
    "/{receipt_id}",
    summary="Delete receipt",
    description="Remove a receipt and its stored image reference."
)
def api_delete_receipt(receipt_id: str, current_user=Depends(get_current_user), db: DB = Depends(get_db)):
    ok = db.delete_receipt(current_user["user_id"], receipt_id)
    if not ok:
        raise HTTPException(404, "Receipt not found")
    return {"deleted": True}

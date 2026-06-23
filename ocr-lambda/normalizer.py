import re
from datetime import datetime
from typing import Any, Dict, List, Optional

_AMOUNT_RE = re.compile(r"(-?\d+[\.,]\d{2})$")
_DATE_RE = re.compile(r"\b(\d{4}-\d{2}-\d{2})\b")


def _to_cents(amount_str: str) -> int:
    normalized = amount_str.replace(",", ".")
    return int(round(float(normalized) * 100))


def normalize_receipt(raw_text: str, raw_blocks: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    lines = [ln.strip() for ln in raw_text.splitlines() if ln.strip()]
    items: List[Dict[str, Any]] = []
    merchant = lines[0] if lines else ""
    purchase_date = None

    for line in lines:
        date_match = _DATE_RE.search(line)
        if date_match and not purchase_date:
            purchase_date = date_match.group(1)

        amount_match = _AMOUNT_RE.search(line)
        if not amount_match:
            continue
        amount_cents = _to_cents(amount_match.group(1))
        description = line[: amount_match.start()].strip(" -:\t") or "Item"
        items.append(
            {
                "id": f"li_{len(items) + 1}",
                "description": description,
                "amount": amount_cents,
                "qty": None,
                "unitPrice": None,
                "confidence": 0.7,
            }
        )

    # Pick the largest positive amount as total if no explicit label is found.
    total = 0
    lower_lines = [ln.lower() for ln in lines]
    for idx, ln in enumerate(lower_lines):
        if "total" in ln:
            m = _AMOUNT_RE.search(lines[idx])
            if m:
                total = _to_cents(m.group(1))
                break
    if total == 0 and items:
        total = max(i["amount"] for i in items)

    inferred_date = purchase_date or datetime.utcnow().date().isoformat()
    subtotal = sum(i["amount"] for i in items if i["amount"] < total) if items else total

    return {
        "merchant": merchant,
        "purchaseDate": inferred_date,
        "currency": "USD",
        "items": items,
        "totals": {
            "subtotal": subtotal,
            "tax": max(total - subtotal, 0),
            "tip": 0,
            "discount": 0,
            "grandTotal": total,
        },
        "confidence": 0.7,
        "needsReview": True,
        "rawBlocksCount": len(raw_blocks or []),
    }

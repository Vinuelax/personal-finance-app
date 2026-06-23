import os
from urllib.parse import urlparse
from typing import Any, Dict, List, Tuple

import boto3


class OcrProvider:
    def extract(self, image_uri: str) -> Dict[str, Any]:
        raise NotImplementedError


class MockProvider(OcrProvider):
    def extract(self, image_uri: str) -> Dict[str, Any]:
        sample = os.getenv(
            "OCR_MOCK_TEXT",
            "Sample Store\n2026-02-10\nMilk 3.49\nBread 2.50\nTotal 5.99",
        )
        return {
            "provider": "mock",
            "raw_text": sample,
            "raw_blocks": [{"type": "line", "text": ln} for ln in sample.splitlines() if ln.strip()],
            "confidence": 0.75,
            "source": image_uri,
        }


class TextractProvider(OcrProvider):
    def __init__(self) -> None:
        region_name = os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION") or "us-east-1"
        self.client = boto3.client("textract", region_name=region_name)

    def _parse_s3_uri(self, image_uri: str) -> Tuple[str, str]:
        parsed = urlparse(image_uri)
        if parsed.scheme != "s3" or not parsed.netloc or not parsed.path:
            raise ValueError("Textract provider requires image_url in s3://bucket/key format")
        return parsed.netloc, parsed.path.lstrip("/")

    def extract(self, image_uri: str) -> Dict[str, Any]:
        bucket, key = self._parse_s3_uri(image_uri)
        response = self.client.analyze_expense(
            Document={
                "S3Object": {
                    "Bucket": bucket,
                    "Name": key,
                }
            }
        )

        raw_blocks: List[Dict[str, Any]] = []
        collected_lines: List[str] = []
        confidences: List[float] = []

        for expense_doc in response.get("ExpenseDocuments", []):
            for summary in expense_doc.get("SummaryFields", []):
                label = (summary.get("Type", {}) or {}).get("Text", "") or ""
                value_data = summary.get("ValueDetection", {}) or {}
                value = value_data.get("Text", "") or ""
                confidence = float(value_data.get("Confidence", 0.0) or 0.0)
                text = f"{label}: {value}".strip(": ").strip()
                if text:
                    collected_lines.append(text)
                    raw_blocks.append(
                        {
                            "type": "summary",
                            "label": label,
                            "text": value,
                            "confidence": confidence,
                        }
                    )
                    confidences.append(confidence)

            for line_group in expense_doc.get("LineItemGroups", []):
                for line_item in line_group.get("LineItems", []):
                    parts: List[str] = []
                    line_confidences: List[float] = []
                    fields: List[Dict[str, Any]] = []
                    for field in line_item.get("LineItemExpenseFields", []):
                        field_type = (field.get("Type", {}) or {}).get("Text", "") or ""
                        value_data = field.get("ValueDetection", {}) or {}
                        value_text = value_data.get("Text", "") or ""
                        confidence = float(value_data.get("Confidence", 0.0) or 0.0)
                        if value_text:
                            parts.append(f"{field_type}:{value_text}" if field_type else value_text)
                        line_confidences.append(confidence)
                        fields.append(
                            {
                                "type": field_type,
                                "text": value_text,
                                "confidence": confidence,
                            }
                        )
                    line_text = " | ".join(parts).strip()
                    if line_text:
                        collected_lines.append(line_text)
                    if line_confidences:
                        confidences.extend(line_confidences)
                    raw_blocks.append(
                        {
                            "type": "line_item",
                            "text": line_text,
                            "fields": fields,
                            "confidence": (sum(line_confidences) / len(line_confidences)) if line_confidences else 0.0,
                        }
                    )

        avg_confidence = (sum(confidences) / len(confidences)) / 100.0 if confidences else 0.0
        raw_text = "\n".join([line for line in collected_lines if line.strip()])

        return {
            "provider": "textract",
            "raw_text": raw_text,
            "raw_blocks": raw_blocks,
            "confidence": round(avg_confidence, 4),
            "source": image_uri,
            "meta": {
                "expense_documents": len(response.get("ExpenseDocuments", [])),
            },
        }


def get_provider() -> OcrProvider:
    provider_name = os.getenv("OCR_PROVIDER", "mock").lower()
    if provider_name == "textract":
        return TextractProvider()
    return MockProvider()

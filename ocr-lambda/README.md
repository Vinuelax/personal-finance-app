# OCR Lambda

Standalone receipt OCR worker meant to deploy as a separate AWS Lambda.

## Purpose

- Consume receipt OCR jobs (`user_id`, `receipt_id`, `image_url`)
- Run OCR provider extraction
- Normalize into itemized JSON
- Send callback to backend internal endpoint:
  - `POST /api/v1/internal/receipts/ocr-callback`

## Files

- `handler.py`: Lambda entrypoint
- `providers.py`: OCR provider abstraction (`mock`, `textract`)
- `normalizer.py`: Heuristic parser to normalized itemized JSON
- `callback.py`: HTTP client to backend callback endpoint
- `requirements.txt`: Lambda dependencies

## Event Contract

Accepts either direct invocation or SQS records.

Direct payload:

```json
{
  "user_id": "u_001",
  "receipt_id": "rcpt_ab12cd34",
  "image_url": "s3://mock-receipts/rcpt_ab12cd34_file.jpg"
}
```

## Environment Variables

- `OCR_PROVIDER` (`mock` default, `textract`)
- `OCR_CALLBACK_BASE_URL` (default `http://localhost:8001/api/v1`)
- `INTERNAL_SERVICE_TOKEN` (must match backend `INTERNAL_SERVICE_TOKEN`)
- `OCR_MOCK_TEXT` (optional override for mock OCR lines)
- `AWS_REGION` or `AWS_DEFAULT_REGION` (required for textract mode in AWS runtime)

## Callback Payload (to backend)

- `userId`
- `receiptId`
- `status` (`ocr_done` or `ocr_failed`)
- `merchant`, `date`, `total`, `lineItems`
- `ocrProvider`, `ocrConfidence`, `ocrRawText`, `ocrRawBlocks`, `parsedReceipt`, `needsReview`, `ocrError`

## Deployment Notes

- Package this folder as its own Lambda artifact.
- Trigger with SQS or EventBridge after receipt upload.
- Keep `back/` and `ocr-lambda/` independently deployable.
- For `textract` mode, pass `image_url` as `s3://bucket/key`.
- Lambda IAM role needs at least:
  - `textract:AnalyzeExpense`
  - `s3:GetObject` on your receipts bucket

## Example AWS OCR Event

```json
{
  "user_id": "u_001",
  "receipt_id": "rcpt_ab12cd34",
  "image_url": "s3://ledger-receipts-prod/u_001/rcpt_ab12cd34.jpg"
}
```

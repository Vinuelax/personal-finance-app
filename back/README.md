# Backend (FastAPI)

Backend API for Ledger. Handles authentication, user settings, budgeting, transactions, receipts, recurring payments, bills, and objectives.

## Stack

- FastAPI
- SQLAlchemy 2.x
- PostgreSQL (psycopg3)
- JWT auth (`PyJWT`)
- Uvicorn

## Entry Points

- App: `back/app/main.py`
- Router composition: `back/app/routers/main.py`
- Auth/JWT deps: `back/utils/deps.py`
- DB facade: `back/utils/db.py`
- SQLAlchemy models: `back/db/models.py`

## Runtime Modes

- `api-dev` (docker compose): reload mode, port `8001` on host
- `api` (docker compose): production mode, port `8000` on host

## API Base URL

- Dev: `http://localhost:8001/api/v1`
- Prod-like local: `http://localhost:8000/api/v1`

## Authentication Model

- Public routes:
  - `GET /api/v1/health`
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/signup`
- Protected routes: all others require bearer token.
- Token transport: `Authorization: Bearer <jwt>`
- JWT claims include `sub`, `user_id`, `exp`, `iat`, `iss`

## Data and Storage

Uses PostgreSQL with SQLAlchemy models for:
- `users`
- `categories`
- `budgets`
- `objectives`
- `objective_month_plans`
- `transactions`
- `receipts`
- `recurring_rules`
- `bills`
- future-facing investment tables (`funds`, `fund_prices`, `investment_txs`)

Schema auto-creation is done at startup (`init_db()` in `back/db/session.py`).

## API Endpoints

The list below is exhaustive and verified against `back/openapi.live.json` (generated from `http://localhost:8001/openapi.json`): 41 operations across 27 paths.

| Method | Path | Summary | Auth Required | Key Params |
|---|---|---|---|---|
| `GET` | `/api/v1/health` | Health check | No | - |
| `POST` | `/api/v1/auth/login` | Log in | No | - |
| `POST` | `/api/v1/auth/signup` | Sign up | No | - |
| `POST` | `/api/v1/internal/receipts/ocr-callback` | Internal OCR callback | Internal token header | `X-Internal-Token` header |
| `GET` | `/api/v1/categories` | List categories | Yes | - |
| `POST` | `/api/v1/categories` | Create category | Yes | - |
| `PATCH` | `/api/v1/categories/{category_id}` | Update category | Yes | `category_id` (path, required) |
| `DELETE` | `/api/v1/categories/{category_id}` | Delete category | Yes | `category_id` (path, required) |
| `GET` | `/api/v1/budgets` | List budgets | Yes | `month` (query) |
| `POST` | `/api/v1/budgets` | Create budget | Yes | - |
| `PATCH` | `/api/v1/budgets/{month}/{category_id}` | Update budget | Yes | `month`, `category_id` (path, required) |
| `PUT` | `/api/v1/budgets/{month}/{category_id}` | Upsert budget | Yes | `month`, `category_id` (path, required), `applyFuture` (query) |
| `DELETE` | `/api/v1/budgets/{month}/{category_id}` | Delete budget | Yes | `month`, `category_id` (path, required) |
| `DELETE` | `/api/v1/budgets/scope` | Delete budgets by scope | Yes | `categoryId`, `scope` (query, required), `month` (query) |
| `POST` | `/api/v1/budgets/{month}/copy-from/{source_month}` | Copy budgets from another month | Yes | `month`, `source_month` (path, required) |
| `GET` | `/api/v1/recurring` | List recurring rules | Yes | - |
| `POST` | `/api/v1/recurring` | Create recurring rule | Yes | - |
| `PATCH` | `/api/v1/recurring/{rule_id}` | Update recurring rule | Yes | `rule_id` (path, required) |
| `POST` | `/api/v1/recurring/{rule_id}/pause` | Pause recurring rule | Yes | `rule_id` (path, required) |
| `POST` | `/api/v1/recurring/{rule_id}/resume` | Resume recurring rule | Yes | `rule_id` (path, required) |
| `POST` | `/api/v1/recurring/{rule_id}/stop` | Stop recurring rule | Yes | `rule_id` (path, required) |
| `GET` | `/api/v1/bills` | List bills | Yes | `date_from`, `date_to`, `status` (query) |
| `PATCH` | `/api/v1/bills/{bill_id}` | Update bill | Yes | `bill_id` (path, required) |
| `GET` | `/api/v1/transactions` | List transactions | Yes | `date_from`, `date_to`, `category_id`, `uncategorized`, `limit` (query) |
| `POST` | `/api/v1/transactions` | Create transaction | Yes | - |
| `GET` | `/api/v1/transactions/{txn_id}` | Get transaction | Yes | `txn_id` (path, required), `date` (query, required) |
| `PATCH` | `/api/v1/transactions/{txn_id}` | Update transaction | Yes | `txn_id` (path, required), `date` (query, required) |
| `DELETE` | `/api/v1/transactions/{txn_id}` | Delete transaction | Yes | `txn_id` (path, required), `date` (query, required) |
| `POST` | `/api/v1/transactions/import` | Bulk import transactions from CSV/XLSX | Yes | multipart file upload |
| `GET` | `/api/v1/transactions/calendar` | Calendar summary for a month | Yes | `month` (query, required) |
| `GET` | `/api/v1/receipts` | List receipts | Yes | - |
| `POST` | `/api/v1/receipts` | Create receipt | Yes | - |
| `POST` | `/api/v1/receipts/upload` | Upload receipt image | Yes | multipart file upload |
| `PATCH` | `/api/v1/receipts/{receipt_id}` | Update receipt | Yes | `receipt_id` (path, required) |
| `DELETE` | `/api/v1/receipts/{receipt_id}` | Delete receipt | Yes | `receipt_id` (path, required) |
| `GET` | `/api/v1/objectives` | List objectives | Yes | - |
| `POST` | `/api/v1/objectives` | Create objective | Yes | `force` (query) |
| `PATCH` | `/api/v1/objectives/{objective_id}` | Update objective | Yes | `objective_id` (path, required), `force` (query) |
| `DELETE` | `/api/v1/objectives/{objective_id}` | Archive objective | Yes | `objective_id` (path, required) |
| `POST` | `/api/v1/objectives/{objective_id}/complete` | Complete objective | Yes | `objective_id` (path, required) |
| `GET` | `/api/v1/user/me` | Get current user | Yes | - |
| `PATCH` | `/api/v1/user/me` | Update current user | Yes | - |

## OpenAPI Sync Workflow

To refresh endpoint docs from a running backend:

```bash
curl -s http://localhost:8001/openapi.json > back/openapi.live.json
```

## Transaction Import Notes

`POST /transactions/import` supports:
- CSV
- XLSX (including statement-style parsing helpers)

Import response:
- `imported`
- `skipped`
- `errors` (top errors, capped)

## Local Development

### With Docker Compose

From repo root:
```bash
make dev
```

### Directly (without Docker)

```bash
cd back
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Testing

From repo root:
```bash
make test
```

Or directly:
```bash
cd back
DB_BACKEND=jsonl DB_JSON_PATH=$(pwd)/data/dummy_db.jsonl .venv/bin/python -m pytest
```

## Known Functional Boundaries

- Receipt upload simulates object storage with local write to `/tmp/receipts` and a mock `s3://` URL format.
- OCR parsing is handled by a separate worker package under `ocr-lambda/`, which posts back to `/api/v1/internal/receipts/ocr-callback`.
- Objective creation/update can raise budget conflict errors unless `force=true` is provided.
- Category/currency validation is lightweight and intentionally UI-friendly.

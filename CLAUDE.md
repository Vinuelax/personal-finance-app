# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common commands

All commands run from the repo root unless noted.

```bash
make dev          # build + run web-dev (3001), api-dev (8001), postgres (5432)
make dev-nc       # same, force --no-cache rebuild (or: make dev NO_CACHE=1)
make prod         # prod-like stack: web (3000), api (8000), postgres
make build        # docker build only
make test         # backend pytest (see jsonl note below)
```

Backend tests use a JSONL fixture DB, not Postgres. `make test` is equivalent to:

```bash
cd back && DB_BACKEND=jsonl DB_JSON_PATH=$(pwd)/data/dummy_db.jsonl python -m pytest
# single test: append TEST_ARGS or run pytest directly
make test TEST_ARGS="tests/test_budgets.py::test_create -q"
```

Backend without Docker:

```bash
cd back && python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Frontend without Docker (Next.js 16 + pnpm, Node 22):

```bash
cd front && corepack enable && pnpm install
pnpm dev --hostname 0.0.0.0 --port 3000   # dev
pnpm build && pnpm start                  # prod build
pnpm lint                                 # eslint
```

DB migrations (Postgres) — required before app boot when schema changes:

```bash
python3 scripts/migrate_db.py             # applies back/db/migrations/*.sql
```

Refresh the API contract snapshot used by `back/README.md`:

```bash
curl -s http://localhost:8001/openapi.json > back/openapi.live.json
```

## Architecture

### Backend (FastAPI, deployed two ways)

The same FastAPI app (`back/app/main.py`) runs as a long-lived uvicorn service locally and as an AWS Lambda via `handler = Mangum(app)`. Don't add hot-path startup side effects — they will run on every cold start.

Routing is split in `back/app/routers/main.py`:

- `public_router` — `/health`, `/auth/*`, and `/internal/receipts/ocr-callback` (the last is guarded by an `X-Internal-Token` header, not JWT).
- `protected_router` — every other route, gated by `Depends(get_current_user)` (JWT bearer). Both mount under `/api/v1`.

Auth lives in `back/utils/deps.py`: HS256 JWTs with required `exp`/`iat`/`iss` claims; secret from `AUTH_SECRET`, issuer from `AUTH_ISSUER`. Tokens carry `user_id` — that's what downstream code uses, not `sub`.

### Data layer (dual-backend by env)

`back/config/db.py` reads `DB_BACKEND` and picks `postgres` (default) or `jsonl` (tests). The DB facade in `back/utils/db.py` exposes a uniform dict-shaped API (`db.get_user`, `db.upsert_budget`, etc.) over SQLAlchemy. Returned dicts include legacy DynamoDB-style `PK`/`SK`/`GSI*` keys on some entities — leave them alone unless you're touching the persistence layer; some clients still rely on the shape.

Postgres schema is created by `init_db()` in `back/db/session.py` on app startup. That same function then runs `get_pending_migrations()` and **raises** at startup if any file in `back/db/migrations/*.sql` is unapplied — the app refuses to serve until `scripts/migrate_db.py` runs. To intentionally bypass this in local workflows, set `DB_SKIP_SCHEMA_CHECK=true`. Production deploys run migrations via `scripts/deploy_backend.sh` before updating the Lambda code.

Migration files are plain SQL, tracked in a `schema_migrations(version)` table. Name them `NNN_description.sql`; ordering is lexicographic.

### Frontend (Next.js 16 App Router)

All client state flows through a single `DataProvider` in `front/lib/data-context.tsx`. It owns: auth token (localStorage key `ledger_token`), categories, transactions, budgets, objectives, recurring rules, bills, receipts, and user profile. Page components don't call `fetch` directly — they call hooks/actions exposed by the provider, which in turn call typed wrappers in `front/lib/api.ts`.

Currency handling: amounts are stored as integer minor units server-side. The provider does CLP-vs-decimal conversion at the boundary; respect that when adding fields that carry money.

API base URL: `NEXT_PUBLIC_API_BASE_URL` (dev default `http://localhost:8001/api/v1`, fallback `http://localhost:8000/api/v1`).

### OCR pipeline

Receipt OCR is **out-of-process**. `back/app/routers/receipts.py` accepts the upload and creates a placeholder record; the standalone `ocr-lambda/` package (separate deploy) does OCR + normalization and POSTs results back to `/api/v1/internal/receipts/ocr-callback`. That endpoint is public-route but token-gated via `X-Internal-Token`. The OCR worker is deployed by a separate workflow (`deploy-ocr-lambda.yml`) which is gated by repo variable `ENABLE_OCR_DEPLOY=true`.

### Cloud deploy

Terraform under `infra/` provisions AWS resources; GitHub Actions in `.github/workflows/` deploy each component (front to S3+CloudFront, back to Lambda, OCR to Lambda). `AWS_DEPLOY_ROLE_ARN` repo secret is required for OIDC. `scripts/deploy_backend.sh` is the source of truth for the backend deploy sequence — it resolves `DATABASE_URL` from the Lambda's env if not set, runs migrations, packages via `scripts/package_backend_lambda.sh`, then updates Lambda code.

## Conventions to know

- **IOUs and investments are frontend-only/demo** — there are no backend endpoints for them yet. Don't assume parity with other features.
- **Receipt OCR is mocked end-to-end locally**: upload writes a file to `/tmp/receipts` and returns a fake `s3://` URL. The real OCR only runs in cloud.
- **Objectives** can raise budget conflict errors on create/update; the client passes `force=true` to override.
- The test client in `back/tests/conftest.py` is a sync wrapper over `httpx.AsyncClient` with `ASGITransport` — it injects a JWT via `create_access_token` and points `DB_BACKEND=jsonl` at a per-test temp copy of `data/dummy_db.jsonl`. Use the `client` fixture; don't spin up real HTTP.

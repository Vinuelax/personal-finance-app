# Personal Finance App (Ledger)

A full-stack personal finance platform with:
- `front/`: Next.js web app (dashboard, transactions, budgets, goals, receipts, calendar, recurring)
- `back/`: FastAPI backend with JWT auth and PostgreSQL storage
- `ocr-lambda/`: standalone OCR worker package intended for separate Lambda deployment
- `postgres` service: persistent relational database for all financial entities

This repository is optimized for local Docker-based development (`web-dev`, `api-dev`, `postgres`) and includes production targets (`web`, `api`).

## Repository Structure

- `front/`: React/Next.js 16 UI with App Router and a shared client data layer (`lib/data-context.tsx`)
- `back/`: FastAPI app (`app/main.py`) with modular routers under `app/routers/`
- `ocr-lambda/`: receipt OCR/normalization Lambda code and callback contract
- `db/`: PostgreSQL persisted data mount (`db/data`)
- `docker-compose.yml`: full local orchestration (frontend + backend + db)
- `Makefile`: convenience commands for dev/prod/build/test
- `.env.dev`: development env defaults (API base URL, auth settings, DB URL)

## Architecture Overview

### Frontend
- Framework: Next.js 16 + React 19 + TypeScript
- UI stack: Tailwind CSS + Radix primitives + custom components under `front/components/ui`
- State/data: centralized `DataProvider` in `front/lib/data-context.tsx`
- API client: `front/lib/api.ts` (typed wrappers for all backend endpoints)
- Auth: token stored in local storage (`ledger_token`), sent as `Authorization: Bearer <token>`

### Backend
- Framework: FastAPI
- Auth: JWT bearer with issuer + expiry claims (`back/utils/deps.py`)
- Data layer: SQLAlchemy models + DB facade (`back/utils/db.py`)
- DB: PostgreSQL 16
- API: versioned at `/api/v1`

### Database
Primary entities:
- Users
- Categories
- Budgets
- Objectives + monthly plans
- Transactions (+ optional splits)
- Receipts
- Recurring rules
- Bills
- (Schema includes investment/fund tables for future expansion)

## Services and Ports

From `docker-compose.yml`:
- Frontend dev: `http://localhost:3001`
- Frontend prod-like service: `http://localhost:3000`
- Backend dev: `http://localhost:8001` (`/docs`, `/api/v1/...`)
- Backend prod-like service: `http://localhost:8000`
- PostgreSQL: `localhost:5432`

## Quick Start

### Prerequisites
- Docker + Docker Compose
- GNU Make (optional but recommended)

### Start Development Stack
```bash
make dev
```

This builds and runs:
- `web-dev`
- `api-dev`
- `postgres`

### Start Production-like Stack
```bash
make prod
```

### Build Only
```bash
make build
```

### Run Backend Tests
```bash
make test
```

## Environment Variables

Primary dev env file: `.env.dev`

Important keys:
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:8001/api/v1`
- `AUTH_SECRET`
- `AUTH_TOKEN_EXPIRE_MINUTES`
- `AUTH_ISSUER`
- `DATABASE_URL`
- `BACKEND_CORS_ORIGINS`
- `DEFAULT_USER_EMAIL`, `DEFAULT_USER_PASSWORD`, `DEFAULT_USER_ID`

## App Documentation

Detailed docs per app:
- Backend: `back/README.md`
- Frontend: `front/README.md`

Live API schema snapshot (optional, for doc syncing):
- `back/openapi.live.json`

The backend README contains the full, exhaustive endpoint table sourced from the live OpenAPI snapshot.

## Current Feature Coverage

Implemented end-to-end flows:
- Signup/login
- User profile + currency update
- Category CRUD
- Transaction CRUD + split transactions + CSV/XLSX import + monthly calendar aggregation
- Budget CRUD + copy month + scoped delete + carry-forward behavior
- Objectives with multi-month plans + conflict handling
- Recurring rule create/update/pause/resume/stop
- Bill listing and updates
- Receipt upload + CRUD
- Dashboard and operational pages in frontend

Partially implemented or UI-only areas:
- IOUs and investments are currently frontend-managed demo/local-state experiences
- Receipt OCR/parsing pipeline is mocked (upload persists file + creates placeholder record)

## Notes

- A root-level `db/data` directory may require local permission adjustments if Docker created it as root on your machine.
- Backend OpenAPI is available at `http://localhost:8001/docs` when `api-dev` is running.

## Cloud Deploy (Dev)

This repository includes Terraform under `infra/` and GitHub Actions workflows under `.github/workflows/` to avoid manual uploads.

### Current cloud targets

- App domain: `app.vinuelax.cl`
- API base URL used by frontend prod build: `https://api.vinuelax.cl/api/v1`
- AWS region: `us-east-1`
- Environment: `dev`

### GitHub Actions workflows

- `deploy-front.yml`: builds `front/` static export and syncs to S3, then invalidates CloudFront.
- `deploy-backend-lambda.yml`: packages `back/` and updates Lambda code.
- `deploy-ocr-lambda.yml`: packages `ocr-lambda/` and updates Lambda code.
- `infra-terraform.yml`: runs Terraform init/validate/plan for `infra/`.

> OCR deploys are currently disabled by default. The workflow
> `.github/workflows/deploy-ocr-lambda.yml` only runs when repo variable
> `ENABLE_OCR_DEPLOY` is set to `true`.

### Required GitHub config

Repository secret:
- `AWS_DEPLOY_ROLE_ARN`: IAM role ARN used by GitHub OIDC to deploy.

Repository variable:
- `CLOUDFRONT_DISTRIBUTION_ID`: CloudFront distribution for `app.vinuelax.cl`.

### Terraform

Use `infra/terraform.tfvars.example` as your template:

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan -var-file=terraform.tfvars
```

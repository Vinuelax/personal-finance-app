# Frontend (Next.js)

Ledger web client for personal finance operations across transactions, budgets, objectives, recurring bills, receipts, calendar planning, and settings.

## Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS
- Radix UI primitives + custom UI components
- Recharts for charting

## Entry Points and Core Files

- App layout: `front/app/layout.tsx`
- Home dashboard: `front/app/page.tsx`
- App shell/navigation: `front/components/app-shell.tsx`
- API client: `front/lib/api.ts`
- Central state provider: `front/lib/data-context.tsx`
- Shared types: `front/lib/types.ts`

## Routing Overview

Auth:
- `/welcome`
- `/signin`
- `/signup`
- `/onboarding`

Main app:
- `/` (home dashboard)
- `/transactions`
- `/budgets`
- `/calendar`
- `/receipts`
- `/objectives`
- `/investments`
- `/ious`
- `/settings`
- `/settings/recurring`

## App Behavior by Screen

### Home (`/`)

Combines summaries from current state:
- month spend/income glance
- budget summaries
- uncategorized transaction card
- upcoming bills
- IOUs
- investments

Uses dashboard components in `front/components/dashboard/summary-cards.tsx`.

### Transactions (`/transactions`)

Primary transaction workspace:
- transaction list with search/filter/sort interactions
- categorize uncategorized expenses
- split transaction flow
- edit/delete operations
- import transactions from CSV/XLSX

Backed by API operations:
- list/create/update/delete transactions
- import endpoint

### Budgets (`/budgets`)

Uses `BudgetsView` from transactions module. Supports:
- month-by-month budgets
- create/update category budgets
- copy budgets from previous month
- delete by scope (`this_month`, `from_month`, `all`)
- carry-forward and rollover-related fields

### Calendar (`/calendar`)

Month grid view with:
- per-day totals
- bill overlays
- expected remaining monthly outflow card
- day details and fast transaction add

Uses backend calendar aggregation when authenticated (`GET /transactions/calendar`).

### Receipts (`/receipts`)

Receipt management flow:
- upload image (drag/drop or capture)
- list receipts by status
- open detail sheet
- line-item category assignment UI

Upload calls backend `POST /receipts/upload`.

### Objectives (`/objectives`)

Goal planning with monthly schedules:
- create objective
- edit objective plans
- optional total distribution across months
- force-replace conflicting budgets
- mark complete / archive

Maps directly to objectives endpoints.

### Recurring (`/settings/recurring`)

Recurring payment/bill control panel:
- create recurring payment rule
- pause/resume rules
- stop rules
- split active vs stopped lists

### Settings (`/settings`)

User/profile preferences:
- profile shell
- theme toggle (local)
- currency preference (synced to backend via data context)
- notification toggles (currently local UI state)
- local export/clear account-like actions

### IOUs (`/ious`)

Friend balance tracker UI:
- add IOU entries
- open/settled segmentation
- settle items

Currently frontend-local/demo behavior; no dedicated backend IOU endpoints in this repo.

### Investments (`/investments`)

Portfolio UI:
- add/edit/delete holdings
- portfolio value and gain/loss summaries
- allocation pie chart and trend line

Currently frontend-local/demo behavior; backend investment APIs are not wired in this UI yet.

## Data Flow

`DataProvider` is the main state coordinator:
- stores auth token (`ledger_token`)
- loads categories, transactions, budgets, objectives, recurring, bills, receipts, user profile
- exposes actions that map to API wrappers
- handles minor-unit currency conversion for CLP vs decimal currencies

## API Configuration

Base URL comes from:
- `NEXT_PUBLIC_API_BASE_URL`
- fallback: `http://localhost:8000/api/v1`

In `.env.dev`, value is:
- `http://localhost:8001/api/v1`

## Backend Integration Map

Frontend uses the backend API wrappers in `front/lib/api.ts`.

- Auth: `/auth/login`, `/auth/signup`
- User: `/user/me`
- Categories: `/categories`, `/categories/{category_id}`
- Budgets: `/budgets`, `/budgets/{month}/{category_id}`, `/budgets/scope`, `/budgets/{month}/copy-from/{source_month}`
- Objectives: `/objectives`, `/objectives/{objective_id}`, `/objectives/{objective_id}/complete`
- Recurring: `/recurring`, `/recurring/{rule_id}`, `/recurring/{rule_id}/pause`, `/recurring/{rule_id}/resume`, `/recurring/{rule_id}/stop`
- Bills: `/bills`, `/bills/{bill_id}`
- Transactions: `/transactions`, `/transactions/{txn_id}`, `/transactions/import`, `/transactions/calendar`
- Receipts: `/receipts`, `/receipts/upload`, `/receipts/{receipt_id}`

For exhaustive API operation docs (including auth requirement and query/path params), see `back/README.md`.

## Running Frontend

### Via Docker Compose

From repo root:
```bash
make dev
```

Frontend dev app becomes available at:
- `http://localhost:3001`

### Direct Local Run

```bash
cd front
corepack enable
pnpm install
pnpm dev --hostname 0.0.0.0 --port 3000
```

## Build and Start

```bash
cd front
pnpm build
pnpm start
```

## Design System and Components

UI primitives and composed components live under:
- `front/components/ui/`

App-specific feature components include:
- `front/components/add-transaction-sheet.tsx`
- `front/components/dashboard/*`
- `front/components/app-shell.tsx`

## Notes

- The app supports responsive desktop/mobile navigation with sidebar + bottom tab bar.
- Some screens intentionally remain partially mocked while backend capabilities mature (notably IOUs/investments).
- Receipts and recurring features are integrated with backend routes and shared state.

# Roadmap

Living doc. Items are concrete enough to act on — file paths included where they help.

## 0. Now: remove all demo code (do this first)

OCR and other feature work is on hold until this cleanup lands. The mixed live/demo
state in `DataProvider` and the demo URL flag make every future change harder to
reason about. Scope is small and mostly deletion.

Concrete cleanup:

- **Delete `front/lib/demo-data.ts`** and every import of it.
- **`front/lib/data-context.tsx`**: remove the `demo*` imports (`:68-75`), the
  `demoMode` default (`:292`, `:391`), the demo-mode reset path (`:330`), and
  the demo-seeding block (`:809-813`). The provider should only ever load from
  the API.
- **`front/lib/types.ts:155`**: remove `demoMode: boolean` from `UserSettings`.
- **`front/app/page.tsx`**: stop redirecting to `/dashboard?demo=true`. Root
  should redirect to `/dashboard` (or `/signin` when unauthenticated).
- **`front/app/dashboard/page.tsx`**: drop the `isDemo`/`searchParams.get('demo')`
  branch (`:137`, `:201`).
- **IOUs (`front/app/ious/`) and Investments (`front/app/investments/`)** are
  demo-only with no backend. Hide the routes for now (remove nav entries in
  `front/components/app-shell.tsx`); leave the pages on disk if we'll revisit,
  otherwise delete. Pick one — don't half-hide.
- **Backend default user code** in `back/app/main.py:46-108` (`_verify_default_user`)
  is dead/disabled and exists only to support the demo path. Delete it and the
  SHA256 fallback in `_verify_password` (`back/app/routers/auth.py:79-80`).
- **`back/openapi.live.json`** if it still references the legacy demo user
  examples, regenerate after the auth-path cleanup.

Done when: `git grep -i demo front/ back/` returns only incidental matches (UI
copy, placeholder strings).

## 1. Critical gaps / security (do before any deploy ramp-up)

1. **JWT leaks password hash material.** `back/app/routers/auth.py:133-141` puts
   `pwd_algo`, `pwd_salt`, `pwd_iter` into the access token. JWTs are signed,
   not encrypted — these should not travel client-side. Strip them; the server
   already has them.
2. **`AUTH_SECRET` default is `"dev-secret"`** (`back/utils/deps.py:16`). Fail
   closed if `AUTH_SECRET` is unset and `ENVIRONMENT != development`.
3. **Receipt storage is fake in the prod path** (`back/app/routers/receipts.py:15,167`).
   Lambda has no `/tmp/receipts` persistence between invocations, and the URL is
   `s3://mock-receipts/...`. Real S3 presigned upload required before receipts
   work in cloud. (Note: this overlaps with the OCR work below, which is
   deferred.)
4. **CORS opens to `*` when `BACKEND_CORS_ORIGINS` unset** (`back/app/main.py:35`).
   Lock down per env.
5. **`datetime.utcnow()` in models** (`back/db/models.py:24`) — deprecated and
   naive. Switch to `datetime.now(timezone.utc)`.
6. **No rate limiting on `/auth/login`** — every request runs PBKDF2 (100k iter).
   Cheap enumeration / DoS surface on Lambda.
7. **PBKDF2 iterations too low.** `back/app/routers/auth.py:21` defaults to
   100,000; OWASP 2023 minimum for SHA-256 is 600k. Bump it, or move to
   argon2id — you're paying the cost on every Lambda login anyway, so pick a
   tuning that's actually defensive.
8. **No password reset, no email verification.** Signup creates a logged-in
   session immediately, no confirmation. Reset flow is missing entirely. A
   typo'd signup email is currently unrecoverable.
9. **No security response headers** beyond CORS. No CSP, HSTS, X-Frame-Options,
   X-Content-Type-Options. Add them at the CloudFront response-headers-policy
   layer (cheaper than per-request middleware on Lambda).
10. **Lambda + Postgres connection blowup.** `back/db/session.py` creates a sync
    SQLAlchemy engine at module load with `pool_pre_ping=True`. Each cold
    Lambda spins up its own pool; warm invocations only share within one
    container. Under any real concurrency this exhausts Postgres connections.
    Pick one: **RDS Proxy** (preferred — handles the pooling externally), or
    shrink the in-Lambda pool to 1 with `NullPool`/`StaticPool` and treat each
    request as connection-per-request. Production-blocker the moment traffic
    shows up.
11. **No tests on the Postgres path of `back/utils/db.py`.** The dict-facade is
    load-bearing and the test suite uses JSONL only. Add an integration suite
    against a real Postgres (compose service or testcontainers).

## 2. In-progress (uncommitted on `main`)

Finish or revert before adding new work.

- **Migration system** (`back/db/migrations.py`, `back/db/migrations/001_*.sql`,
  `back/db/session.py`, `scripts/migrate_db.py`) — wired into startup
  fail-fast but never committed. `back/db/schema.sql` also modified and out of
  sync with models.
- **Dashboard route split** (`front/app/dashboard/page.tsx`, `front/app/page.tsx`)
  — partially redirects to `/dashboard`; finished as part of demo cleanup above.
- **OCR Lambda** (`ocr-lambda/`) — untracked package; deploy workflow exists
  but gated by `ENABLE_OCR_DEPLOY`. **Deferred — see §6.**
- **User data deletion** (`back/app/routers/user.py:65` → `DELETE /user/me/data`)
  — added; `back/README.md` endpoint table is now stale.

## 3. Tech debt

- **Legacy DynamoDB key shape** (`PK`/`SK`/`GSI*` in `back/utils/db.py:18-33`).
  Nothing consumes them anymore. Mostly a delete; check JSONL fixture consumers
  first.
- **JSONL backend** (`DB_BACKEND=jsonl`) is only used by tests. Either commit to
  it as the test backend and document, or rip it out for testcontainers. Right
  now it's a parallel implementation that drifts.
- **`back/db/schema.sql`** is hand-maintained alongside SQLAlchemy
  `Base.metadata.create_all`. With migrations in place, drop or generate it.
- **`DataProvider` size** (`front/lib/data-context.tsx`) — large after demo
  cleanup but still doing auth, fetch, currency conversion, and cache. Split
  into auth / data / settings providers when the demo strip-out has settled.
- **`back/openapi.live.json`** drifts on every endpoint change. Generate in CI
  or stop checking in.
- **`front/package.json:2`** — `"name": "my-v0-project"` (v0 scaffolding
  artifact).
- **No lint/format config on backend** (no ruff/black). Pick one, wire into CI.
- **No CI test job.** The four workflows under `.github/workflows/` all deploy;
  none run `pytest` or `pnpm lint`. PRs land unchecked.
- **Hard vs soft delete inconsistency.** Categories v2 have `archived_at`
  (`back/db/models.py:64`). Transactions, receipts, budgets are hard-deleted.
  "What happened to that transaction?" is unanswerable. Pick one model and
  apply it everywhere user-facing data is involved.
- **Transaction splits stored as JSON blob** (`back/db/models.py:214`). Works
  today; breaks the day you need "sum of all spending in category X across
  splits" or "show every split tagged to budget rule Y." Promote to a
  `transaction_splits` child table when the v2 transaction work happens.

## 4. Subsystem rebuilds

Three areas need structural rework, not patching. They share a load-bearing
prerequisite: **budget v1 → v2 must land first**, because objectives depend on
it.

### 4.0 Budget v1 → v2 (prerequisite)

Migration `001_budget_v2_foundation.sql` introduces `budget_rules` +
`budget_rule_month_overrides` alongside the legacy `budgets` table. Models exist
in `back/db/models.py:92-159`. **Nothing else is wired up** — no router, no DB
facade methods, no frontend usage. Everything still writes the v1 `budgets`
table.

Decision: **v2 wins.** This section is now the foundation for the objectives
rebuild (§4.2). **Categories v1/v2 cutover lands in the same window** — same
schism, same blocker, no point doing them separately.

Concrete work:

- `back/utils/db.py`: facade methods for `BudgetRule` (CRUD + month override
  upsert + range queries).
- `back/app/routers/budget_rules.py`: new router. Exposes
  `GET/POST/PATCH/DELETE /budget-rules` and
  `PUT /budget-rules/{id}/months/{YYYY-MM}` for per-month overrides.
- Wire `transactions.budget_rule_id` writes on transaction create/update — the
  v2 column already exists (`back/db/models.py:207`).
- Data migration: copy existing `budgets` rows into `budget_rules` with
  `budget_type='expense_cap'` and matching start/end months. Keep the v1 table
  read-only during the cutover, then drop it.
- Frontend: `BudgetsView` reads from `/budget-rules` instead of `/budgets`. The
  v1 `front/lib/api.ts` budget wrappers become deprecated shims, then deleted.

**Categories v1 → v2 cutover (same window):**

- Migration `001` already adds `parent_category_id`, `kind`, `is_active`,
  `archived_at`, `sort_order`, `metadata` to `categories`
  (`back/db/models.py:50-66`). None of it is consumed.
- Backfill `kind` from the legacy `group` field where possible; default
  `'expense'` otherwise (the migration already does this for NULLs).
- Router needs `kind` on create/update, and `archived_at` semantics replacing
  the current hard `DELETE /categories/{id}`.
- Frontend: read `kind` and `parent_category_id`; render hierarchy where
  meaningful. Drop the legacy `group` field from `front/lib/types.ts`.
- The objective rebuild (§4.2) needs `kind='savings'` to be the canonical
  category type for savings_target rules — without this, the v1/v2 budget
  cutover can't fully retire `objectives.category_id` auto-creation.

### 4.1 Recurring + Bills

**The killer issue: bills are never created.** `back/utils/db.py:836` has
`list_bills` + `update_bill` only — no `create_bill`, no materializer,
nothing schedules. `GET /bills` returns `[]` forever in real data.

Other problems:
- `cadence: 'yearly'` exists in `front/lib/types.ts:73` and the UI dropdown
  (`front/app/settings/recurring/page.tsx:215`), but the backend pattern is
  `^(MONTHLY|WEEKLY)$`. Yearly submissions are a guaranteed 422.
- `autopostMode` is brittle string-matching
  (`front/lib/data-context.tsx:212`, `:750,769`). Should be a boolean.
- Backend example says "negative for bills" but the frontend never flips the
  sign (`data-context.tsx:743`). All rules end up positive.
- Optimistic state never reconciles (`data-context.tsx:737-754`):
  `addRecurringPayment` pushes a fake `rec-${Date.now()}` ID and never adopts
  the real `ruleId` from the API response. Every subsequent pause/update/stop
  hits a backend ID that doesn't exist.
- `mapApiBill` collapses status to `'paid' | 'projected'`
  (`data-context.tsx:216-222`); `DUE`, `OVERDUE`, `SKIPPED` silently become
  `projected`.
- Bill columns are all-nullable, status is unconstrained TEXT, no `period_month`
  → no way to dedupe materialization.

Concrete rebuild:

1. **Strict cadence**: CHECK constraint with
   `('MONTHLY','WEEKLY','BIWEEKLY','YEARLY','SEMIMONTHLY')`. Add
   `end_of_month BOOLEAN` for "last day". CHECK `day_of_month BETWEEN 1 AND 31`.
2. **`kind ENUM('bill','income')`** on the rule; store amount as positive cents,
   compute sign at materialization. Drop the per-row sign convention.
3. **Materialized `next_run_date`** on the rule, updated each materialization.
4. **Bill identity = `UNIQUE(rule_id, period_month)`**. Materialization becomes
   `INSERT … ON CONFLICT DO NOTHING`.
5. **`status` as CHECK** with `('PROJECTED','DUE','PAID','SKIPPED','OVERDUE')`.
6. **`POST /bills/materialize?through=YYYY-MM`** — callable by EventBridge cron
   *and* on-demand (e.g. dashboard load). Default: fill current + next 2
   months. This single endpoint unblocks the feature.
7. **`POST /bills/{id}/settle`** atomic, body `{ transactionId? }`. Either
   links to an existing transaction or creates one from
   `(amount, dueDate, categoryId)` and flips bill to `PAID` with
   `linked_txn_id`.
8. **`autopostMode` → `auto_post: boolean`** on rule.
9. **Frontend reconciliation**: await API responses, use real `ruleId`. Drop
   the local fake-ID pattern across `addRecurringPayment`,
   `updateRecurringPayment`, `stopRecurringPayment`.

### 4.2 Objectives (Path A: fold into v2 BudgetRule)

Today, `POST /objectives` writes `Budget` rows as a side effect
(`back/utils/db.py:502-516`, `:565-578`). That's why the `force=true`
conflict UX exists — two writers for the same table.

**Decision: objectives become v2 `BudgetRule` rows with
`budget_type='savings_target'`.** The enum value is already in the migration
(`back/db/migrations/001_budget_v2_foundation.sql:104`). The `objectives` and
`objective_month_plans` tables go away (or survive as a view, TBD during
implementation).

Concrete work:

- After §4.0 lands, the savings_target shape is just a `BudgetRule` with
  `start_month`/`end_month` plus optional per-month overrides for "front-load
  this much in November."
- `totalAmount` becomes a metadata field on the rule (or a derived sum of the
  range). Either way: enforce or remove — today it floats unenforced
  (`back/app/routers/objectives.py:36`).
- `force=true` conflict UX is **deleted**. There's no second writer anymore.
- Drop dead fields: `isLastMonth` (already documented as ignored,
  `back/app/routers/objectives.py:16`), the unimplemented `SAVE` vs `SPEND`
  `kind` (today both write identical budgets).
- Status as enum + CHECK (`ACTIVE`, `COMPLETED`, `ARCHIVED`). Pick one
  end-state behavior: `complete` and `archive` currently have *different*
  side-effects (archive deletes future budgets at
  `back/utils/db.py:601-606`, complete doesn't) — that's a bug surface.
- Stop auto-creating categories from the objective name
  (`back/app/routers/objectives.py:65-77`). Require a category id, or
  provide explicit "create category" UX in the dialog.
- Frontend `/objectives` page renders as a filtered view of `/budget-rules`
  where `budget_type='savings_target'`. The dedicated `front/lib/api.ts`
  objective wrappers become shims, then go away.

### 4.3 IOUs (build, not rebuild)

Demo-only today and being deleted in §0. Wanted back as a real feature with
backend persistence.

Concrete build:

- New tables:
  - `ious(id, user_id, friend_name, status, created_at, settled_at,
    net_balance_cents, currency)` — `status` in `('open','settled')` with
    CHECK.
  - `iou_events(id, iou_id, kind, amount_cents, description, event_date,
    linked_txn_id)` — `kind` in `('charge','payment')` with CHECK.
- `net_balance_cents` materialized: trigger or app-side recompute on event
  insert. Sign convention: positive = they owe me, negative = I owe them.
- `back/app/routers/ious.py`: `GET/POST/PATCH/DELETE /ious`,
  `POST /ious/{id}/events`, `POST /ious/{id}/settle`. Settle creates a final
  balancing event and flips status.
- **Integration with transactions**: an IOU event can optionally link to a
  real transaction (e.g. paying back an IOU is also a `transfer` transaction).
  `iou_events.linked_txn_id` makes this explicit. UX: when creating an event,
  offer "also record as a transaction" checkbox.
- Frontend: new `Ious` page rebuilt against the API. Drop the local-state
  patterns from the deleted demo version.

### 4.4 Investments

Backend tables exist (`funds`, `fund_prices`, `investment_txs` —
`back/db/models.py:275-310`), designed for **NAV-priced funds** (Fintual-style).
There's **zero router, zero DB facade method, zero endpoint**.

Frontend (`front/app/investments/page.tsx`) is pure local state with a
**per-share stock** model that doesn't match the schema. The performance chart
fabricates history with `Math.random()` (`:104-118`).

This area sits behind §0 demo removal — until that lands, the page is shown as
local-only and the decision is "hide or delete." When picked back up:

1. Commit to fund-NAV model (matches schema, fits the Chile/Fintual focus).
   Drop the stock-style `Investment` UI.
2. MVP API:
   - `POST /investments/funds` — register holding.
   - `POST /investments/funds/{id}/prices` — daily NAV (manual now;
     provider-fetched later).
   - `POST /investments/funds/{id}/txs` — buy/sell with units + cash.
   - `GET /investments` returns funds with latest NAV + unit balance.
3. Real performance chart from `fund_prices`. No data → empty state.
4. Investment txs wire into `transactions.entry_type`
   (`investment_contribution`, `investment_buy`, `investment_sell` — already
   in the schema CHECK) so spending and investing share one ledger.
5. Drop `front/lib/types.ts` `Investment` and `FintualGoal` — replace with one
   shape derived from the API.

## 5. Smaller feature gaps

- **Receipts → transaction creation** — receipts link to `transactionId` but
  there's no "convert receipt to transaction" action wired end-to-end.
- **Notification toggles** in `/settings` are local state only. Either remove
  or back with a `user_preferences` table.
- **Import** supports CSV/XLSX; no bank-specific parsers. Highest-leverage
  future feature for Chile: Banco de Chile / Santander / BCI / Itaú statement
  adapters.
- **No idempotency on POSTs.** Double-click "Add transaction" → two
  transactions. Same for `POST /budgets`, `POST /objectives`,
  `POST /receipts/upload`, and the bulk import endpoint. Add an
  `Idempotency-Key` header pattern with a short-TTL dedupe table or in-memory
  cache (per-Lambda is fine for the double-click case).
- **No pagination on list endpoints.** `/transactions` has a `limit` but no
  cursor. `/receipts`, `/bills`, `/recurring`, `/categories`, `/objectives`
  have neither. Fine at hundreds of rows, breaks at tens of thousands. Cursor
  pagination (`(txn_date, id)` for transactions) is cheap to add now,
  painful later.
- **Frontend error swallowing.** `front/lib/data-context.tsx` uses
  `.catch(err => console.error(...))` pervasively
  (`:752, :770, :781, :791, :800`). Users see the optimistic local state and
  assume writes succeeded. Surface failures via toasts (sonner is already a
  dep) and revert local state on error.
- **Timezone-unaware date handling.** Transactions store `txn_date` as a Date
  (no time). `/transactions/calendar` aggregates without timezone awareness
  (`back/utils/db.py` calendar paths). Users not in UTC see off-by-a-day
  effects near month boundaries. Either store user TZ on `users` and convert
  server-side, or commit to "all dates are user-local naive" with explicit
  client-side handling.

## 6. Future features

- **Multi-currency per transaction** — schema has `currency` on most tables but
  no FX rate table or display logic. Add `fx_rates(date, base, quote, rate)` +
  daily fetcher.
- **Shared accounts / households** — `users` is single-tenant. Adding
  `account_memberships(user_id, account_id, role)` opens couple/family use
  cases.
- **Recurring rules with variable amount** (utility bills) — current model has
  fixed `amount_cents`; add a "predicted from last N months" mode.
- **Budget forecasting** — extend calendar's "expected remaining monthly
  outflow" with a 3-month projection from recurring + budget rules + average
  discretionary.
- **PWA + mobile capture** — receipts page mentions drag/drop and capture but
  no PWA manifest. Small effort, high value.
- **Data export** — `/settings` has export copy but no backend `/export`
  endpoint. CSV/JSON dump of all user data (also covers GDPR-style requests).
- **Observability** — backend logs to stdout only. Structured logging +
  CloudWatch dashboard (or OTel). Cold starts and DB pool behavior are
  invisible today.
- **Audit log** for sensitive operations: budget overwrites, category deletes,
  objective force-replace (gone after §4.2), user data deletion, login
  attempts. "Why did my November budget change?" is currently unanswerable.
  Becomes more important once §4.2 lands and budgets get rewritten under more
  invariants. One generic `audit_log(user_id, entity_type, entity_id, action,
  before_jsonb, after_jsonb, actor, ts)` table covers most needs.
- **i18n.** App is Chile-focused but UI strings are English-only. Spanish
  toggle is a real ask if you ship to non-tech users. Not urgent until there's
  a Spanish-speaking user base.

## 7. Deferred: OCR pipeline

Paused until §0 (demo removal) and §1 (security) are done. When picked back up:

- Real S3 presigned upload to replace `/tmp/receipts` mock
  (`back/app/routers/receipts.py:15,167`).
- Verify `ocr-lambda/` end-to-end in cloud (deploy workflow exists, gated by
  `ENABLE_OCR_DEPLOY=true`).
- Build the receipt review UI — schema already supports `needsReview` and
  `parsedReceipt`; the review step has no frontend.

## Sequencing

1. **§0 demo removal.** Strict prerequisite for everything else. Hides/decides
   IOUs and Investments routes.
2. **§1 security fixes** + **§2 commit/revert WIP** + add CI test job (§3).
3. **§4.0 Budget v2 cutover.** Load-bearing for §4.2; no objective work starts
   until this is done.
4. **§4.1 Recurring + Bills rebuild.** Independent of the budget cutover but
   the highest user-visible win (the "Upcoming bills" card actually populates).
   Can run in parallel with §4.0 if there's capacity.
5. **§4.2 Objectives → savings_target BudgetRule.** Depends on §4.0.
6. **§5 small wins**: receipts→transaction action, bank statement parsers.
7. **§4.3 IOUs build.** Real feature, low schema risk; can land in parallel
   with §5.
8. **§4.4 Investments MVP.** Lowest urgency; no real users on it.
9. **§6 future features**: multi-currency, forecasting, households.
10. **§7 OCR** — last. The data path it needs (real S3, structured callbacks,
    review UI) lands more cleanly on top of a cleaned-up codebase.

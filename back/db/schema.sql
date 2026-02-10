-- Postgres schema for personal-finance-app
-- Mirrors the current Dynamo-style PK/SK model while using relational structure.

-- Enable useful extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid if needed

-- Users
CREATE TABLE users (
    id              TEXT PRIMARY KEY,                    -- e.g. u_001
    email           TEXT NOT NULL,
    password_algo   TEXT NOT NULL,
    password_salt   TEXT NOT NULL,
    password_iterations INTEGER NOT NULL,
    password_hash   TEXT NOT NULL,
    currency        TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique, case-insensitive email lookup (replaces GSI4)
CREATE UNIQUE INDEX users_email_lower_ux ON users (lower(email));


-- Categories
CREATE TABLE categories (
    id          TEXT PRIMARY KEY,           -- cat_xxx
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    "group"     TEXT,
    icon        TEXT,
    color       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- Budgets (one per user/month/category)
CREATE TABLE budgets (
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month       TEXT NOT NULL,      -- YYYY-MM
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    limit_cents INTEGER NOT NULL,
    currency    TEXT,
    rollover    BOOLEAN NOT NULL DEFAULT FALSE,
    rollover_target_category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    copied_from_month TEXT,
    purpose     TEXT,
    carry_forward_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    is_terminal BOOLEAN NOT NULL DEFAULT FALSE,
    objective_id TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, month, category_id)
);
CREATE INDEX budgets_user_month_idx ON budgets (user_id, month, category_id);

CREATE TABLE objectives (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    currency    TEXT,
    total_amount_cents INTEGER,
    status      TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE objective_month_plans (
    objective_id TEXT NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
    month        TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    kind         TEXT NOT NULL, -- SPEND | SAVE
    is_last_month BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (objective_id, month)
);

CREATE INDEX objectives_user_status_idx ON objectives (user_id, status, created_at DESC);

ALTER TABLE budgets
    ADD CONSTRAINT budgets_objective_fk
    FOREIGN KEY (objective_id) REFERENCES objectives(id) ON DELETE SET NULL;


-- Transactions
CREATE TABLE transactions (
    id              TEXT PRIMARY KEY,       -- txn_xxx
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    txn_date        DATE NOT NULL,
    merchant        TEXT NOT NULL,
    description     TEXT,
    amount_cents    INTEGER NOT NULL,       -- negative = expense
    currency        TEXT NOT NULL,
    category_id     TEXT REFERENCES categories(id) ON DELETE SET NULL,
    notes           TEXT,
    source          TEXT,
    account_id      TEXT,
    receipt_id      TEXT,                   -- FK added after receipts table
    splits          JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Feed ordering (replaces GSI1 on transactions)
CREATE INDEX transactions_user_date_desc_idx ON transactions (user_id, txn_date DESC, id);

-- Uncategorized fast path (replaces GSI2). Approximates: expense with no category.
CREATE INDEX transactions_uncat_idx
    ON transactions (user_id, txn_date DESC, id)
    WHERE category_id IS NULL AND amount_cents < 0;


-- Receipts
CREATE TABLE receipts (
    id              TEXT PRIMARY KEY,       -- rcpt_xxx
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    merchant        TEXT NOT NULL,
    receipt_date    DATE NOT NULL,
    total_cents     INTEGER NOT NULL,
    status          TEXT NOT NULL,
    image_url       TEXT,
    line_items      JSONB,
    transaction_id  TEXT REFERENCES transactions(id) ON DELETE SET NULL,
    ocr_provider    TEXT,
    ocr_confidence  NUMERIC(5,4),
    ocr_raw_text    TEXT,
    ocr_raw_blocks  JSONB,
    ocr_error       TEXT,
    parsed_receipt  JSONB,
    needs_review    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Wire receipt -> transaction FK now that both exist
ALTER TABLE transactions
    ADD CONSTRAINT transactions_receipt_fk
    FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE SET NULL;


-- Recurring rules
CREATE TABLE recurring_rules (
    id              TEXT PRIMARY KEY,       -- rec_xxx
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    amount_cents    INTEGER NOT NULL,
    currency        TEXT NOT NULL,
    category_id     TEXT REFERENCES categories(id) ON DELETE SET NULL,
    cadence         TEXT NOT NULL,          -- MONTHLY | WEEKLY
    day_of_month    INTEGER,
    start_date      DATE NOT NULL,
    end_date        DATE,
    autopost_mode   TEXT,
    is_paused       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- Bills (instances)
CREATE TABLE bills (
    id              TEXT PRIMARY KEY,       -- bill_xxx
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rule_id         TEXT REFERENCES recurring_rules(id) ON DELETE SET NULL,
    name            TEXT,
    due_date        DATE,
    amount_cents    INTEGER,
    currency        TEXT,
    category_id     TEXT REFERENCES categories(id) ON DELETE SET NULL,
    status          TEXT,
    linked_txn_id   TEXT REFERENCES transactions(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Upcoming bills ordering (replaces GSI3)
CREATE INDEX bills_user_due_date_idx ON bills (user_id, due_date, id);


-- Funds (for investment features present in dummy data)
CREATE TABLE funds (
    id          TEXT PRIMARY KEY,           -- fund_001
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    currency    TEXT NOT NULL,
    provider    TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fund daily prices (tracks former GSI1 for price timeline)
CREATE TABLE fund_prices (
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fund_id     TEXT NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
    price_date  DATE NOT NULL,
    nav         NUMERIC(18,6) NOT NULL,
    currency    TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, fund_id, price_date)
);

CREATE INDEX fund_prices_user_date_idx ON fund_prices (user_id, price_date DESC, fund_id);


-- Investment transactions
CREATE TABLE investment_txs (
    id              TEXT PRIMARY KEY,       -- invtx_xxx
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fund_id         TEXT NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
    tx_date         DATE NOT NULL,
    kind            TEXT NOT NULL,          -- BUY/SELL/etc
    cash_amount_cents INTEGER NOT NULL,
    units           NUMERIC(24,6) NOT NULL,
    price           NUMERIC(18,6) NOT NULL,
    currency        TEXT NOT NULL,
    source          TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Feed for investments (reuses GSI1 semantics)
CREATE INDEX investment_txs_user_date_idx ON investment_txs (user_id, tx_date DESC, id);


-- Helper triggers to maintain updated_at
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER categories_set_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER budgets_set_updated_at BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER transactions_set_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER receipts_set_updated_at BEFORE UPDATE ON receipts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER recurring_rules_set_updated_at BEFORE UPDATE ON recurring_rules FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER bills_set_updated_at BEFORE UPDATE ON bills FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER funds_set_updated_at BEFORE UPDATE ON funds FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER investment_txs_set_updated_at BEFORE UPDATE ON investment_txs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER objectives_set_updated_at BEFORE UPDATE ON objectives FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER objective_month_plans_set_updated_at BEFORE UPDATE ON objective_month_plans FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Incremental migration replacing ad-hoc startup ALTERs and adding v2 budget foundation.
-- Safe to run once via scripts/migrate_db.py.

-- Legacy incremental columns that previously lived in back/db/session.py
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS currency TEXT;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS start_month TEXT;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS end_month TEXT;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS rollover_target_category_id TEXT REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS copied_from_month TEXT;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS purpose TEXT;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS carry_forward_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS is_terminal BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS objective_id TEXT;

ALTER TABLE objectives ADD COLUMN IF NOT EXISTS total_amount_cents INTEGER;

ALTER TABLE receipts ADD COLUMN IF NOT EXISTS ocr_provider TEXT;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS ocr_confidence NUMERIC(5,4);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS ocr_raw_text TEXT;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS ocr_raw_blocks JSONB;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS ocr_error TEXT;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS parsed_receipt JSONB;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS needs_review BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE budgets
SET start_month = month
WHERE start_month IS NULL OR start_month = '';

-- Categories v2 additions (hierarchy + planning metadata)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_category_id TEXT REFERENCES categories(id) ON DELETE CASCADE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS kind TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS budgetable BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INTEGER;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

UPDATE categories
SET kind = COALESCE(NULLIF(kind, ''), 'expense')
WHERE kind IS NULL OR kind = '';

ALTER TABLE categories
    ALTER COLUMN kind SET DEFAULT 'expense';
ALTER TABLE categories
    ALTER COLUMN kind SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'categories_kind_ck'
    ) THEN
        ALTER TABLE categories
            ADD CONSTRAINT categories_kind_ck
            CHECK (kind IN ('expense','income','savings','investment','debt','transfer','mixed'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'categories_not_self_parent_ck'
    ) THEN
        ALTER TABLE categories
            ADD CONSTRAINT categories_not_self_parent_ck
            CHECK (parent_category_id IS NULL OR parent_category_id <> id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS categories_user_parent_idx
    ON categories (user_id, parent_category_id, is_active, sort_order);
CREATE UNIQUE INDEX IF NOT EXISTS categories_user_parent_name_ux
    ON categories (user_id, COALESCE(parent_category_id, ''), lower(name));

-- V2 budget rules (effective-dated defaults)
CREATE TABLE IF NOT EXISTS budget_rules (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id     TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    budget_type     TEXT NOT NULL,
    amount_cents    INTEGER NOT NULL,
    currency        TEXT,
    start_month     TEXT NOT NULL,
    end_month       TEXT,
    rollover_mode   TEXT NOT NULL DEFAULT 'none',
    rollover_target_category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    carry_forward_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    priority        INTEGER NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    metadata        JSONB,
    archived_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'budget_rules_type_ck'
    ) THEN
        ALTER TABLE budget_rules
            ADD CONSTRAINT budget_rules_type_ck
            CHECK (budget_type IN ('expense_cap','savings_target','debt_paydown','transfer_plan','investment_contribution'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'budget_rules_rollover_mode_ck'
    ) THEN
        ALTER TABLE budget_rules
            ADD CONSTRAINT budget_rules_rollover_mode_ck
            CHECK (rollover_mode IN ('none','same_rule','target_category'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'budget_rules_start_month_fmt_ck'
    ) THEN
        ALTER TABLE budget_rules
            ADD CONSTRAINT budget_rules_start_month_fmt_ck
            CHECK (start_month ~ '^[0-9]{4}-[0-9]{2}$');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'budget_rules_end_month_fmt_ck'
    ) THEN
        ALTER TABLE budget_rules
            ADD CONSTRAINT budget_rules_end_month_fmt_ck
            CHECK (end_month IS NULL OR end_month ~ '^[0-9]{4}-[0-9]{2}$');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'budget_rules_range_ck'
    ) THEN
        ALTER TABLE budget_rules
            ADD CONSTRAINT budget_rules_range_ck
            CHECK (end_month IS NULL OR start_month <= end_month);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'budget_rules_target_rollover_ck'
    ) THEN
        ALTER TABLE budget_rules
            ADD CONSTRAINT budget_rules_target_rollover_ck
            CHECK (
                (rollover_mode = 'target_category' AND rollover_target_category_id IS NOT NULL)
                OR (rollover_mode <> 'target_category')
            );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS budget_rules_user_category_idx
    ON budget_rules (user_id, category_id, is_active);
CREATE INDEX IF NOT EXISTS budget_rules_user_range_idx
    ON budget_rules (user_id, start_month, end_month);

-- V2 one-month overrides
CREATE TABLE IF NOT EXISTS budget_rule_month_overrides (
    rule_id          TEXT NOT NULL REFERENCES budget_rules(id) ON DELETE CASCADE,
    month            TEXT NOT NULL,
    amount_cents     INTEGER,
    is_skipped       BOOLEAN NOT NULL DEFAULT FALSE,
    rollover_mode    TEXT,
    rollover_target_category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    carry_forward_enabled BOOLEAN,
    note             TEXT,
    metadata         JSONB,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (rule_id, month)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'budget_rule_month_overrides_month_fmt_ck'
    ) THEN
        ALTER TABLE budget_rule_month_overrides
            ADD CONSTRAINT budget_rule_month_overrides_month_fmt_ck
            CHECK (month ~ '^[0-9]{4}-[0-9]{2}$');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'budget_rule_month_overrides_rollover_mode_ck'
    ) THEN
        ALTER TABLE budget_rule_month_overrides
            ADD CONSTRAINT budget_rule_month_overrides_rollover_mode_ck
            CHECK (rollover_mode IS NULL OR rollover_mode IN ('none','same_rule','target_category'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'budget_rule_month_overrides_target_rollover_ck'
    ) THEN
        ALTER TABLE budget_rule_month_overrides
            ADD CONSTRAINT budget_rule_month_overrides_target_rollover_ck
            CHECK (
                rollover_mode IS NULL
                OR rollover_mode <> 'target_category'
                OR rollover_target_category_id IS NOT NULL
            );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS budget_rule_month_overrides_month_idx
    ON budget_rule_month_overrides (month, rule_id);

-- Strict transaction semantics (v2 foundation)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS budget_rule_id TEXT REFERENCES budget_rules(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS entry_type TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS budget_effect TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'transactions_entry_type_ck'
    ) THEN
        ALTER TABLE transactions
            ADD CONSTRAINT transactions_entry_type_ck
            CHECK (
                entry_type IS NULL OR entry_type IN (
                    'expense','income','transfer','savings_contribution','investment_contribution',
                    'investment_buy','investment_sell','debt_payment','debt_disbursement','refund','adjustment'
                )
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'transactions_budget_effect_ck'
    ) THEN
        ALTER TABLE transactions
            ADD CONSTRAINT transactions_budget_effect_ck
            CHECK (budget_effect IS NULL OR budget_effect IN ('none','expense','contribution','paydown','income'));
    END IF;
END $$;

-- updated_at triggers for new tables
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'budget_rules_set_updated_at'
    ) THEN
        CREATE TRIGGER budget_rules_set_updated_at
        BEFORE UPDATE ON budget_rules
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'budget_rule_month_overrides_set_updated_at'
    ) THEN
        CREATE TRIGGER budget_rule_month_overrides_set_updated_at
        BEFORE UPDATE ON budget_rule_month_overrides
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;

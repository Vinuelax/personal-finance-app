from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Integer,
    Boolean,
    Date,
    Text,
    ForeignKey,
    Numeric,
    TIMESTAMP,
    Index,
    func,
    JSON,
    CheckConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()
JSON_TYPE = JSON().with_variant(JSONB, "postgresql")

def now_ts():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True)
    email = Column(Text, nullable=False)
    password_algo = Column(Text, nullable=False)
    password_salt = Column(Text, nullable=False)
    password_iterations = Column(Integer, nullable=False)
    password_hash = Column(Text, nullable=False)
    currency = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=now_ts)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=now_ts, onupdate=now_ts)

    categories = relationship("Category", back_populates="user", cascade="all, delete-orphan")


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (
        CheckConstraint(
            "kind IN ('expense','income','savings','investment','debt','transfer','mixed')",
            name="categories_kind_ck",
        ),
    )
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    parent_category_id = Column(String, ForeignKey("categories.id", ondelete="CASCADE"))
    name = Column(Text, nullable=False)
    description = Column(Text)
    # Legacy UI grouping; superseded by parent_category_id + kind.
    group = Column("group", Text)
    kind = Column(Text, nullable=False, default="expense")
    budgetable = Column(Boolean, nullable=False, default=True)
    is_active = Column(Boolean, nullable=False, default=True)
    icon = Column(Text)
    color = Column(Text)
    sort_order = Column(Integer)
    meta = Column("metadata", JSON_TYPE)
    archived_at = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=now_ts)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=now_ts, onupdate=now_ts)

    user = relationship("User", back_populates="categories")
    parent = relationship("Category", remote_side=[id], backref="children")


class Budget(Base):
    __tablename__ = "budgets"
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    month = Column(String, primary_key=True)  # YYYY-MM
    start_month = Column(String)
    end_month = Column(String)
    category_id = Column(String, ForeignKey("categories.id", ondelete="CASCADE"), primary_key=True)
    limit_cents = Column(Integer, nullable=False)
    currency = Column(String)
    rollover = Column(Boolean, nullable=False, default=False)
    rollover_target_category_id = Column(String, ForeignKey("categories.id", ondelete="SET NULL"))
    copied_from_month = Column(String)
    purpose = Column(Text)
    carry_forward_enabled = Column(Boolean, nullable=False, default=True)
    is_terminal = Column(Boolean, nullable=False, default=False)
    objective_id = Column(String, ForeignKey("objectives.id", ondelete="SET NULL"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=now_ts)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=now_ts, onupdate=now_ts)


class BudgetRule(Base):
    __tablename__ = "budget_rules"
    __table_args__ = (
        CheckConstraint(
            "budget_type IN ('expense_cap','savings_target','debt_paydown','transfer_plan','investment_contribution')",
            name="budget_rules_type_ck",
        ),
        CheckConstraint(
            "rollover_mode IN ('none','same_rule','target_category')",
            name="budget_rules_rollover_mode_ck",
        ),
        CheckConstraint(
            "start_month ~ '^[0-9]{4}-[0-9]{2}$'",
            name="budget_rules_start_month_fmt_ck",
        ),
        CheckConstraint(
            "end_month IS NULL OR end_month ~ '^[0-9]{4}-[0-9]{2}$'",
            name="budget_rules_end_month_fmt_ck",
        ),
        CheckConstraint(
            "end_month IS NULL OR start_month <= end_month",
            name="budget_rules_range_ck",
        ),
    )
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(String, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    name = Column(Text, nullable=False)
    description = Column(Text)
    budget_type = Column(Text, nullable=False)
    amount_cents = Column(Integer, nullable=False)
    currency = Column(Text)
    start_month = Column(String, nullable=False)
    end_month = Column(String)
    rollover_mode = Column(Text, nullable=False, default="none")
    rollover_target_category_id = Column(String, ForeignKey("categories.id", ondelete="SET NULL"))
    carry_forward_enabled = Column(Boolean, nullable=False, default=True)
    priority = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    meta = Column("metadata", JSON_TYPE)
    archived_at = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=now_ts)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=now_ts, onupdate=now_ts)


class BudgetRuleMonthOverride(Base):
    __tablename__ = "budget_rule_month_overrides"
    __table_args__ = (
        CheckConstraint(
            "month ~ '^[0-9]{4}-[0-9]{2}$'",
            name="budget_rule_month_overrides_month_fmt_ck",
        ),
        CheckConstraint(
            "rollover_mode IS NULL OR rollover_mode IN ('none','same_rule','target_category')",
            name="budget_rule_month_overrides_rollover_mode_ck",
        ),
    )
    rule_id = Column(String, ForeignKey("budget_rules.id", ondelete="CASCADE"), primary_key=True)
    month = Column(String, primary_key=True)
    amount_cents = Column(Integer)
    is_skipped = Column(Boolean, nullable=False, default=False)
    rollover_mode = Column(Text)
    rollover_target_category_id = Column(String, ForeignKey("categories.id", ondelete="SET NULL"))
    carry_forward_enabled = Column(Boolean)
    note = Column(Text)
    meta = Column("metadata", JSON_TYPE)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=now_ts)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=now_ts, onupdate=now_ts)


class Objective(Base):
    __tablename__ = "objectives"
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(Text, nullable=False)
    category_id = Column(String, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    currency = Column(Text)
    total_amount_cents = Column(Integer)
    status = Column(Text, nullable=False, default="ACTIVE")
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=now_ts)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=now_ts, onupdate=now_ts)


class ObjectiveMonthPlan(Base):
    __tablename__ = "objective_month_plans"
    objective_id = Column(String, ForeignKey("objectives.id", ondelete="CASCADE"), primary_key=True)
    month = Column(String, primary_key=True)
    amount_cents = Column(Integer, nullable=False)
    kind = Column(Text, nullable=False)
    is_last_month = Column(Boolean, nullable=False, default=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=now_ts)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=now_ts, onupdate=now_ts)


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        CheckConstraint(
            "entry_type IS NULL OR entry_type IN ('expense','income','transfer','savings_contribution','investment_contribution','investment_buy','investment_sell','debt_payment','debt_disbursement','refund','adjustment')",
            name="transactions_entry_type_ck",
        ),
        CheckConstraint(
            "budget_effect IS NULL OR budget_effect IN ('none','expense','contribution','paydown','income')",
            name="transactions_budget_effect_ck",
        ),
    )
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    txn_date = Column(Date, nullable=False)
    merchant = Column(Text, nullable=False)
    description = Column(Text)
    amount_cents = Column(Integer, nullable=False)
    currency = Column(Text, nullable=False)
    # Legacy direct category ownership; v2 source of truth is budget_rule_id.
    category_id = Column(String, ForeignKey("categories.id", ondelete="SET NULL"))
    budget_rule_id = Column(String, ForeignKey("budget_rules.id", ondelete="SET NULL"))
    entry_type = Column(Text)
    budget_effect = Column(Text)
    notes = Column(Text)
    source = Column(Text)
    account_id = Column(Text)
    receipt_id = Column(String, ForeignKey("receipts.id", ondelete="SET NULL"))
    splits = Column(JSON_TYPE)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=now_ts)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=now_ts, onupdate=now_ts)


class Receipt(Base):
    __tablename__ = "receipts"
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    merchant = Column(Text, nullable=False)
    receipt_date = Column(Date, nullable=False)
    total_cents = Column(Integer, nullable=False)
    status = Column(Text, nullable=False)
    image_url = Column(Text)
    line_items = Column(JSON_TYPE)
    transaction_id = Column(String, ForeignKey("transactions.id", ondelete="SET NULL"))
    ocr_provider = Column(Text)
    ocr_confidence = Column(Numeric(5, 4))
    ocr_raw_text = Column(Text)
    ocr_raw_blocks = Column(JSON_TYPE)
    ocr_error = Column(Text)
    parsed_receipt = Column(JSON_TYPE)
    needs_review = Column(Boolean, nullable=False, default=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=now_ts)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=now_ts, onupdate=now_ts)


class RecurringRule(Base):
    __tablename__ = "recurring_rules"
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(Text, nullable=False)
    amount_cents = Column(Integer, nullable=False)
    currency = Column(Text, nullable=False)
    category_id = Column(String, ForeignKey("categories.id", ondelete="SET NULL"))
    cadence = Column(Text, nullable=False)
    day_of_month = Column(Integer)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date)
    autopost_mode = Column(Text)
    is_paused = Column(Boolean, nullable=False, default=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=now_ts)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=now_ts, onupdate=now_ts)


class Bill(Base):
    __tablename__ = "bills"
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    rule_id = Column(String, ForeignKey("recurring_rules.id", ondelete="SET NULL"))
    name = Column(Text)
    due_date = Column(Date)
    amount_cents = Column(Integer)
    currency = Column(Text)
    category_id = Column(String, ForeignKey("categories.id", ondelete="SET NULL"))
    status = Column(Text)
    linked_txn_id = Column(String, ForeignKey("transactions.id", ondelete="SET NULL"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=now_ts)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=now_ts, onupdate=now_ts)


class Fund(Base):
    __tablename__ = "funds"
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(Text, nullable=False)
    currency = Column(Text, nullable=False)
    provider = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=now_ts)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=now_ts, onupdate=now_ts)


class FundPrice(Base):
    __tablename__ = "fund_prices"
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    fund_id = Column(String, ForeignKey("funds.id", ondelete="CASCADE"), primary_key=True)
    price_date = Column(Date, primary_key=True)
    nav = Column(Numeric(18, 6), nullable=False)
    currency = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=now_ts)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=now_ts, onupdate=now_ts)


class InvestmentTx(Base):
    __tablename__ = "investment_txs"
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    fund_id = Column(String, ForeignKey("funds.id", ondelete="CASCADE"), nullable=False)
    tx_date = Column(Date, nullable=False)
    kind = Column(Text, nullable=False)
    cash_amount_cents = Column(Integer, nullable=False)
    units = Column(Numeric(24, 6), nullable=False)
    price = Column(Numeric(18, 6), nullable=False)
    currency = Column(Text, nullable=False)
    source = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=now_ts)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=now_ts, onupdate=now_ts)


# ---------- Indexes (mirror schema.sql replacements for former GSIs) ----------
Index(
    # Case-insensitive unique email matches schema.sql users_email_lower_ux
    "users_email_lower_ux",
    func.lower(User.email),
    unique=True,
)
Index(
    "categories_user_parent_sort_idx",
    Category.user_id,
    Category.parent_category_id,
    Category.is_active,
    Category.sort_order,
)
Index(
    "budget_rules_user_category_idx",
    BudgetRule.user_id,
    BudgetRule.category_id,
    BudgetRule.is_active,
)
Index(
    "budget_rules_user_range_idx",
    BudgetRule.user_id,
    BudgetRule.start_month,
    BudgetRule.end_month,
)
Index(
    "budget_rule_month_overrides_month_idx",
    BudgetRuleMonthOverride.month,
    BudgetRuleMonthOverride.rule_id,
)
Index(
    "transactions_user_date_desc_idx",
    Transaction.user_id,
    Transaction.txn_date.desc(),
    Transaction.id,
)
Index(
    "transactions_uncat_idx",
    Transaction.user_id,
    Transaction.txn_date.desc(),
    Transaction.id,
    postgresql_where=(Transaction.category_id.is_(None) & (Transaction.amount_cents < 0)),
)
Index(
    "bills_user_due_date_idx",
    Bill.user_id,
    Bill.due_date,
    Bill.id,
)
Index(
    "fund_prices_user_date_idx",
    FundPrice.user_id,
    FundPrice.price_date.desc(),
    FundPrice.fund_id,
)
Index(
    "investment_txs_user_date_idx",
    InvestmentTx.user_id,
    InvestmentTx.tx_date.desc(),
    InvestmentTx.id,
)
Index(
    "budgets_user_month_idx",
    Budget.user_id,
    Budget.month,
    Budget.category_id,
)
Index(
    "objectives_user_status_idx",
    Objective.user_id,
    Objective.status,
    Objective.created_at.desc(),
)

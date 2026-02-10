from datetime import datetime
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
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

def now_ts():
    return datetime.utcnow()


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
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(Text, nullable=False)
    group = Column("group", Text)
    icon = Column(Text)
    color = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=now_ts)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=now_ts, onupdate=now_ts)

    user = relationship("User", back_populates="categories")


class Budget(Base):
    __tablename__ = "budgets"
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    month = Column(String, primary_key=True)  # YYYY-MM
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
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    txn_date = Column(Date, nullable=False)
    merchant = Column(Text, nullable=False)
    description = Column(Text)
    amount_cents = Column(Integer, nullable=False)
    currency = Column(Text, nullable=False)
    category_id = Column(String, ForeignKey("categories.id", ondelete="SET NULL"))
    notes = Column(Text)
    source = Column(Text)
    account_id = Column(Text)
    receipt_id = Column(String, ForeignKey("receipts.id", ondelete="SET NULL"))
    splits = Column(JSONB)
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
    line_items = Column(JSONB)
    transaction_id = Column(String, ForeignKey("transactions.id", ondelete="SET NULL"))
    ocr_provider = Column(Text)
    ocr_confidence = Column(Numeric(5, 4))
    ocr_raw_text = Column(Text)
    ocr_raw_blocks = Column(JSONB)
    ocr_error = Column(Text)
    parsed_receipt = Column(JSONB)
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

import uuid
from datetime import date
from typing import Any, Dict, List, Optional

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from db import SessionLocal
from db import models
from config.db import load_db_config


def _uid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def _user_dict(u: models.User) -> Dict[str, Any]:
    return {
        "PK": f"USER#{u.id}",
        "SK": f"USER#{u.id}",
        "GSI4PK": f"EMAIL#{u.email.lower()}",
        "GSI4SK": f"USER#{u.id}",
        "entityType": "User",
        "userId": u.id,
        "email": u.email,
        "passwordAlgo": u.password_algo,
        "passwordSalt": u.password_salt,
        "passwordIterations": u.password_iterations,
        "passwordHash": u.password_hash,
        "createdAt": u.created_at.isoformat() if u.created_at else None,
        "updatedAt": u.updated_at.isoformat() if u.updated_at else None,
        "currency": u.currency,
    }


def _category_dict(c: models.Category) -> Dict[str, Any]:
    return {
        "categoryId": c.id,
        "name": c.name,
        "group": c.group,
        "icon": c.icon,
        "color": c.color,
        "createdAt": c.created_at.isoformat() if c.created_at else None,
        "updatedAt": c.updated_at.isoformat() if c.updated_at else None,
    }


def _budget_dict(b: models.Budget) -> Dict[str, Any]:
    return {
        "month": b.month,
        "categoryId": b.category_id,
        "limit": b.limit_cents,
        "rollover": b.rollover,
        "rolloverTargetCategoryId": b.rollover_target_category_id,
        "currency": b.currency,
        "copiedFromMonth": b.copied_from_month,
        "purpose": b.purpose,
        "carryForwardEnabled": b.carry_forward_enabled,
        "isTerminal": b.is_terminal,
        "objectiveId": b.objective_id,
        "createdAt": b.created_at.isoformat() if b.created_at else None,
        "updatedAt": b.updated_at.isoformat() if b.updated_at else None,
    }


def _objective_plan_dict(p: models.ObjectiveMonthPlan) -> Dict[str, Any]:
    return {
        "month": p.month,
        "amount": p.amount_cents,
        "kind": p.kind,
        "isLastMonth": p.is_last_month,
    }


def _objective_dict(o: models.Objective, plans: List[models.ObjectiveMonthPlan]) -> Dict[str, Any]:
    return {
        "objectiveId": o.id,
        "name": o.name,
        "categoryId": o.category_id,
        "currency": o.currency,
        "totalAmount": o.total_amount_cents,
        "status": o.status,
        "plans": [_objective_plan_dict(p) for p in plans],
        "createdAt": o.created_at.isoformat() if o.created_at else None,
        "updatedAt": o.updated_at.isoformat() if o.updated_at else None,
    }


def _txn_dict(t: models.Transaction) -> Dict[str, Any]:
    return {
        "txnId": t.id,
        "date": t.txn_date.isoformat(),
        "merchant": t.merchant,
        "description": t.description or "",
        "amount": t.amount_cents,
        "currency": t.currency,
        "categoryId": t.category_id,
        "notes": t.notes or "",
        "source": t.source or "manual",
        "accountId": t.account_id,
        "receiptId": t.receipt_id,
        "splits": t.splits or [],
        "entityType": "Transaction",
    }


def _receipt_dict(r: models.Receipt) -> Dict[str, Any]:
    return {
        "receiptId": r.id,
        "merchant": r.merchant,
        "date": r.receipt_date.isoformat(),
        "total": r.total_cents,
        "status": r.status,
        "imageUrl": r.image_url,
        "lineItems": r.line_items or [],
        "transactionId": r.transaction_id,
        "ocrProvider": r.ocr_provider,
        "ocrConfidence": float(r.ocr_confidence) if r.ocr_confidence is not None else None,
        "ocrRawText": r.ocr_raw_text,
        "ocrRawBlocks": r.ocr_raw_blocks,
        "ocrError": r.ocr_error,
        "parsedReceipt": r.parsed_receipt,
        "needsReview": r.needs_review,
        "createdAt": r.created_at.isoformat() if r.created_at else None,
        "updatedAt": r.updated_at.isoformat() if r.updated_at else None,
        "entityType": "Receipt",
    }


def _recurring_dict(r: models.RecurringRule) -> Dict[str, Any]:
    return {
        "ruleId": r.id,
        "name": r.name,
        "amount": r.amount_cents,
        "currency": r.currency,
        "categoryId": r.category_id,
        "cadence": r.cadence,
        "dayOfMonth": r.day_of_month,
        "startDate": r.start_date.isoformat(),
        "endDate": r.end_date.isoformat() if r.end_date else None,
        "autopostMode": r.autopost_mode,
        "isPaused": r.is_paused,
        "createdAt": r.created_at.isoformat() if r.created_at else None,
        "updatedAt": r.updated_at.isoformat() if r.updated_at else None,
        "entityType": "RecurringRule",
    }


def _bill_dict(b: models.Bill) -> Dict[str, Any]:
    return {
        "billId": b.id,
        "ruleId": b.rule_id,
        "name": b.name,
        "dueDate": b.due_date.isoformat() if b.due_date else None,
        "amount": b.amount_cents,
        "currency": b.currency,
        "categoryId": b.category_id,
        "status": b.status,
        "linkedTxnId": b.linked_txn_id,
        "createdAt": b.created_at.isoformat() if b.created_at else None,
        "updatedAt": b.updated_at.isoformat() if b.updated_at else None,
        "entityType": "BillInstance",
    }


class DB:
    """SQLAlchemy-backed DB facade."""

    def __init__(self, session: Session):
        self.session = session

    # ---------- Users ----------
    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        stmt = select(models.User).where(models.User.email.ilike(email))
        user = self.session.scalars(stmt).first()
        return _user_dict(user) if user else None

    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        user = self.session.get(models.User, user_id)
        return _user_dict(user) if user else None

    def upsert_user(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        user = self.session.get(models.User, payload["userId"])
        if not user:
            user = models.User(
                id=payload["userId"],
                email=payload["email"],
                password_algo=payload["passwordAlgo"],
                password_salt=payload["passwordSalt"],
                password_iterations=payload.get("passwordIterations", 100000),
                password_hash=payload["passwordHash"],
                currency=payload.get("currency"),
            )
            self.session.add(user)
        else:
            user.email = payload.get("email", user.email)
            user.password_algo = payload.get("passwordAlgo", user.password_algo)
            user.password_salt = payload.get("passwordSalt", user.password_salt)
            user.password_iterations = payload.get("passwordIterations", user.password_iterations)
            user.password_hash = payload.get("passwordHash", user.password_hash)
            user.currency = payload.get("currency", user.currency)
        self.session.commit()
        self.session.refresh(user)
        return _user_dict(user)

    def update_user(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        user = self.session.get(models.User, user_id)
        if not user:
            return None
        for field, key in [
            ("email", "email"),
            ("password_algo", "passwordAlgo"),
            ("password_salt", "passwordSalt"),
            ("password_iterations", "passwordIterations"),
            ("password_hash", "passwordHash"),
            ("currency", "currency"),
        ]:
            if key in updates:
                setattr(user, field, updates[key])
        self.session.commit()
        self.session.refresh(user)
        return _user_dict(user)

    # ---------- Categories ----------
    def list_categories(self, user_id: str) -> List[Dict[str, Any]]:
        stmt = select(models.Category).where(models.Category.user_id == user_id)
        return [_category_dict(c) for c in self.session.scalars(stmt).all()]

    def create_category(self, user_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        cat_id = payload.get("categoryId") or _uid("cat")
        cat = models.Category(
            id=cat_id,
            user_id=user_id,
            name=payload["name"],
            group=payload.get("group"),
            icon=payload.get("icon"),
            color=payload.get("color"),
        )
        self.session.add(cat)
        self.session.commit()
        self.session.refresh(cat)
        return _category_dict(cat)

    def update_category(self, user_id: str, category_id: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        cat = self.session.get(models.Category, category_id)
        if not cat or cat.user_id != user_id:
            return None
        for field in ("name", "group", "icon", "color"):
            if field in payload:
                setattr(cat, field, payload[field])
        self.session.commit()
        self.session.refresh(cat)
        return _category_dict(cat)

    def delete_category(self, user_id: str, category_id: str) -> bool:
        cat = self.session.get(models.Category, category_id)
        if not cat or cat.user_id != user_id:
            return False
        self.session.delete(cat)
        self.session.commit()
        return True

    # ---------- Budgets ----------
    def list_budgets(self, user_id: str, month_prefix: Optional[str] = None) -> List[Dict[str, Any]]:
        stmt = select(models.Budget).where(models.Budget.user_id == user_id)
        if month_prefix:
            stmt = stmt.where(models.Budget.month.like(f"{month_prefix}%"))
        return [_budget_dict(b) for b in self.session.scalars(stmt).all()]

    def get_budget(self, user_id: str, month: str, category_id: str) -> Optional[Dict[str, Any]]:
        b = self.session.get(models.Budget, (user_id, month, category_id))
        return _budget_dict(b) if b else None

    def create_budget(self, user_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        b = models.Budget(
            user_id=user_id,
            month=payload["month"],
            category_id=payload["categoryId"],
            limit_cents=payload["limit"],
            rollover=payload.get("rollover", False),
            rollover_target_category_id=payload.get("rolloverTargetCategoryId"),
            currency=payload.get("currency"),
            copied_from_month=payload.get("copiedFromMonth"),
            purpose=payload.get("purpose"),
            carry_forward_enabled=payload.get("carryForwardEnabled", True),
            is_terminal=payload.get("isTerminal", False),
            objective_id=payload.get("objectiveId"),
        )
        self.session.add(b)
        self.session.commit()
        self.session.refresh(b)
        return _budget_dict(b)

    def _apply_budget_updates(self, b: models.Budget, updates: Dict[str, Any]) -> None:
        if "limit" in updates:
            b.limit_cents = updates["limit"]
        if "rollover" in updates:
            b.rollover = updates["rollover"]
        if "rolloverTargetCategoryId" in updates:
            b.rollover_target_category_id = updates["rolloverTargetCategoryId"]
        if "currency" in updates:
            b.currency = updates["currency"]
        if "copiedFromMonth" in updates:
            b.copied_from_month = updates["copiedFromMonth"]
        if "purpose" in updates:
            b.purpose = updates["purpose"]
        if "carryForwardEnabled" in updates:
            b.carry_forward_enabled = updates["carryForwardEnabled"]
        if "isTerminal" in updates:
            b.is_terminal = updates["isTerminal"]
        if "objectiveId" in updates:
            b.objective_id = updates["objectiveId"]

    def update_budget(self, user_id: str, month: str, category_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        b = self.session.get(models.Budget, (user_id, month, category_id))
        if not b:
            return None
        self._apply_budget_updates(b, updates)
        self.session.commit()
        self.session.refresh(b)
        return _budget_dict(b)

    def upsert_budget_with_future(self, user_id: str, month: str, category_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        current = self.session.get(models.Budget, (user_id, month, category_id))
        if current:
            self._apply_budget_updates(current, payload)
        else:
            current = models.Budget(
                user_id=user_id,
                month=month,
                category_id=category_id,
                limit_cents=payload["limit"],
                rollover=payload.get("rollover", False),
                rollover_target_category_id=payload.get("rolloverTargetCategoryId"),
                currency=payload.get("currency"),
                copied_from_month=payload.get("copiedFromMonth"),
                purpose=payload.get("purpose"),
                carry_forward_enabled=payload.get("carryForwardEnabled", True),
                is_terminal=payload.get("isTerminal", False),
                objective_id=payload.get("objectiveId"),
            )
            self.session.add(current)

        future_rows = self.session.scalars(
            select(models.Budget).where(
                models.Budget.user_id == user_id,
                models.Budget.category_id == category_id,
                models.Budget.month > month,
            )
        ).all()
        for row in future_rows:
            self._apply_budget_updates(row, payload)

        self.session.commit()
        self.session.refresh(current)
        return _budget_dict(current)

    def delete_budget(self, user_id: str, month: str, category_id: str) -> bool:
        b = self.session.get(models.Budget, (user_id, month, category_id))
        if not b:
            return False
        self.session.delete(b)
        self.session.commit()
        return True

    def delete_budgets_scoped(self, user_id: str, category_id: str, month: Optional[str], scope: str) -> int:
        stmt = delete(models.Budget).where(
            models.Budget.user_id == user_id,
            models.Budget.category_id == category_id,
        )
        if scope == "this_month":
            if not month:
                return 0
            stmt = stmt.where(models.Budget.month == month)
        elif scope == "from_month":
            if not month:
                return 0
            stmt = stmt.where(models.Budget.month >= month)
        elif scope != "all":
            return 0
        result = self.session.execute(stmt)
        self.session.commit()
        return int(result.rowcount or 0)

    def copy_budgets(self, user_id: str, target_month: str, source_month: str) -> List[Dict[str, Any]]:
        existing = {
            (b.category_id): b
            for b in self.session.scalars(
                select(models.Budget).where(models.Budget.user_id == user_id, models.Budget.month == target_month)
            ).all()
        }
        source = self.session.scalars(
            select(models.Budget).where(models.Budget.user_id == user_id, models.Budget.month == source_month)
        ).all()
        created: List[models.Budget] = []
        for b in source:
            if b.category_id in existing:
                continue
            nb = models.Budget(
                user_id=user_id,
                month=target_month,
                category_id=b.category_id,
                limit_cents=b.limit_cents,
                rollover=b.rollover,
                rollover_target_category_id=b.rollover_target_category_id,
                currency=b.currency,
                copied_from_month=source_month,
                purpose=b.purpose,
                carry_forward_enabled=b.carry_forward_enabled,
                is_terminal=b.is_terminal,
                objective_id=b.objective_id,
            )
            self.session.add(nb)
            created.append(nb)
        self.session.commit()
        return [_budget_dict(b) for b in created]

    # ---------- Objectives ----------
    def list_objectives(self, user_id: str) -> List[Dict[str, Any]]:
        objs = self.session.scalars(
            select(models.Objective).where(models.Objective.user_id == user_id).order_by(models.Objective.created_at.desc())
        ).all()
        if not objs:
            return []
        obj_ids = [o.id for o in objs]
        plans = self.session.scalars(
            select(models.ObjectiveMonthPlan)
            .where(models.ObjectiveMonthPlan.objective_id.in_(obj_ids))
            .order_by(models.ObjectiveMonthPlan.month)
        ).all()
        plans_by_obj: Dict[str, List[models.ObjectiveMonthPlan]] = {}
        for p in plans:
            plans_by_obj.setdefault(p.objective_id, []).append(p)
        return [_objective_dict(o, plans_by_obj.get(o.id, [])) for o in objs]

    def _objective_conflicts(
        self,
        user_id: str,
        category_id: str,
        months: List[str],
        objective_id: Optional[str] = None,
    ) -> List[models.Budget]:
        stmt = select(models.Budget).where(
            models.Budget.user_id == user_id,
            models.Budget.category_id == category_id,
            models.Budget.month.in_(months),
        )
        rows = self.session.scalars(stmt).all()
        conflicts: List[models.Budget] = []
        for b in rows:
            if objective_id and b.objective_id == objective_id:
                continue
            conflicts.append(b)
        return conflicts

    def create_objective(self, user_id: str, payload: Dict[str, Any], force: bool = False) -> Dict[str, Any]:
        objective_id = payload.get("objectiveId") or _uid("obj")
        plans = payload.get("plans", [])
        category_id = payload["categoryId"]
        months = [p["month"] for p in plans]
        conflicts = self._objective_conflicts(user_id, category_id, months)
        if conflicts and not force:
            raise ValueError([{"month": c.month, "categoryId": c.category_id} for c in conflicts])
        if conflicts and force:
            for c in conflicts:
                self.session.delete(c)

        obj = models.Objective(
            id=objective_id,
            user_id=user_id,
            name=payload["name"],
            category_id=category_id,
            currency=payload.get("currency"),
            total_amount_cents=payload.get("totalAmount"),
            status=payload.get("status", "ACTIVE"),
        )
        self.session.add(obj)

        for p in plans:
            amount = abs(int(p["amount"]))
            plan = models.ObjectiveMonthPlan(
                objective_id=objective_id,
                month=p["month"],
                amount_cents=amount,
                kind=(p.get("kind") or "SPEND").upper(),
                is_last_month=False,
            )
            self.session.add(plan)
            budget = models.Budget(
                user_id=user_id,
                month=p["month"],
                category_id=category_id,
                limit_cents=amount,
                rollover=False,
                purpose=payload["name"],
                currency=payload.get("currency"),
                carry_forward_enabled=False,
                is_terminal=False,
                objective_id=objective_id,
            )
            self.session.merge(budget)

        self.session.commit()
        saved_obj = self.session.get(models.Objective, objective_id)
        saved_plans = self.session.scalars(
            select(models.ObjectiveMonthPlan).where(models.ObjectiveMonthPlan.objective_id == objective_id).order_by(models.ObjectiveMonthPlan.month)
        ).all()
        return _objective_dict(saved_obj, saved_plans)

    def update_objective(self, user_id: str, objective_id: str, payload: Dict[str, Any], force: bool = False) -> Optional[Dict[str, Any]]:
        obj = self.session.get(models.Objective, objective_id)
        if not obj or obj.user_id != user_id:
            return None
        if "name" in payload:
            obj.name = payload["name"]
        if "currency" in payload:
            obj.currency = payload["currency"]
        if "totalAmount" in payload:
            obj.total_amount_cents = payload["totalAmount"]
        if "categoryId" in payload:
            obj.category_id = payload["categoryId"]
        if "status" in payload:
            obj.status = payload["status"]

        if "plans" in payload:
            plans = payload.get("plans") or []
            months = [p["month"] for p in plans]
            conflicts = self._objective_conflicts(user_id, obj.category_id, months, objective_id=objective_id)
            if conflicts and not force:
                raise ValueError([{"month": c.month, "categoryId": c.category_id} for c in conflicts])
            if conflicts and force:
                for c in conflicts:
                    self.session.delete(c)

            self.session.execute(
                delete(models.ObjectiveMonthPlan).where(models.ObjectiveMonthPlan.objective_id == objective_id)
            )
            self.session.execute(
                delete(models.Budget).where(models.Budget.user_id == user_id, models.Budget.objective_id == objective_id)
            )
            for p in plans:
                amount = abs(int(p["amount"]))
                self.session.add(models.ObjectiveMonthPlan(
                    objective_id=objective_id,
                    month=p["month"],
                    amount_cents=amount,
                    kind=(p.get("kind") or "SPEND").upper(),
                    is_last_month=False,
                ))
                self.session.add(models.Budget(
                    user_id=user_id,
                    month=p["month"],
                    category_id=obj.category_id,
                    limit_cents=amount,
                    rollover=False,
                    purpose=obj.name,
                    currency=obj.currency,
                    carry_forward_enabled=False,
                    is_terminal=False,
                    objective_id=objective_id,
                ))

        self.session.commit()
        saved_plans = self.session.scalars(
            select(models.ObjectiveMonthPlan).where(models.ObjectiveMonthPlan.objective_id == objective_id).order_by(models.ObjectiveMonthPlan.month)
        ).all()
        return _objective_dict(obj, saved_plans)

    def complete_objective(self, user_id: str, objective_id: str) -> Optional[Dict[str, Any]]:
        obj = self.session.get(models.Objective, objective_id)
        if not obj or obj.user_id != user_id:
            return None
        obj.status = "COMPLETED"
        self.session.commit()
        plans = self.session.scalars(
            select(models.ObjectiveMonthPlan).where(models.ObjectiveMonthPlan.objective_id == objective_id).order_by(models.ObjectiveMonthPlan.month)
        ).all()
        return _objective_dict(obj, plans)

    def archive_objective(self, user_id: str, objective_id: str) -> bool:
        obj = self.session.get(models.Objective, objective_id)
        if not obj or obj.user_id != user_id:
            return False
        self.session.execute(
            delete(models.Budget).where(
                models.Budget.user_id == user_id,
                models.Budget.objective_id == objective_id,
            )
        )
        obj.status = "ARCHIVED"
        self.session.commit()
        return True

    # ---------- Transactions ----------
    def list_transactions(
        self,
        user_id: str,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        category_id: Optional[str] = None,
        uncategorized_only: bool = False,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        stmt = select(models.Transaction).where(models.Transaction.user_id == user_id)
        if date_from:
            stmt = stmt.where(models.Transaction.txn_date >= date_from)
        if date_to:
            stmt = stmt.where(models.Transaction.txn_date <= date_to)
        if category_id:
            stmt = stmt.where(models.Transaction.category_id == category_id)
        if uncategorized_only:
            stmt = stmt.where(models.Transaction.category_id.is_(None)).where(models.Transaction.amount_cents < 0)
        stmt = stmt.order_by(models.Transaction.txn_date.desc(), models.Transaction.id)
        if limit:
            stmt = stmt.limit(limit)
        return [_txn_dict(t) for t in self.session.scalars(stmt).all()]

    def get_transaction(self, user_id: str, txn_id: str) -> Optional[Dict[str, Any]]:
        t = self.session.get(models.Transaction, txn_id)
        if not t or t.user_id != user_id:
            return None
        return _txn_dict(t)

    def create_transaction(self, user_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        txn_id = payload.get("txnId") or _uid("txn")
        t = models.Transaction(
            id=txn_id,
            user_id=user_id,
            txn_date=date.fromisoformat(payload["date"]),
            merchant=payload["merchant"],
            description=payload.get("description", ""),
            amount_cents=payload["amount"],
            currency=payload.get("currency", "CLP"),
            category_id=payload.get("categoryId"),
            notes=payload.get("notes", ""),
            source=payload.get("source", "manual"),
            account_id=payload.get("accountId"),
            receipt_id=payload.get("receiptId"),
            splits=payload.get("splits"),
        )
        self.session.add(t)
        self.session.commit()
        self.session.refresh(t)
        return _txn_dict(t)

    def delete_transaction(self, user_id: str, txn_id: str) -> bool:
        t = self.session.get(models.Transaction, txn_id)
        if not t or t.user_id != user_id:
            return False
        self.session.delete(t)
        self.session.commit()
        return True

    def update_transaction(self, user_id: str, txn_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        t = self.session.get(models.Transaction, txn_id)
        if not t or t.user_id != user_id:
            return None
        for key, field in [
            ("merchant", "merchant"),
            ("description", "description"),
            ("amount", "amount_cents"),
            ("currency", "currency"),
            ("categoryId", "category_id"),
            ("notes", "notes"),
            ("source", "source"),
            ("accountId", "account_id"),
            ("receiptId", "receipt_id"),
            ("splits", "splits"),
        ]:
            if key in updates:
                setattr(t, field, updates[key])
        if "date" in updates:
            t.txn_date = date.fromisoformat(updates["date"])
        self.session.commit()
        self.session.refresh(t)
        return _txn_dict(t)

    # ---------- Receipts ----------
    def list_receipts(self, user_id: str) -> List[Dict[str, Any]]:
        stmt = select(models.Receipt).where(models.Receipt.user_id == user_id)
        return [_receipt_dict(r) for r in self.session.scalars(stmt).all()]

    def create_receipt(self, user_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        rcpt_id = payload.get("receiptId") or _uid("rcpt")
        r = models.Receipt(
            id=rcpt_id,
            user_id=user_id,
            merchant=payload.get("merchant", ""),
            receipt_date=date.fromisoformat(payload.get("date") or date.today().isoformat()),
            total_cents=payload.get("total", 0),
            status=payload.get("status", "uploading"),
            image_url=payload.get("imageUrl"),
            line_items=payload.get("lineItems", []),
            transaction_id=payload.get("transactionId"),
            ocr_provider=payload.get("ocrProvider"),
            ocr_confidence=payload.get("ocrConfidence"),
            ocr_raw_text=payload.get("ocrRawText"),
            ocr_raw_blocks=payload.get("ocrRawBlocks"),
            ocr_error=payload.get("ocrError"),
            parsed_receipt=payload.get("parsedReceipt"),
            needs_review=payload.get("needsReview", False),
        )
        self.session.add(r)
        self.session.commit()
        self.session.refresh(r)
        return _receipt_dict(r)

    def update_receipt(self, user_id: str, receipt_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        r = self.session.get(models.Receipt, receipt_id)
        if not r or r.user_id != user_id:
            return None
        for key, field in [
            ("merchant", "merchant"),
            ("status", "status"),
            ("imageUrl", "image_url"),
            ("lineItems", "line_items"),
            ("transactionId", "transaction_id"),
            ("total", "total_cents"),
            ("ocrProvider", "ocr_provider"),
            ("ocrConfidence", "ocr_confidence"),
            ("ocrRawText", "ocr_raw_text"),
            ("ocrRawBlocks", "ocr_raw_blocks"),
            ("ocrError", "ocr_error"),
            ("parsedReceipt", "parsed_receipt"),
            ("needsReview", "needs_review"),
        ]:
            if key in updates:
                setattr(r, field, updates[key])
        if "date" in updates:
            r.receipt_date = date.fromisoformat(updates["date"])
        self.session.commit()
        self.session.refresh(r)
        return _receipt_dict(r)

    def delete_receipt(self, user_id: str, receipt_id: str) -> bool:
        r = self.session.get(models.Receipt, receipt_id)
        if not r or r.user_id != user_id:
            return False
        self.session.delete(r)
        self.session.commit()
        return True

    # ---------- Recurring ----------
    def list_recurring_rules(self, user_id: str) -> List[Dict[str, Any]]:
        stmt = select(models.RecurringRule).where(models.RecurringRule.user_id == user_id)
        return [_recurring_dict(r) for r in self.session.scalars(stmt).all()]

    def create_recurring(self, user_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        rule_id = payload.get("ruleId") or _uid("rec")
        r = models.RecurringRule(
            id=rule_id,
            user_id=user_id,
            name=payload["name"],
            amount_cents=payload["amount"],
            currency=payload.get("currency", "CLP"),
            category_id=payload.get("categoryId"),
            cadence=payload["cadence"],
            day_of_month=payload.get("dayOfMonth"),
            start_date=date.fromisoformat(payload["startDate"]),
            end_date=date.fromisoformat(payload["endDate"]) if payload.get("endDate") else None,
            autopost_mode=payload.get("autopostMode"),
            is_paused=payload.get("isPaused", False),
        )
        self.session.add(r)
        self.session.commit()
        self.session.refresh(r)
        return _recurring_dict(r)

    def update_recurring(self, user_id: str, rule_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        r = self.session.get(models.RecurringRule, rule_id)
        if not r or r.user_id != user_id:
            return None
        for key, field in [
            ("name", "name"),
            ("amount", "amount_cents"),
            ("currency", "currency"),
            ("categoryId", "category_id"),
            ("cadence", "cadence"),
            ("dayOfMonth", "day_of_month"),
            ("autopostMode", "autopost_mode"),
            ("isPaused", "is_paused"),
        ]:
            if key in updates:
                setattr(r, field, updates[key])
        if "startDate" in updates:
            r.start_date = date.fromisoformat(updates["startDate"])
        if "endDate" in updates:
            r.end_date = date.fromisoformat(updates["endDate"]) if updates["endDate"] else None
        self.session.commit()
        self.session.refresh(r)
        return _recurring_dict(r)

    # ---------- Bills ----------
    def list_bills(self, user_id: str, date_from: Optional[date], date_to: Optional[date], status: Optional[str]) -> List[Dict[str, Any]]:
        stmt = select(models.Bill).where(models.Bill.user_id == user_id)
        if date_from:
            stmt = stmt.where(models.Bill.due_date >= date_from)
        if date_to:
            stmt = stmt.where(models.Bill.due_date <= date_to)
        if status:
            stmt = stmt.where(models.Bill.status == status.upper())
        stmt = stmt.order_by(models.Bill.due_date, models.Bill.id)
        return [_bill_dict(b) for b in self.session.scalars(stmt).all()]

    def update_bill(self, user_id: str, bill_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        b = self.session.get(models.Bill, bill_id)
        if not b or b.user_id != user_id:
            return None
        for key, field in [("status", "status"), ("amount", "amount_cents")]:
            if key in updates:
                setattr(b, field, updates[key] if key != "status" else updates[key].upper())
        self.session.commit()
        self.session.refresh(b)
        return _bill_dict(b)


def get_session() -> Session:
    cfg = load_db_config()
    if cfg["backend"] != "postgres":
        raise RuntimeError("Only postgres backend is enabled for ORM")
    return SessionLocal()


# Convenience functions matching previous JSONL helpers
def list_categories(db: DB, user_id: str) -> List[Dict[str, Any]]:
    return db.list_categories(user_id)


def list_budgets(db: DB, user_id: str, month: str | None = None) -> List[Dict[str, Any]]:
    return db.list_budgets(user_id, month_prefix=month)


def list_recurring_rules(db: DB, user_id: str) -> List[Dict[str, Any]]:
    return db.list_recurring_rules(user_id)


def list_bills(db: DB, user_id: str, date_from: str | None, date_to: str | None, status: str | None) -> List[Dict[str, Any]]:
    df = date.fromisoformat(date_from) if date_from else None
    dt = date.fromisoformat(date_to) if date_to else None
    return db.list_bills(user_id, df, dt, status)


def list_transactions(
    db: DB,
    user_id: str,
    date_from: str | None = None,
    date_to: str | None = None,
    category_id: str | None = None,
    uncategorized_only: bool = False,
    limit: int | None = None,
) -> List[Dict[str, Any]]:
    df = date.fromisoformat(date_from) if date_from else None
    dt = date.fromisoformat(date_to) if date_to else None
    return db.list_transactions(user_id, df, dt, category_id, uncategorized_only, limit)


def get_transaction(db: DB, user_id: str, txn_id: str, date_str: str) -> Optional[Dict[str, Any]]:
    # date_str unused now
    return db.get_transaction(user_id, txn_id)


def create_transaction(db: DB, user_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    return db.create_transaction(user_id, payload)


def delete_transaction(db: DB, user_id: str, txn_id: str, date_str: str) -> bool:
    return db.delete_transaction(user_id, txn_id)


def list_receipts(db: DB, user_id: str) -> List[Dict[str, Any]]:
    return db.list_receipts(user_id)

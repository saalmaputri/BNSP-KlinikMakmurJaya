from datetime import date, datetime, time
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models.entities import Medicine, Order, OrderItem, Payment
from app.repositories.base import BaseRepository


class OrderRepository(BaseRepository[Order]):
    model = Order

    def get_with_items(self, order_id: UUID) -> Order | None:
        return self.db.execute(
            select(Order)
            .options(joinedload(Order.items), joinedload(Order.payments))
            .where(Order.id == order_id)
        ).unique().scalar_one_or_none()

    def get_by_order_number(self, order_number: str) -> Order | None:
        return self.db.execute(
            select(Order)
            .options(joinedload(Order.items), joinedload(Order.payments))
            .where(Order.order_number == order_number)
        ).unique().scalar_one_or_none()

    def list_by_patient(self, patient_id: UUID) -> list[Order]:
        return list(
            self.db.execute(
                select(Order)
                .options(joinedload(Order.items), joinedload(Order.payments))
                .where(Order.patient_id == patient_id)
                .order_by(Order.created_at.desc())
            ).unique().scalars().all()
        )

    def get_latest_active_by_patient(self, patient_id: UUID, statuses: list[str] | None = None) -> Order | None:
        active_statuses = statuses or ["WAITING_PRESCRIPTION", "PRESCRIPTION_REVIEW"]
        return self.db.execute(
            select(Order)
            .options(joinedload(Order.items), joinedload(Order.payments))
            .where(
                Order.patient_id == patient_id,
                Order.deleted_at.is_(None),
                Order.status.in_(active_statuses),
                Order.order_type == "ONLINE",
            )
            .order_by(Order.created_at.desc())
        ).unique().scalar_one_or_none()

    def list_latest(self, limit: int = 10, order_type: str | None = None) -> list[Order]:
        stmt = (
            select(Order)
            .options(joinedload(Order.items), joinedload(Order.payments))
            .order_by(Order.created_at.desc())
            .limit(limit)
        )
        if order_type:
            stmt = stmt.where(Order.order_type == order_type)
        return list(self.db.execute(stmt).unique().scalars().all())

    def add_item(self, item: OrderItem) -> OrderItem:
        return self.add(item)

    def add_payment(self, payment: Payment) -> Payment:
        return self.add(payment)

    def dashboard_sales_total(self, start: datetime, end: datetime, order_type: str | None = None) -> dict:
        stmt = select(
            func.count(Order.id).label("orders"),
            func.coalesce(func.sum(Order.total_amount), 0).label("revenue"),
        ).where(
            Order.checkout_at >= start,
            Order.checkout_at < end,
            Order.status.in_(["PAID", "PROCESSING", "READY_FOR_PICKUP", "SHIPPED", "COMPLETED"]),
        )
        if order_type:
            stmt = stmt.where(Order.order_type == order_type)
        row = self.db.execute(stmt).mappings().one()
        return dict(row)

    def sales_by_day(self, start: datetime, end: datetime) -> list[dict]:
        period = func.date_trunc("day", Order.checkout_at).label("period")
        rows = self.db.execute(
            select(
                period,
                func.count(Order.id).label("orders"),
                func.coalesce(func.sum(Order.total_amount), 0).label("sales"),
            )
            .where(
                Order.checkout_at >= start,
                Order.checkout_at < end,
                Order.status.in_(["PAID", "PROCESSING", "READY_FOR_PICKUP", "SHIPPED", "COMPLETED"]),
            )
            .group_by(period)
            .order_by(period)
        ).mappings()
        return [dict(row) for row in rows]

    def patient_summary(self, patient_id: UUID) -> dict:
        active_statuses = ["PENDING_PAYMENT", "WAITING_PRESCRIPTION", "PRESCRIPTION_REVIEW", "PAID", "PROCESSING", "READY_FOR_PICKUP", "SHIPPED"]
        row = self.db.execute(
            select(
                func.count(Order.id).filter(Order.status.in_(active_statuses)).label("active_orders"),
                func.count(Order.id).filter(Order.status == "COMPLETED").label("completed_orders"),
                func.coalesce(func.sum(Order.total_amount).filter(Order.status == "COMPLETED"), 0).label("total_spent"),
            ).where(Order.patient_id == patient_id)
        ).mappings().one()
        return dict(row)

    def count_completed(self, start: datetime, end: datetime, order_type: str | None = None) -> int:
        stmt = select(func.count(Order.id)).where(
            Order.checkout_at >= start,
            Order.checkout_at < end,
            Order.status == "COMPLETED",
        )
        if order_type:
            stmt = stmt.where(Order.order_type == order_type)
        return int(self.db.scalar(stmt) or 0)

    def best_selling(self, limit: int = 10) -> list[dict]:
        rows = self.db.execute(
            select(
                Medicine.id,
                Medicine.name,
                Medicine.sku,
                func.sum(OrderItem.quantity).label("total_sold"),
                func.sum(OrderItem.line_total).label("gross_sales"),
            )
            .join(OrderItem, OrderItem.medicine_id == Medicine.id)
            .join(Order, Order.id == OrderItem.order_id)
            .where(Order.status.in_(["PAID", "PROCESSING", "READY_FOR_PICKUP", "SHIPPED", "COMPLETED"]))
            .group_by(Medicine.id, Medicine.name, Medicine.sku)
            .order_by(func.sum(OrderItem.quantity).desc())
            .limit(limit)
        ).mappings()
        return [dict(row) for row in rows]

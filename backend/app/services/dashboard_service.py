from datetime import datetime, time, timedelta, timezone

from sqlalchemy.orm import Session

from app.utils.order_serialization import serialize_order, serialize_prescription
from app.repositories.order_repository import OrderRepository
from app.repositories.prescription_repository import PrescriptionRepository
from app.services.stock_service import StockService


class DashboardService:
    def __init__(self, db: Session) -> None:
        self.orders = OrderRepository(db)
        self.stocks = StockService(db)
        self.prescriptions = PrescriptionRepository(db)

    def admin(self) -> dict:
        now = datetime.now(timezone.utc)
        start = datetime.combine(now.date(), time.min, tzinfo=timezone.utc)
        end = now
        sales = self.orders.dashboard_sales_total(start, end)
        return {
            "total_sales_today": sales["revenue"],
            "total_orders_today": sales["orders"],
            "critical_stock": len(self.stocks.critical()),
            "pending_prescriptions": len(self.prescriptions.list_pending()),
            "sales_chart": self._weekly_sales(now),
            "latest_orders": [serialize_order(order) for order in self.orders.list_latest(5)],
        }

    def pharmacist(self) -> dict:
        return {
            "pending_prescriptions": len(self.prescriptions.list_pending()),
            "expired_soon": len(self.stocks.expired_soon(90)),
            "critical_stock": len(self.stocks.critical()),
            "total_medicines": len(self.stocks.list()),
            "pending_items": [serialize_prescription(item) for item in self.prescriptions.list_pending()[:5]],
        }

    def cashier(self) -> dict:
        now = datetime.now(timezone.utc)
        start = datetime.combine(now.date(), time.min, tzinfo=timezone.utc)
        sales = self.orders.dashboard_sales_total(start, now, "OFFLINE")
        return {
            "counter_status": "OPEN",
            "sales_today": sales["revenue"],
            "transactions_today": sales["orders"],
            "completed_today": self.orders.count_completed(start, now, "OFFLINE"),
            "latest_transactions": [serialize_order(order) for order in self.orders.list_latest(5, "OFFLINE")],
        }

    def customer(self, user_id) -> dict:
        orders = self.orders.list_by_patient(user_id)
        summary = self.orders.patient_summary(user_id)
        return {
            **summary,
            "orders": [serialize_order(order) for order in orders],
            "latest_order": serialize_order(orders[0]) if orders else None,
        }

    def _weekly_sales(self, now: datetime) -> list[dict]:
        start_date = now.date() - timedelta(days=6)
        start = datetime.combine(start_date, time.min, tzinfo=timezone.utc)
        rows = self.orders.sales_by_day(start, now + timedelta(days=1))
        indexed = {row["period"].date(): row for row in rows}
        labels = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]
        return [
            {
                "name": labels[(start_date + timedelta(days=offset)).weekday()],
                "sales": indexed.get(start_date + timedelta(days=offset), {}).get("sales", 0),
                "orders": indexed.get(start_date + timedelta(days=offset), {}).get("orders", 0),
            }
            for offset in range(7)
        ]

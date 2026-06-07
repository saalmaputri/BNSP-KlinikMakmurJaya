from datetime import datetime, time, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.entities import Order, OrderItem, Payment, ReportJob
from app.repositories.job_repository import ReportJobRepository
from app.utils.pdf_generator import PDFReportGenerator


class ReportService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.jobs = ReportJobRepository(db)

    def sales(self, start_date, end_date, group_by: str = "day") -> list[dict]:
        start_dt = datetime.combine(start_date, time.min, tzinfo=timezone.utc)
        inclusive_end = datetime.combine(end_date + timedelta(days=1), time.min, tzinfo=timezone.utc)
        unit = {"day": "day", "week": "week", "month": "month"}.get(group_by, "day")
        period = func.date_trunc(unit, Order.checkout_at).label("period")
        rows = self.db.execute(
            select(
                period,
                func.count(func.distinct(Order.id)).label("total_orders"),
                func.coalesce(func.sum(Order.total_amount), 0).label("gross_sales"),
                func.coalesce(func.sum(Payment.amount).filter(Payment.status == "VERIFIED"), 0).label("paid_sales"),
            )
            .outerjoin(Payment, Payment.order_id == Order.id)
            .where(Order.checkout_at >= start_dt, Order.checkout_at < inclusive_end)
            .group_by(period)
            .order_by(period)
        ).mappings()
        return [dict(row) for row in rows]

    def best_selling(self) -> list[dict]:
        rows = self.db.execute(
            select(
                OrderItem.medicine_id.label("id"),
                OrderItem.medicine_name_snapshot.label("name"),
                OrderItem.medicine_sku_snapshot.label("sku"),
                func.sum(OrderItem.quantity).label("total_sold"),
                func.sum(OrderItem.line_total).label("gross_sales"),
            )
            .join(Order, Order.id == OrderItem.order_id)
            .join(Payment, Payment.order_id == Order.id)
            .where(Payment.status == "VERIFIED")
            .group_by(OrderItem.medicine_id, OrderItem.medicine_name_snapshot, OrderItem.medicine_sku_snapshot)
            .order_by(func.sum(OrderItem.quantity).desc())
            .limit(10)
        ).mappings()
        return [dict(row) for row in rows]

    def generate_pdf(self, start_date, end_date) -> ReportJob:
        job = self.jobs.add(ReportJob(report_type="DAILY_SALES", status="PROCESSING", filter_params={"start_date": str(start_date), "end_date": str(end_date)}, started_at=datetime.now(timezone.utc)))
        try:
            rows = self.sales(start_date, end_date)
            file_url = PDFReportGenerator(get_settings().report_dir).sales_report(f"sales-{job.id}.pdf", rows)
            job.file_url = file_url
            job.status = "SUCCESS"
            job.finished_at = datetime.now(timezone.utc)
        except Exception as exc:
            job.status = "FAILED"
            job.error_message = str(exc)
        return job

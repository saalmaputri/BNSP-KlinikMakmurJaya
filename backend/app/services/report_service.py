from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.entities import Order, ReportJob
from app.repositories.job_repository import ReportJobRepository
from app.utils.pdf_generator import PDFReportGenerator


class ReportService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.jobs = ReportJobRepository(db)

    def sales(self, start_date, end_date, group_by: str = "day") -> list[dict]:
        inclusive_end = end_date + timedelta(days=1)
        unit = {"day": "day", "week": "week", "month": "month"}.get(group_by, "day")
        period = func.date_trunc(unit, Order.checkout_at).label("period")
        rows = self.db.execute(
            select(
                period,
                func.count(Order.id).label("total_orders"),
                func.coalesce(func.sum(Order.total_amount), 0).label("gross_sales"),
                func.coalesce(func.sum(Order.paid_amount), 0).label("paid_sales"),
            )
            .where(Order.checkout_at >= start_date, Order.checkout_at < inclusive_end, Order.status.in_(["PAID", "PROCESSING", "READY_FOR_PICKUP", "SHIPPED", "COMPLETED"]))
            .group_by(period)
            .order_by(period)
        ).mappings()
        return [dict(row) for row in rows]

    def best_selling(self) -> list[dict]:
        from app.repositories.order_repository import OrderRepository

        return OrderRepository(self.db).best_selling()

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

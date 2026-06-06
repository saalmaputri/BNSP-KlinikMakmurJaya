from app.database import SessionLocal
from app.jobs.celery_app import celery_app
from app.services.import_service import ImportService
from app.services.report_service import ReportService


@celery_app.task(name="app.jobs.tasks.generate_report_task")
def generate_report_task(start_date: str, end_date: str):
    db = SessionLocal()
    try:
        job = ReportService(db).generate_pdf(start_date, end_date)
        db.commit()
        return {"job_id": str(job.id), "status": job.status}
    finally:
        db.close()


@celery_app.task(name="app.jobs.tasks.import_medicine_task")
def import_medicine_task(file_path: str, created_by: str | None = None):
    db = SessionLocal()
    try:
        job = ImportService(db).import_medicines(file_path, created_by)
        db.commit()
        return {"job_id": str(job.id), "status": job.status}
    finally:
        db.close()


@celery_app.task(name="app.jobs.tasks.process_payment_task")
def process_payment_task(payment_id: str):
    return {"payment_id": payment_id, "status": "queued"}


@celery_app.task(name="app.jobs.tasks.send_notification_task")
def send_notification_task(notification_id: str):
    return {"notification_id": notification_id, "status": "sent"}

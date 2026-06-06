from celery import Celery

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery("klinik_makmur_jaya", broker=settings.redis_url, backend=settings.redis_url)
celery_app.conf.task_routes = {
    "app.jobs.tasks.generate_report_task": {"queue": "reports"},
    "app.jobs.tasks.import_medicine_task": {"queue": "imports"},
    "app.jobs.tasks.process_payment_task": {"queue": "payments"},
    "app.jobs.tasks.send_notification_task": {"queue": "notifications"},
}

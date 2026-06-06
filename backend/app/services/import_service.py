from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.entities import ImportJob
from app.repositories.job_repository import ImportJobRepository
from app.utils.import_handler import ExcelImportHandler


class ImportService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.jobs = ImportJobRepository(db)
        self.handler = ExcelImportHandler()

    def import_medicines(self, file_path: str, created_by) -> ImportJob:
        job = self.jobs.add(ImportJob(job_type="MEDICINES", status="PROCESSING", original_file_name=file_path, file_url=file_path, created_by=created_by, started_at=datetime.now(timezone.utc)))
        try:
            df = self.handler.read(file_path)
            errors = self.handler.validate_medicines(df)
            job.total_rows = len(df)
            if errors:
                job.status = "FAILED"
                job.failed_rows = len(df)
                job.error_summary = {"errors": errors}
            else:
                job.status = "SUCCESS"
                job.success_rows = len(df)
            job.finished_at = datetime.now(timezone.utc)
        except Exception as exc:
            job.status = "FAILED"
            job.error_summary = {"errors": [str(exc)]}
            job.finished_at = datetime.now(timezone.utc)
        return job

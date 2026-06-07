from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import require_roles
from app.database import get_db
from app.models.entities import User
from app.repositories.job_repository import ReportJobRepository
from app.schemas.reporting import JobResponse
from app.services.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/sales")
def sales(start_date: date, end_date: date, group_by: str = "day", db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN", "KASIR"))):
    return ReportService(db).sales(start_date, end_date, group_by)


@router.get("/best-selling")
def best_selling(db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN", "KASIR"))):
    return ReportService(db).best_selling()


@router.get("/revenue")
def revenue(start_date: date, end_date: date, db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN", "KASIR"))):
    return ReportService(db).sales(start_date, end_date, "month")


@router.post("/generate-pdf", response_model=JobResponse)
def generate_pdf(start_date: date, end_date: date, db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN"))):
    job = ReportService(db).generate_pdf(start_date, end_date)
    db.commit()
    db.refresh(job)
    return job


@router.get("/jobs/{job_id}", response_model=JobResponse)
def job_detail(job_id: UUID, db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN"))):
    job = ReportJobRepository(db).get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Report job tidak ditemukan")
    return job

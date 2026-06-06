from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import require_roles
from app.database import get_db
from app.models.entities import User
from app.repositories.job_repository import ImportJobRepository
from app.services.import_service import ImportService

router = APIRouter(prefix="/imports", tags=["Imports"])


class ImportPathRequest(BaseModel):
    file_path: str


@router.post("/medicines")
def import_medicines(payload: ImportPathRequest, db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN"))):
    job = ImportService(db).import_medicines(payload.file_path, user.id)
    db.commit()
    return job


@router.get("/jobs/{job_id}")
def import_job(job_id: str, db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN"))):
    return ImportJobRepository(db).get(job_id)

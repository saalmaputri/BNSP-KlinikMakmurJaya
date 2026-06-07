from pathlib import Path
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.core.dependencies import require_roles
from app.database import get_db
from app.models.entities import User
from app.repositories.job_repository import ImportJobRepository
from app.services.import_service import ImportService

router = APIRouter(prefix="/imports", tags=["Imports"])


@router.post("/medicines")
async def import_medicines(file: UploadFile = File(...), db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN"))):
    upload_dir = Path("uploads/imports")
    upload_dir.mkdir(parents=True, exist_ok=True)
    suffix = Path(file.filename or "").suffix or ".csv"
    saved_path = upload_dir / f"import-{uuid4()}{suffix}"
    content = await file.read()
    saved_path.write_bytes(content)
    job = ImportService(db).import_medicines(str(saved_path), user.id)
    db.commit()
    db.refresh(job)
    return job


@router.get("/jobs/{job_id}")
def import_job(job_id: UUID, db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN"))):
    return ImportJobRepository(db).get(job_id)

from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import require_roles
from app.database import get_db
from app.models.entities import ErrorLog, User
from app.repositories.log_repository import ErrorLogRepository

router = APIRouter(prefix="/error-logs", tags=["Error Logs"])


class ErrorLogCreate(BaseModel):
    level: str = "ERROR"
    message: str
    context: dict | None = None


@router.get("")
def list_logs(db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN"))):
    return ErrorLogRepository(db).list_latest()


@router.post("")
def create_log(payload: ErrorLogCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN"))):
    log = ErrorLog(level=payload.level, message=payload.message, context=payload.context, user_id=user.id)
    ErrorLogRepository(db).add(log)
    db.commit()
    return log


@router.put("/{log_id}/resolve")
def resolve(log_id: UUID, db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN"))):
    log = ErrorLogRepository(db).get(log_id)
    log.status = "RESOLVED"
    db.commit()
    return log

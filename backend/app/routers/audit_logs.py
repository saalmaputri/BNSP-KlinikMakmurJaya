from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import require_roles
from app.database import get_db
from app.models.entities import User
from app.repositories.log_repository import AuditLogRepository

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@router.get("")
def list_audit_logs(db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN"))):
    return AuditLogRepository(db).list_latest()

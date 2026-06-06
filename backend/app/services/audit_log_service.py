from sqlalchemy.orm import Session

from app.models.entities import AuditLog, ErrorLog
from app.repositories.log_repository import AuditLogRepository, ErrorLogRepository


class AuditLogService:
    def __init__(self, db: Session) -> None:
        self.repo = AuditLogRepository(db)

    def record(self, action: str, entity_name: str, user_id=None, role_code=None, entity_id=None, old_values=None, new_values=None, request=None) -> AuditLog:
        log = AuditLog(
            user_id=user_id,
            role_code=role_code,
            action=action,
            entity_name=entity_name,
            entity_id=entity_id,
            old_values=old_values,
            new_values=new_values,
            ip_address=request.client.host if request and request.client else None,
            user_agent=request.headers.get("user-agent") if request else None,
            request_id=request.headers.get("x-request-id") if request else None,
        )
        return self.repo.add(log)


class ErrorLogService:
    def __init__(self, db: Session) -> None:
        self.repo = ErrorLogRepository(db)

    def record(self, message: str, level: str = "ERROR", stack_trace: str | None = None, request=None, user_id=None, context=None) -> ErrorLog:
        log = ErrorLog(
            level=level,
            message=message,
            stack_trace=stack_trace,
            path=str(request.url.path) if request else None,
            method=request.method if request else None,
            request_id=request.headers.get("x-request-id") if request else None,
            user_id=user_id,
            context=context,
        )
        return self.repo.add(log)

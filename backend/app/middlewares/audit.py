from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from app.database import SessionLocal
from app.services.audit_log_service import AuditLogService


class AuditLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
            db = SessionLocal()
            try:
                AuditLogService(db).record(
                    action=f"{request.method} {request.url.path}",
                    entity_name="http_request",
                    new_values={"status_code": response.status_code},
                    request=request,
                )
                db.commit()
            finally:
                db.close()
        return response

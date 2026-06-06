import traceback

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.exceptions import AppException
from app.database import SessionLocal
from app.services.audit_log_service import ErrorLogService


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except AppException as exc:
            return JSONResponse(status_code=exc.status_code, content={"detail": exc.message, "code": exc.code})
        except Exception as exc:
            db = SessionLocal()
            try:
                ErrorLogService(db).record(str(exc), "ERROR", traceback.format_exc(), request)
                db.commit()
            finally:
                db.close()
            return JSONResponse(status_code=500, content={"detail": "Terjadi kesalahan server", "code": "INTERNAL_SERVER_ERROR"})

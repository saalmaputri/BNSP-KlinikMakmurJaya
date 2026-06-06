from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import AuditLog, ErrorLog, Notification
from app.repositories.base import BaseRepository


class AuditLogRepository(BaseRepository[AuditLog]):
    model = AuditLog

    def list_latest(self, limit: int = 100) -> list[AuditLog]:
        return list(self.db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)))


class ErrorLogRepository(BaseRepository[ErrorLog]):
    model = ErrorLog

    def list_latest(self, limit: int = 100) -> list[ErrorLog]:
        return list(self.db.scalars(select(ErrorLog).order_by(ErrorLog.created_at.desc()).limit(limit)))


class NotificationRepository(BaseRepository[Notification]):
    model = Notification

    def list_for_user(self, user_id) -> list[Notification]:
        return list(
            self.db.scalars(
                select(Notification)
                .where(Notification.user_id == user_id)
                .order_by(Notification.created_at.desc())
                .limit(50)
            )
        )

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.entities import Notification
from app.repositories.auth_repository import AuthRepository
from app.repositories.log_repository import NotificationRepository


class NotificationService:
    ALLOWED_TYPES = {"LOW_STOCK", "EXPIRY", "ORDER", "PAYMENT", "PRESCRIPTION", "IMPORT", "REPORT", "SYSTEM"}

    def __init__(self, db: Session) -> None:
        self.repo = NotificationRepository(db)
        self.users = AuthRepository(db)

    def list_for_user(self, user_id: UUID):
        return self.repo.list_for_user(user_id)

    def create(self, user_id, type: str, title: str, message: str, entity_name=None, entity_id=None, priority="NORMAL"):
        notification_type = self._normalize_type(type, entity_name)
        return self.repo.add(Notification(user_id=user_id, type=notification_type, title=title, message=message, entity_name=entity_name, entity_id=entity_id, priority=priority))

    def create_for_roles(self, role_codes: list[str], type: str, title: str, message: str, entity_name=None, entity_id=None, priority="NORMAL"):
        return [
            self.create(user.id, type, title, message, entity_name, entity_id, priority)
            for user in self.users.list_active_users_by_roles(role_codes)
        ]

    def mark_read(self, notification_id: UUID, user_id: UUID):
        notification = self.repo.get(notification_id)
        if not notification or notification.user_id != user_id:
            return None
        if notification.read_at is None:
            notification.read_at = datetime.now(timezone.utc)
        return notification

    @classmethod
    def _normalize_type(cls, type: str, entity_name: str | None = None) -> str:
        value = (type or "").upper()
        if value in cls.ALLOWED_TYPES:
            return value

        searchable = f"{value} {(entity_name or '').upper()}"
        for category in ("PRESCRIPTION", "PAYMENT", "ORDER", "IMPORT", "REPORT"):
            if category in searchable:
                return category
        if "STOCK" in searchable:
            return "LOW_STOCK"
        return "SYSTEM"

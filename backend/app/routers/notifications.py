from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import require_roles
from app.database import get_db
from app.models.entities import User
from app.core.exceptions import NotFoundException
from app.services.notification_service import NotificationService
from app.services.stock_service import StockService

router = APIRouter(tags=["Notifications and Alerts"])


@router.get("/notifications")
def notifications(db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN", "APOTEKER", "KASIR", "PASIEN"))):
    return NotificationService(db).list_for_user(user.id)


@router.post("/notifications/mark-read")
def mark_read(notification_id: UUID, db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN", "APOTEKER", "KASIR", "PASIEN"))):
    notification = NotificationService(db).mark_read(notification_id, user.id)
    if not notification:
        raise NotFoundException("Notifikasi tidak ditemukan")
    db.commit()
    return notification


@router.get("/alerts/stock")
def stock_alerts(db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN", "APOTEKER"))):
    return StockService(db).critical()


@router.get("/alerts/expired")
def expired_alerts(days: int = 90, db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN", "APOTEKER"))):
    return StockService(db).expired_soon(days)

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import require_roles
from app.database import get_db
from app.models.entities import User
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/admin")
def admin(db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN"))):
    return DashboardService(db).admin()


@router.get("/pharmacist")
def pharmacist(db: Session = Depends(get_db), user: User = Depends(require_roles("APOTEKER"))):
    return DashboardService(db).pharmacist()


@router.get("/cashier")
def cashier(db: Session = Depends(get_db), user: User = Depends(require_roles("KASIR"))):
    return DashboardService(db).cashier()


@router.get("/customer")
def customer(db: Session = Depends(get_db), user: User = Depends(require_roles("PASIEN"))):
    return DashboardService(db).customer(user.id)

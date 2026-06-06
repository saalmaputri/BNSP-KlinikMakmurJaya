from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import require_roles
from app.database import get_db
from app.models.entities import User
from app.schemas.medicine import BatchCreate, StockAdjustmentRequest
from app.services.stock_service import StockService

router = APIRouter(prefix="/stocks", tags=["Stocks"])


@router.get("")
def list_stocks(db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN", "APOTEKER", "KASIR"))):
    return StockService(db).list()


@router.post("/batches")
def create_batch(payload: BatchCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN", "APOTEKER"))):
    batch = StockService(db).create_batch(payload)
    db.commit()
    return batch


@router.post("/adjustment")
def adjustment(payload: StockAdjustmentRequest, db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN", "APOTEKER"))):
    batch = StockService(db).adjust(payload, user.id)
    db.commit()
    return batch


@router.get("/critical")
def critical(db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN", "APOTEKER", "KASIR"))):
    return StockService(db).critical()


@router.get("/expired-soon")
def expired_soon(days: int = 90, db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN", "APOTEKER"))):
    return StockService(db).expired_soon(days)

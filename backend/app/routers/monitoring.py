from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.monitoring_service import MonitoringService

router = APIRouter(prefix="/monitoring", tags=["Monitoring"])


@router.get("/health")
def health():
    return MonitoringService().health()


@router.get("/resources")
def resources():
    return MonitoringService().resources()


@router.get("/database")
def database(db: Session = Depends(get_db)):
    return MonitoringService(db).database()


@router.get("/redis")
def redis_status():
    return MonitoringService().redis()

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import require_roles
from app.database import get_db
from app.models.entities import User
from app.repositories.order_repository import OrderRepository
from app.schemas.order import OfflineCheckoutRequest, OrderResponse
from app.services.checkout_service import CheckoutService

router = APIRouter(prefix="/cashier", tags=["Cashier"])


@router.post("/cart")
def cashier_cart(payload: OfflineCheckoutRequest, user: User = Depends(require_roles("KASIR"))):
    return {"items": payload.items, "message": "Cart kasir stateless; checkout langsung memakai payload ini"}


@router.post("/checkout", response_model=OrderResponse)
def checkout(payload: OfflineCheckoutRequest, db: Session = Depends(get_db), user: User = Depends(require_roles("KASIR"))):
    order = CheckoutService(db).checkout_offline(user.id, payload)
    db.commit()
    return order


@router.get("/transactions")
def transactions(db: Session = Depends(get_db), user: User = Depends(require_roles("KASIR", "ADMIN"))):
    return OrderRepository(db).list_latest(50)

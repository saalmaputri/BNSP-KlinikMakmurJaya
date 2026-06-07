from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import require_roles
from app.database import get_db
from app.models.entities import User
from app.schemas.order import OrderResponse
from app.schemas.cart import CartItemCreate, CartItemUpdate, CheckoutRequest
from app.schemas.common import MessageResponse
from app.services.cart_service import CartService
from app.services.checkout_service import CheckoutService

router = APIRouter(tags=["Cart and Checkout"])


@router.get("/cart")
def get_cart(db: Session = Depends(get_db), user: User = Depends(require_roles("PASIEN"))):
    return CartService(db).get_or_create_cart(user.id)


@router.post("/cart/items")
def add_item(payload: CartItemCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("PASIEN"))):
    cart = CartService(db).add_item(user.id, payload)
    db.commit()
    return cart


@router.put("/cart/items/{item_id}")
def update_item(item_id: UUID, payload: CartItemUpdate, db: Session = Depends(get_db), user: User = Depends(require_roles("PASIEN"))):
    item = CartService(db).update_item(item_id, payload)
    db.commit()
    return item


@router.delete("/cart/items/{item_id}", response_model=MessageResponse)
def delete_item(item_id: UUID, db: Session = Depends(get_db), user: User = Depends(require_roles("PASIEN"))):
    CartService(db).delete_item(item_id)
    db.commit()
    return {"message": "Item cart dihapus"}


@router.post("/checkout", response_model=OrderResponse)
def checkout(payload: CheckoutRequest, db: Session = Depends(get_db), user: User = Depends(require_roles("PASIEN"))):
    order = CheckoutService(db).checkout_online(user.id, payload)
    db.commit()
    return order

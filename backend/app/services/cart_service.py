from decimal import Decimal
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.models.entities import Cart, CartItem
from app.repositories.cart_repository import CartRepository
from app.repositories.medicine_repository import MedicineRepository
from app.schemas.cart import CartItemCreate, CartItemUpdate


class CartService:
    def __init__(self, db: Session) -> None:
        self.cart_repo = CartRepository(db)
        self.medicine_repo = MedicineRepository(db)

    def get_or_create_cart(self, user_id: UUID) -> Cart:
        cart = self.cart_repo.get_active_cart(user_id)
        if cart:
            return cart
        return self.cart_repo.add(Cart(user_id=user_id, status="ACTIVE"))

    def add_item(self, user_id: UUID, payload: CartItemCreate) -> Cart:
        cart = self.get_or_create_cart(user_id)
        medicine = self.medicine_repo.get(payload.medicine_id)
        if not medicine:
            raise NotFoundException("Obat tidak ditemukan")
        item = self.cart_repo.get_item_by_medicine(cart.id, payload.medicine_id)
        if item:
            item.quantity += payload.quantity
        else:
            self.cart_repo.add_item(CartItem(cart_id=cart.id, medicine_id=payload.medicine_id, quantity=payload.quantity, unit_price_snapshot=medicine.selling_price))
        return self.cart_repo.get_active_cart(user_id)

    def update_item(self, item_id: UUID, payload: CartItemUpdate) -> CartItem:
        item = self.cart_repo.get_item(item_id)
        if not item:
            raise NotFoundException("Item cart tidak ditemukan")
        item.quantity = payload.quantity
        return item

    def delete_item(self, item_id: UUID) -> None:
        item = self.cart_repo.get_item(item_id)
        if not item:
            raise NotFoundException("Item cart tidak ditemukan")
        self.cart_repo.delete_item(item)

    def calculate_total(self, cart: Cart) -> Decimal:
        return sum((item.unit_price_snapshot * item.quantity for item in cart.items), Decimal("0"))

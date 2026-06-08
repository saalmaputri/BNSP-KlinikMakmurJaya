from decimal import Decimal
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import AppException, NotFoundException
from app.models.entities import Cart, CartItem
from app.repositories.cart_repository import CartRepository
from app.repositories.medicine_repository import MedicineRepository
from app.repositories.medicine_repository import StockRepository
from app.schemas.cart import CartItemCreate, CartItemUpdate


class CartService:
    def __init__(self, db: Session) -> None:
        self.cart_repo = CartRepository(db)
        self.medicine_repo = MedicineRepository(db)
        self.stock_repo = StockRepository(db)

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
        current_stock = self._current_stock(medicine.id)
        if current_stock <= 0:
            raise AppException("Stok obat habis", "OUT_OF_STOCK")
        item = self.cart_repo.get_item_by_medicine(cart.id, payload.medicine_id)
        target_quantity = payload.quantity + (item.quantity if item else 0)
        if target_quantity > current_stock:
            raise AppException("Jumlah melebihi stok tersedia", "INSUFFICIENT_STOCK")
        if item:
            item.quantity = target_quantity
        else:
            self.cart_repo.add_item(CartItem(cart_id=cart.id, medicine_id=payload.medicine_id, quantity=payload.quantity, unit_price_snapshot=medicine.selling_price))
        return self.cart_repo.get_active_cart(user_id)

    def update_item(self, item_id: UUID, payload: CartItemUpdate) -> CartItem:
        item = self.cart_repo.get_item(item_id)
        if not item:
            raise NotFoundException("Item cart tidak ditemukan")
        current_stock = self._current_stock(item.medicine_id)
        if current_stock <= 0:
            raise AppException("Stok obat habis", "OUT_OF_STOCK")
        if payload.quantity > current_stock:
            raise AppException("Jumlah melebihi stok tersedia", "INSUFFICIENT_STOCK")
        item.quantity = payload.quantity
        return item

    def delete_item(self, item_id: UUID) -> None:
        item = self.cart_repo.get_item(item_id)
        if not item:
            raise NotFoundException("Item cart tidak ditemukan")
        self.cart_repo.delete_item(item)

    def calculate_total(self, cart: Cart) -> Decimal:
        return sum((item.unit_price_snapshot * item.quantity for item in cart.items), Decimal("0"))

    def _current_stock(self, medicine_id: UUID) -> int:
        stock_map = {row["medicine_id"]: int(row["current_stock"] or 0) for row in self.stock_repo.list_stocks()}
        return int(stock_map.get(medicine_id, 0) or 0)

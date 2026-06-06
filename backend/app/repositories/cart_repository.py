from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.entities import Cart, CartItem
from app.repositories.base import BaseRepository


class CartRepository(BaseRepository[Cart]):
    model = Cart

    def get_active_cart(self, user_id: UUID) -> Cart | None:
        return self.db.scalar(
            select(Cart)
            .options(joinedload(Cart.items).joinedload(CartItem.medicine))
            .where(Cart.user_id == user_id, Cart.status == "ACTIVE", Cart.deleted_at.is_(None))
        )

    def get_item(self, item_id: UUID) -> CartItem | None:
        return self.db.get(CartItem, item_id)

    def get_item_by_medicine(self, cart_id: UUID, medicine_id: UUID) -> CartItem | None:
        return self.db.scalar(select(CartItem).where(CartItem.cart_id == cart_id, CartItem.medicine_id == medicine_id))

    def add_item(self, item: CartItem) -> CartItem:
        return self.add(item)

    def delete_item(self, item: CartItem) -> None:
        self.db.delete(item)
        self.db.flush()

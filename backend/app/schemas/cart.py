from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class CartItemCreate(BaseModel):
    medicine_id: UUID
    quantity: int = Field(gt=0)


class CartItemUpdate(BaseModel):
    quantity: int = Field(gt=0)


class CartItemResponse(ORMModel):
    id: UUID
    medicine_id: UUID
    quantity: int
    unit_price_snapshot: Decimal


class CartResponse(ORMModel):
    id: UUID
    user_id: UUID
    status: str
    items: list[CartItemResponse] = []


class CheckoutRequest(BaseModel):
    fulfillment_method: str = "PICKUP"
    payment_method: str = "BANK_TRANSFER"
    shipping_address: str | None = None
    notes: str | None = None

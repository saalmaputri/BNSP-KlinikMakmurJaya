from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import ORMModel


class OrderItemResponse(ORMModel):
    id: UUID
    medicine_id: UUID
    medicine_batch_id: UUID | None
    medicine_name_snapshot: str
    quantity: int
    unit_price: Decimal
    line_total: Decimal


class OrderResponse(ORMModel):
    id: UUID
    order_number: str
    patient_id: UUID | None
    cashier_id: UUID | None
    order_type: str
    status: str
    fulfillment_method: str
    checkout_at: datetime | None
    subtotal: Decimal
    total_amount: Decimal
    paid_amount: Decimal
    items: list[OrderItemResponse] = []


class PaymentProofRequest(BaseModel):
    proof_file_url: str


class OfflineCartItem(BaseModel):
    medicine_id: UUID
    quantity: int = Field(gt=0)


class OfflineCheckoutRequest(BaseModel):
    items: list[OfflineCartItem] = Field(min_length=1)
    payment_method: Literal["CASH", "BANK_TRANSFER", "QRIS", "DEBIT_CARD", "CREDIT_CARD", "E_WALLET"] = "CASH"
    customer_name: str = Field(default="Pelanggan Walk-in", min_length=1, max_length=150)

    @field_validator("payment_method", mode="before")
    @classmethod
    def normalize_payment_method(cls, value: str) -> str:
        return "DEBIT_CARD" if value == "CARD" else value

    @field_validator("customer_name")
    @classmethod
    def strip_customer_name(cls, value: str) -> str:
        return value.strip()

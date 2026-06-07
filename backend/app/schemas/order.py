from datetime import date, datetime
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
    batch_number_snapshot: str | None = None
    expired_date_snapshot: date | None = None
    quantity: int
    unit_price: Decimal
    line_total: Decimal


class PaymentResponse(ORMModel):
    id: UUID
    order_id: UUID
    order_number: str | None = None
    patient_name: str | None = None
    payment_number: str
    method: str
    status: str
    amount: Decimal
    paid_at: datetime | None = None
    proof_file_url: str | None = None
    proof_uploaded_at: datetime | None = None
    verified_by: UUID | None = None
    verified_at: datetime | None = None
    rejection_reason: str | None = None


class OrderResponse(ORMModel):
    id: UUID
    order_number: str
    patient_id: UUID | None
    cashier_id: UUID | None
    order_type: str
    status: str
    fulfillment_method: str
    checkout_at: datetime | None
    customer_name_snapshot: str | None = None
    customer_phone_snapshot: str | None = None
    shipping_address_snapshot: str | None = None
    notes: str | None = None
    subtotal: Decimal
    discount_amount: Decimal = 0
    shipping_cost: Decimal = 0
    total_amount: Decimal
    paid_amount: Decimal
    payment_method: str | None = None
    payment_status: str | None = None
    payment_number: str | None = None
    proof_file_url: str | None = None
    proof_uploaded_at: datetime | None = None
    verified_at: datetime | None = None
    rejection_reason: str | None = None
    items: list[OrderItemResponse] = []
    payments: list[PaymentResponse] = []


class PaymentProofRequest(BaseModel):
    proof_file_url: str


class PaymentVerificationRequest(BaseModel):
    status: Literal["VERIFIED", "REJECTED"]
    notes: str | None = None


class OrderStatusUpdateRequest(BaseModel):
    status: Literal["PROCESSING", "READY_FOR_PICKUP", "COMPLETED"]


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

from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import ORMModel


class CategoryCreate(BaseModel):
    name: str
    slug: str
    description: str | None = None


class CategoryResponse(ORMModel):
    id: UUID
    name: str
    slug: str
    description: str | None
    is_active: bool


class SupplierCreate(BaseModel):
    name: str
    contact_person: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    tax_number: str | None = None


class SupplierUpdate(BaseModel):
    name: str | None = None
    contact_person: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    tax_number: str | None = None
    is_active: bool | None = None


class SupplierResponse(ORMModel):
    id: UUID
    name: str
    contact_person: str | None
    phone: str | None
    email: str | None
    address: str | None
    tax_number: str | None
    is_active: bool


class MedicineCreate(BaseModel):
    category_id: UUID
    supplier_id: UUID
    name: str = Field(min_length=2, max_length=180)
    generic_name: str = Field(min_length=2, max_length=180)
    description: str = Field(min_length=5)
    dosage_form: str = Field(min_length=2, max_length=80)
    strength: str = Field(min_length=1, max_length=80)
    unit: str = Field(min_length=1, max_length=50)
    selling_price: Decimal = Field(gt=0)
    requires_prescription: bool = False
    minimum_stock: int = Field(default=10, ge=0)

    @field_validator("name", "generic_name", "description", "dosage_form", "strength", "unit")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Field wajib diisi")
        return value


class MedicineUpdate(BaseModel):
    category_id: UUID | None = None
    supplier_id: UUID | None = None
    name: str | None = None
    generic_name: str | None = None
    description: str | None = None
    dosage_form: str | None = None
    strength: str | None = None
    unit: str | None = None
    selling_price: Decimal | None = Field(default=None, ge=0)
    requires_prescription: bool | None = None
    minimum_stock: int | None = Field(default=None, ge=0)
    is_active: bool | None = None


class MedicineResponse(ORMModel):
    id: UUID
    category_id: UUID
    supplier_id: UUID | None
    category_name: str | None = None
    supplier_name: str | None = None
    sku: str
    name: str
    generic_name: str | None
    description: str | None
    dosage_form: str | None
    strength: str | None
    unit: str
    selling_price: Decimal
    requires_prescription: bool
    minimum_stock: int
    is_active: bool
    current_stock: int = 0
    image_url: str | None = None


class MedicineBatchResponse(ORMModel):
    id: UUID
    medicine_id: UUID
    batch_number: str
    manufacture_date: date | None
    expired_date: date
    received_date: date
    initial_quantity: int
    available_quantity: int
    unit_cost: Decimal | None
    status: str
    supplier_name: str | None = None
    days_remaining: int | None = None


class BatchCreate(BaseModel):
    medicine_id: UUID
    supplier_id: UUID | None = None
    batch_number: str
    manufacture_date: date | None = None
    expired_date: date
    received_date: date
    initial_quantity: int = Field(gt=0)
    unit_cost: Decimal | None = Field(default=None, ge=0)


class StockAdjustmentRequest(BaseModel):
    medicine_batch_id: UUID
    quantity_delta: int
    notes: str | None = None


class StockResponse(ORMModel):
    medicine_id: UUID
    sku: str
    name: str
    minimum_stock: int
    current_stock: int

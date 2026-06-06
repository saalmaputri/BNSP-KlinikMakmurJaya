import enum
from datetime import date, datetime
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import INET, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def uuid_pk() -> Mapped[str]:
    return mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class CreatedAtMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class SoftDeleteMixin:
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class RoleCode(str, enum.Enum):
    ADMIN = "ADMIN"
    APOTEKER = "APOTEKER"
    KASIR = "KASIR"
    PASIEN = "PASIEN"


class Role(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "roles"

    id = uuid_pk()
    code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    permissions: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    users = relationship("User", back_populates="role")


class User(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "users"

    id = uuid_pk()
    role_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("roles.id"), nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(180), unique=True, nullable=False, index=True)
    phone: Mapped[str | None] = mapped_column(String(30))
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    date_of_birth: Mapped[date | None] = mapped_column(Date)
    gender: Mapped[str | None] = mapped_column(String(20))
    address: Mapped[str | None] = mapped_column(Text)
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(30), default="pending_verification", nullable=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    role = relationship("Role", back_populates="users")
    sessions = relationship("UserSession", back_populates="user")
    orders = relationship("Order", foreign_keys="Order.patient_id", back_populates="patient")


class UserSession(Base, TimestampMixin):
    __tablename__ = "user_sessions"

    id = uuid_pk()
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    session_token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    refresh_token_hash: Mapped[str | None] = mapped_column(String(255), unique=True)
    ip_address: Mapped[str | None] = mapped_column(INET)
    user_agent: Mapped[str | None] = mapped_column(Text)
    last_activity_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revoke_reason: Mapped[str | None] = mapped_column(String(150))
    user = relationship("User", back_populates="sessions")


class EmailVerification(Base, TimestampMixin):
    __tablename__ = "email_verifications"

    id = uuid_pk()
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(180), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class PasswordResetToken(Base, TimestampMixin):
    __tablename__ = "password_reset_tokens"

    id = uuid_pk()
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    requested_ip: Mapped[str | None] = mapped_column(INET)


class Category(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "categories"

    id = uuid_pk()
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(140), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    medicines = relationship("Medicine", back_populates="category")


class Supplier(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "suppliers"

    id = uuid_pk()
    name: Mapped[str] = mapped_column(String(160), unique=True, nullable=False)
    contact_person: Mapped[str | None] = mapped_column(String(150))
    phone: Mapped[str | None] = mapped_column(String(30))
    email: Mapped[str | None] = mapped_column(String(180))
    address: Mapped[str | None] = mapped_column(Text)
    tax_number: Mapped[str | None] = mapped_column(String(80))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    medicines = relationship("Medicine", back_populates="supplier")


class Medicine(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "medicines"

    id = uuid_pk()
    category_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False, index=True)
    supplier_id: Mapped[str | None] = mapped_column(UUID(as_uuid=True), ForeignKey("suppliers.id"), index=True)
    sku: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(180), nullable=False, index=True)
    generic_name: Mapped[str | None] = mapped_column(String(180))
    description: Mapped[str | None] = mapped_column(Text)
    dosage_form: Mapped[str | None] = mapped_column(String(80))
    strength: Mapped[str | None] = mapped_column(String(80))
    unit: Mapped[str] = mapped_column(String(50), default="pcs", nullable=False)
    selling_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    requires_prescription: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    minimum_stock: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    category = relationship("Category", back_populates="medicines")
    supplier = relationship("Supplier", back_populates="medicines")
    images = relationship("MedicineImage", back_populates="medicine", cascade="all, delete-orphan")
    batches = relationship("MedicineBatch", back_populates="medicine")

    @property
    def image_url(self) -> str | None:
        primary = next((image for image in self.images if image.is_primary and image.deleted_at is None), None)
        fallback = next((image for image in self.images if image.deleted_at is None), None)
        return (primary or fallback).image_url if primary or fallback else None


class MedicineImage(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "medicine_images"

    id = uuid_pk()
    medicine_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("medicines.id"), nullable=False, index=True)
    image_url: Mapped[str] = mapped_column(Text, nullable=False)
    alt_text: Mapped[str | None] = mapped_column(String(180))
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    medicine = relationship("Medicine", back_populates="images")


class MedicineBatch(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "medicine_batches"
    __table_args__ = (
        UniqueConstraint("medicine_id", "batch_number", name="uq_medicine_batches"),
        Index("idx_batches_medicine_fifo", "medicine_id", "expired_date", "received_date", "id"),
    )

    id = uuid_pk()
    medicine_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("medicines.id"), nullable=False, index=True)
    supplier_id: Mapped[str | None] = mapped_column(UUID(as_uuid=True), ForeignKey("suppliers.id"), index=True)
    batch_number: Mapped[str] = mapped_column(String(100), nullable=False)
    manufacture_date: Mapped[date | None] = mapped_column(Date)
    expired_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    received_date: Mapped[date] = mapped_column(Date, nullable=False)
    initial_quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    available_quantity: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    unit_cost: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    status: Mapped[str] = mapped_column(String(30), default="AVAILABLE", nullable=False)
    medicine = relationship("Medicine", back_populates="batches")


class StockMovement(Base, CreatedAtMixin):
    __tablename__ = "stock_movements"

    id = uuid_pk()
    medicine_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("medicines.id"), nullable=False, index=True)
    medicine_batch_id: Mapped[str | None] = mapped_column(UUID(as_uuid=True), ForeignKey("medicine_batches.id"), index=True)
    movement_type: Mapped[str] = mapped_column(String(30), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    before_quantity: Mapped[int | None] = mapped_column(Integer)
    after_quantity: Mapped[int | None] = mapped_column(Integer)
    reference_type: Mapped[str | None] = mapped_column(String(50))
    reference_id: Mapped[str | None] = mapped_column(UUID(as_uuid=True))
    notes: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[str | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))


class Cart(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "carts"

    id = uuid_pk()
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False, index=True)
    items = relationship("CartItem", back_populates="cart", cascade="all, delete-orphan")


class CartItem(Base, TimestampMixin):
    __tablename__ = "cart_items"
    __table_args__ = (UniqueConstraint("cart_id", "medicine_id", name="uq_cart_items_cart_medicine"),)

    id = uuid_pk()
    cart_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("carts.id"), nullable=False, index=True)
    medicine_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("medicines.id"), nullable=False, index=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price_snapshot: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    cart = relationship("Cart", back_populates="items")
    medicine = relationship("Medicine")


class Order(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "orders"

    id = uuid_pk()
    order_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    patient_id: Mapped[str | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    cashier_id: Mapped[str | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    order_type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(40), default="PENDING_CHECKOUT", nullable=False, index=True)
    fulfillment_method: Mapped[str] = mapped_column(String(30), default="PICKUP", nullable=False)
    checkout_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0, nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0, nullable=False)
    shipping_cost: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0, nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0, nullable=False)
    paid_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0, nullable=False)
    customer_name_snapshot: Mapped[str | None] = mapped_column(String(150))
    customer_phone_snapshot: Mapped[str | None] = mapped_column(String(30))
    shipping_address_snapshot: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    patient = relationship("User", foreign_keys=[patient_id], back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="order")


class OrderItem(Base, TimestampMixin):
    __tablename__ = "order_items"

    id = uuid_pk()
    order_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False, index=True)
    medicine_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("medicines.id"), nullable=False, index=True)
    medicine_batch_id: Mapped[str | None] = mapped_column(UUID(as_uuid=True), ForeignKey("medicine_batches.id"), index=True)
    medicine_sku_snapshot: Mapped[str] = mapped_column(String(80), nullable=False)
    medicine_name_snapshot: Mapped[str] = mapped_column(String(180), nullable=False)
    batch_number_snapshot: Mapped[str | None] = mapped_column(String(100))
    expired_date_snapshot: Mapped[date | None] = mapped_column(Date)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0, nullable=False)
    line_total: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    order = relationship("Order", back_populates="items")
    medicine = relationship("Medicine")
    batch = relationship("MedicineBatch")


class Payment(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "payments"

    id = uuid_pk()
    order_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False, index=True)
    payment_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    method: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    proof_file_url: Mapped[str | None] = mapped_column(Text)
    proof_uploaded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    verified_by: Mapped[str | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    rejection_reason: Mapped[str | None] = mapped_column(Text)
    order = relationship("Order", back_populates="payments")


class Prescription(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "prescriptions"

    id = uuid_pk()
    order_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False, index=True)
    patient_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    doctor_name: Mapped[str | None] = mapped_column(String(150))
    prescription_number: Mapped[str | None] = mapped_column(String(100))
    file_url: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False, index=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    verifications = relationship("PrescriptionVerification", back_populates="prescription")
    patient = relationship("User")
    order = relationship("Order")


class PrescriptionVerification(Base, CreatedAtMixin):
    __tablename__ = "prescription_verifications"

    id = uuid_pk()
    prescription_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("prescriptions.id"), nullable=False, index=True)
    pharmacist_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    prescription = relationship("Prescription", back_populates="verifications")


class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"

    id = uuid_pk()
    user_id: Mapped[str | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    entity_name: Mapped[str | None] = mapped_column(String(80))
    entity_id: Mapped[str | None] = mapped_column(UUID(as_uuid=True))
    priority: Mapped[str] = mapped_column(String(20), default="NORMAL", nullable=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)


class AuditLog(Base, CreatedAtMixin):
    __tablename__ = "audit_logs"

    id = uuid_pk()
    user_id: Mapped[str | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    role_code: Mapped[str | None] = mapped_column(String(30))
    action: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    entity_name: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    entity_id: Mapped[str | None] = mapped_column(UUID(as_uuid=True))
    old_values: Mapped[dict | None] = mapped_column(JSONB)
    new_values: Mapped[dict | None] = mapped_column(JSONB)
    ip_address: Mapped[str | None] = mapped_column(INET)
    user_agent: Mapped[str | None] = mapped_column(Text)
    request_id: Mapped[str | None] = mapped_column(String(100), index=True)


class ErrorLog(Base, CreatedAtMixin):
    __tablename__ = "error_logs"

    id = uuid_pk()
    level: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    stack_trace: Mapped[str | None] = mapped_column(Text)
    path: Mapped[str | None] = mapped_column(Text)
    method: Mapped[str | None] = mapped_column(String(10))
    request_id: Mapped[str | None] = mapped_column(String(100), index=True)
    user_id: Mapped[str | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    context: Mapped[dict | None] = mapped_column(JSONB)
    status: Mapped[str] = mapped_column(String(20), default="UNRESOLVED", nullable=False)


class ImportJob(Base, TimestampMixin):
    __tablename__ = "import_jobs"

    id = uuid_pk()
    job_type: Mapped[str] = mapped_column(String(40), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="QUEUED", nullable=False, index=True)
    original_file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str | None] = mapped_column(Text)
    total_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    success_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failed_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_summary: Mapped[dict | None] = mapped_column(JSONB)
    created_by: Mapped[str | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ReportJob(Base, TimestampMixin):
    __tablename__ = "report_jobs"

    id = uuid_pk()
    report_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="QUEUED", nullable=False, index=True)
    filter_params: Mapped[dict | None] = mapped_column(JSONB)
    file_url: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[str | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_message: Mapped[str | None] = mapped_column(Text)


class PaymentJob(Base, TimestampMixin):
    __tablename__ = "payment_jobs"

    id = uuid_pk()
    payment_id: Mapped[str | None] = mapped_column(UUID(as_uuid=True), ForeignKey("payments.id"), index=True)
    order_id: Mapped[str | None] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id"), index=True)
    job_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="QUEUED", nullable=False, index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_attempts: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    payload: Mapped[dict | None] = mapped_column(JSONB)
    response: Mapped[dict | None] = mapped_column(JSONB)
    error_message: Mapped[str | None] = mapped_column(Text)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

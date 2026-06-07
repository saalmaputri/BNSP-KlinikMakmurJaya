from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import NotFoundException, AppException
from app.core.dependencies import require_roles
from app.database import get_db
from app.models.entities import Order, Payment, User
from app.repositories.order_repository import OrderRepository
from app.schemas.order import OrderResponse, OrderStatusUpdateRequest, PaymentResponse, PaymentVerificationRequest
from app.utils.file_upload import save_uploaded_image
from app.services.notification_service import NotificationService

router = APIRouter(tags=["Orders and Payments"])


def payment_response(payment: Payment) -> PaymentResponse:
    return PaymentResponse.model_validate(payment).model_copy(
        update={
            "order_number": payment.order.order_number if payment.order else None,
            "patient_name": payment.order.patient.full_name if payment.order and payment.order.patient else payment.order.customer_name_snapshot if payment.order else None,
        }
    )


def order_response(order: Order) -> OrderResponse:
    payments = [payment_response(payment) for payment in order.payments] if getattr(order, "payments", None) else []
    latest_payment = payments[0] if payments else None
    return OrderResponse.model_validate(order).model_copy(
        update={
            "payments": payments,
            "payment_method": latest_payment.method if latest_payment else None,
            "payment_status": latest_payment.status if latest_payment else None,
            "payment_number": latest_payment.payment_number if latest_payment else None,
            "proof_file_url": latest_payment.proof_file_url if latest_payment else None,
            "proof_uploaded_at": latest_payment.proof_uploaded_at if latest_payment else None,
            "verified_at": latest_payment.verified_at if latest_payment else None,
            "rejection_reason": latest_payment.rejection_reason if latest_payment else None,
        }
    )


@router.get("/orders/my")
def my_orders(db: Session = Depends(get_db), user: User = Depends(require_roles("PASIEN"))):
    return [order_response(order) for order in OrderRepository(db).list_by_patient(user.id)]


@router.get("/orders/{order_id}")
def order_detail(order_id: UUID, db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN", "APOTEKER", "KASIR", "PASIEN"))):
    order = OrderRepository(db).get_with_items(order_id)
    if not order or (user.role.code == "PASIEN" and order.patient_id != user.id):
        raise NotFoundException("Order tidak ditemukan")
    return order_response(order)


@router.patch("/orders/{order_id}/status")
def update_order_status(
    order_id: UUID,
    payload: OrderStatusUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("ADMIN", "APOTEKER", "KASIR")),
):
    order_repo = OrderRepository(db)
    order = order_repo.get(order_id)
    if not order:
        raise NotFoundException("Order tidak ditemukan")

    current = order.status
    target = payload.status
    allowed_next = {
        "PROCESSING": {"PENDING_PAYMENT", "PAID"},
        "READY_FOR_PICKUP": {"PROCESSING"},
        "COMPLETED": {"READY_FOR_PICKUP", "PROCESSING"},
    }
    if current not in allowed_next.get(target, set()):
        raise AppException(f"Status {current} tidak bisa diubah ke {target}", "INVALID_ORDER_STATUS")

    order.status = target
    db.commit()
    db.refresh(order)
    return order


@router.post("/payments/{order_id}/upload-proof")
async def upload_payment_proof(
    order_id: UUID,
    proof: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("PASIEN")),
):
    order = OrderRepository(db).get_with_items(order_id)
    if not order or order.patient_id != user.id:
        raise NotFoundException("Order tidak ditemukan")
    if not order.payments:
        raise NotFoundException("Data pembayaran tidak ditemukan")
    payment = order.payments[0]
    if payment.proof_file_url or payment.proof_uploaded_at or payment.status in {"WAITING_VERIFICATION", "VERIFIED", "REJECTED"}:
        raise AppException("Bukti pembayaran sudah pernah diupload", "PAYMENT_PROOF_ALREADY_UPLOADED")
    if payment.status == "VERIFIED":
        raise AppException("Pembayaran sudah diverifikasi", "PAYMENT_ALREADY_VERIFIED")
    payment.proof_file_url = await save_uploaded_image(proof, "payment-proofs")
    payment.proof_uploaded_at = datetime.now(timezone.utc)
    payment.status = "WAITING_VERIFICATION"
    payment.rejection_reason = None
    payment.verified_by = None
    payment.verified_at = None
    NotificationService(db).create(
        user.id,
        "PAYMENT_PROOF_UPLOADED",
        "Bukti pembayaran terkirim",
        f"Bukti pembayaran untuk {order.order_number} menunggu verifikasi.",
        "ORDER",
        order.id,
    )
    NotificationService(db).create_for_roles(
        ["ADMIN"],
        "PAYMENT_REVIEW",
        "Bukti pembayaran baru",
        f"Bukti pembayaran untuk {order.order_number} menunggu verifikasi.",
        "PAYMENT",
        order.id,
        "HIGH",
    )
    db.commit()
    db.refresh(payment)
    return payment_response(payment)


@router.get("/payments/review")
def list_payment_reviews(db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN"))):
    rows = db.scalars(
        select(Payment)
        .options(joinedload(Payment.order).joinedload(Order.patient))
        .where(Payment.status == "WAITING_VERIFICATION")
        .order_by(Payment.proof_uploaded_at.desc().nullslast(), Payment.created_at.desc())
    ).all()
    return [payment_response(row) for row in rows]


@router.post("/payments/{payment_id}/verify")
def verify_payment(
    payment_id: UUID,
    payload: PaymentVerificationRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("ADMIN")),
):
    payment = db.scalar(
        select(Payment)
        .options(joinedload(Payment.order).joinedload(Order.patient))
        .where(Payment.id == payment_id)
    )
    if not payment or not payment.order:
        raise NotFoundException("Data pembayaran tidak ditemukan")

    order = payment.order
    notes = (payload.notes or "").strip() or None

    payment.verified_by = user.id
    payment.verified_at = datetime.now(timezone.utc)

    if payload.status == "VERIFIED":
        payment.status = "VERIFIED"
        payment.paid_at = payment.paid_at or payment.verified_at
        payment.rejection_reason = None
        order.status = "PAID"
        order.paid_amount = payment.amount
        NotificationService(db).create(
            order.patient_id,
            "PAYMENT_VERIFIED",
            "Pembayaran diverifikasi",
            f"Pembayaran untuk {order.order_number} sudah diverifikasi admin.",
            "PAYMENT",
            payment.id,
        )
    else:
        payment.status = "REJECTED"
        payment.rejection_reason = notes or "Bukti pembayaran tidak valid"
        order.status = "PENDING_PAYMENT"
        NotificationService(db).create(
            order.patient_id,
            "PAYMENT_REJECTED",
            "Pembayaran ditolak",
            f"Bukti pembayaran untuk {order.order_number} ditolak. {payment.rejection_reason}",
            "PAYMENT",
            payment.id,
            "HIGH",
        )

    db.commit()
    db.refresh(payment)
    return payment_response(payment)

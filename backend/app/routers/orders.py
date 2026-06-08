from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import NotFoundException, AppException
from app.core.dependencies import require_roles
from app.database import get_db
from app.models.entities import Order, OrderItem, Payment, User
from app.repositories.order_repository import OrderRepository
from app.schemas.order import OrderStatusUpdateRequest, PaymentVerificationRequest
from app.utils.file_upload import save_uploaded_image
from app.utils.order_serialization import serialize_order, serialize_payment
from app.services.prescription_service import PrescriptionService
from app.services.stock_service import FIFOStockService
from app.services.notification_service import NotificationService

router = APIRouter(tags=["Orders and Payments"])
PAYMENT_TIMEOUT_MINUTES = 10


def payment_response(payment: Payment) -> dict:
    return serialize_payment(payment)


def order_response(order: Order) -> dict:
    return serialize_order(order)


def expire_stale_pending_payments(db: Session) -> None:
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=PAYMENT_TIMEOUT_MINUTES)
        rows = db.execute(
            select(Payment)
            .join(Payment.order)
            .options(joinedload(Payment.order).joinedload(Order.patient), joinedload(Payment.order).joinedload(Order.items).joinedload(OrderItem.batch))
            .where(
                Payment.status == "PENDING",
                Payment.proof_uploaded_at.is_(None),
                Order.order_type == "ONLINE",
                Order.status == "PENDING_PAYMENT",
                Order.checkout_at.is_not(None),
                Order.checkout_at < cutoff,
            )
        ).unique().scalars().all()
        if not rows:
            return

        fifo = FIFOStockService(db)
        notifications = NotificationService(db)
        now = datetime.now(timezone.utc)

        for payment in rows:
            order = payment.order
            if not order:
                continue
            if order.status != "PENDING_PAYMENT" or payment.status != "PENDING":
                continue
            if order.items:
                fifo.restore_order_stock(order, notes="Pembayaran melewati batas 10 menit")
            payment.status = "EXPIRED"
            payment.rejection_reason = "Batas pembayaran 10 menit terlewati"
            payment.verified_by = None
            payment.verified_at = now
            order.status = "CANCELLED"
            order.paid_amount = 0
            notifications.create(
                order.patient_id,
                "PAYMENT_EXPIRED",
                "Pembayaran kedaluwarsa",
                f"Pembayaran untuk {order.order_number} melewati batas 10 menit dan transaksi dibatalkan.",
                "PAYMENT",
                payment.id,
                "HIGH",
            )
    except Exception:
        db.rollback()


@router.get("/orders/my")
def my_orders(db: Session = Depends(get_db), user: User = Depends(require_roles("PASIEN"))):
    expire_stale_pending_payments(db)
    db.commit()
    return [order_response(order) for order in OrderRepository(db).list_by_patient(user.id)]


@router.get("/orders/{order_id}")
def order_detail(order_id: UUID, db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN", "APOTEKER", "KASIR", "PASIEN"))):
    expire_stale_pending_payments(db)
    db.commit()
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
    expire_stale_pending_payments(db)
    db.commit()
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
    try:
        expire_stale_pending_payments(db)
        db.commit()
        order = OrderRepository(db).get_with_items(order_id)
        if not order or order.patient_id != user.id:
            raise NotFoundException("Order tidak ditemukan")
        if order.status != "PENDING_PAYMENT":
            raise AppException("Pembayaran belum dibuka untuk pesanan ini", "PAYMENT_NOT_AVAILABLE")

        payment = order.payments[0] if getattr(order, "payments", None) else None
        payment_method = getattr(payment, "method", None) or "BANK_TRANSFER"
        if not payment:
            payment = OrderRepository(db).add_payment(
                Payment(
                    order_id=order.id,
                    payment_number=f"PAY-{order.order_number}-{str(order.id)[:8]}-PROOF",
                    method=payment_method,
                    status="PENDING",
                    amount=order.total_amount,
                )
            )
            order.payments = [payment]
            order.payment_status = payment.status
            order.payment_number = payment.payment_number

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
        order.payment_status = payment.status
        order.proof_file_url = payment.proof_file_url
        order.proof_uploaded_at = payment.proof_uploaded_at

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
    except AppException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise AppException(f"Gagal mengirim bukti pembayaran: {exc}", "PAYMENT_PROOF_FAILED") from exc


@router.get("/payments/review")
def list_payment_reviews(db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN"))):
    expire_stale_pending_payments(db)
    db.commit()
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
    expire_stale_pending_payments(db)
    db.commit()
    payment = db.scalar(
        select(Payment)
        .options(joinedload(Payment.order).joinedload(Order.patient), joinedload(Payment.order).joinedload(Order.items).joinedload(OrderItem.medicine))
        .where(Payment.id == payment_id)
    )
    if not payment or not payment.order:
        raise NotFoundException("Data pembayaran tidak ditemukan")

    order = payment.order
    notes = (payload.notes or "").strip() or None

    payment.verified_by = user.id
    payment.verified_at = datetime.now(timezone.utc)

    if payload.status == "VERIFIED":
        try:
            if order.order_type == "ONLINE":
                fifo = FIFOStockService(db)
                if not order.items:
                    raise AppException("Rincian order belum tersedia", "ORDER_ITEMS_MISSING")
                for item in order.items:
                    if not item.medicine_id:
                        raise AppException("Data obat pada order tidak lengkap", "ORDER_ITEM_MISSING_MEDICINE")
                    fifo.reserve_stock(item.medicine_id, int(item.quantity or 0), order.id, user.id)
                prescription = PrescriptionService(db).consume_by_order(order.id)
                if prescription and prescription.status != "USED":
                    raise AppException("Resep gagal diproses", "PRESCRIPTION_CONSUME_FAILED")

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
        except AppException as exc:
            payment.status = "REJECTED"
            payment.rejection_reason = str(exc)
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

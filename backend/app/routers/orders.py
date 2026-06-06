from uuid import UUID

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.core.dependencies import require_roles
from app.database import get_db
from app.models.entities import User
from app.repositories.order_repository import OrderRepository
from app.core.exceptions import NotFoundException
from app.utils.file_upload import save_uploaded_image
from app.services.notification_service import NotificationService

router = APIRouter(tags=["Orders and Payments"])


@router.get("/orders/my")
def my_orders(db: Session = Depends(get_db), user: User = Depends(require_roles("PASIEN"))):
    return OrderRepository(db).list_by_patient(user.id)


@router.get("/orders/{order_id}")
def order_detail(order_id: UUID, db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN", "APOTEKER", "KASIR", "PASIEN"))):
    order = OrderRepository(db).get_with_items(order_id)
    if not order or (user.role.code == "PASIEN" and order.patient_id != user.id):
        raise NotFoundException("Order tidak ditemukan")
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
    payment.proof_file_url = await save_uploaded_image(proof, "payment-proofs")
    payment.status = "WAITING_VERIFICATION"
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
    return payment

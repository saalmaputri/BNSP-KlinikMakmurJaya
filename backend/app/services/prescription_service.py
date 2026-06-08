from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import AppException, ForbiddenException, NotFoundException
from app.models.entities import Order, OrderItem, Payment, Prescription, PrescriptionVerification
from app.repositories.order_repository import OrderRepository
from app.repositories.medicine_repository import MedicineRepository
from app.repositories.prescription_repository import PrescriptionRepository
from app.schemas.prescription import PrescriptionUploadRequest
from app.services.notification_service import NotificationService


class PrescriptionService:
    def __init__(self, db: Session) -> None:
        self.repo = PrescriptionRepository(db)
        self.order_repo = OrderRepository(db)
        self.medicine_repo = MedicineRepository(db)
        self.notifications = NotificationService(db)

    def request(self, patient_id: UUID) -> Order:
        count = self.order_repo.db.query(Order).count() + 1
        order = Order(
            order_number=f"RX-{count:06d}",
            patient_id=patient_id,
            cashier_id=None,
            order_type="ONLINE",
            status="WAITING_PRESCRIPTION",
            fulfillment_method="PICKUP",
            checkout_at=datetime.now(timezone.utc),
            subtotal=0,
            discount_amount=0,
            shipping_cost=0,
            total_amount=0,
            paid_amount=0,
            notes="Permintaan resep",
        )
        order = self.order_repo.add(order)
        self.notifications.create(
            patient_id,
            "PRESCRIPTION_REQUEST_CREATED",
            "Permintaan resep dibuat",
            f"Permintaan resep {order.order_number} siap diupload.",
            "ORDER",
            order.id,
        )
        self.notifications.create_for_roles(
            ["ADMIN", "APOTEKER"],
            "PRESCRIPTION_REVIEW",
            "Permintaan resep baru",
            f"Permintaan resep {order.order_number} menunggu upload resep.",
            "PRESCRIPTION",
            order.id,
            "HIGH",
        )
        return order

    def upload(self, patient_id: UUID, payload: PrescriptionUploadRequest) -> Prescription:
        order = self.order_repo.get(payload.order_id)
        if not order:
            raise NotFoundException("Order tidak ditemukan")
        if order.patient_id != patient_id:
            raise ForbiddenException("Order bukan milik pasien")
        if order.status not in ("WAITING_PRESCRIPTION", "PRESCRIPTION_REVIEW"):
            raise AppException("Order ini tidak menunggu upload resep", "ORDER_NOT_WAITING_PRESCRIPTION")
        if self.repo.get_active_by_order(payload.order_id):
            raise AppException("Resep untuk order ini sudah diupload", "PRESCRIPTION_EXISTS")
        if payload.medicine_id and not self.order_repo.get_with_items(order.id).items:
            medicine = self.medicine_repo.get(payload.medicine_id)
            if not medicine:
                raise NotFoundException("Obat tidak ditemukan")
            line_total = Decimal(medicine.selling_price or 0) * Decimal(payload.quantity or 1)
            self.order_repo.add_item(
                OrderItem(
                    order_id=order.id,
                    medicine_id=medicine.id,
                    medicine_batch_id=None,
                    medicine_sku_snapshot=medicine.sku,
                    medicine_name_snapshot=medicine.name,
                    batch_number_snapshot=None,
                    expired_date_snapshot=None,
                    quantity=payload.quantity or 1,
                    unit_price=medicine.selling_price,
                    line_total=line_total,
                )
            )
            order.subtotal = line_total
            order.shipping_cost = Decimal("0")
            order.total_amount = line_total
        prescription_data = payload.model_dump(exclude={"medicine_id", "quantity"})
        prescription = Prescription(patient_id=patient_id, **prescription_data)
        order.status = "PRESCRIPTION_REVIEW"
        prescription = self.repo.add(prescription)
        self.notifications.create(
            patient_id,
            "PRESCRIPTION_UPLOADED",
            "Resep berhasil dikirim",
            f"Resep untuk pesanan {order.order_number} sedang menunggu verifikasi.",
            "ORDER",
            order.id,
        )
        self.notifications.create_for_roles(
            ["ADMIN", "APOTEKER"],
            "PRESCRIPTION_REVIEW",
            "Resep baru menunggu verifikasi",
            f"Resep untuk pesanan {order.order_number} telah diunggah.",
            "PRESCRIPTION",
            prescription.id,
            "HIGH",
        )
        return prescription

    def pending(self):
        return self.repo.list_pending()

    def history(self):
        return self.repo.list_history()

    def mine(self, patient_id: UUID):
        return self.repo.list_by_patient(patient_id)

    def has_approved(self, patient_id: UUID) -> bool:
        return self.repo.has_approved_by_patient(patient_id)

    def consume_approved(self, patient_id: UUID) -> Prescription | None:
        prescription = self.repo.get_latest_approved_by_patient(patient_id)
        if not prescription:
            return None
        prescription.status = "USED"
        self.notifications.create(
            patient_id,
            "PRESCRIPTION_USED",
            "Resep telah digunakan",
            "Resep yang sudah disetujui sudah dipakai untuk satu transaksi.",
            "PRESCRIPTION",
            prescription.id,
        )
        return prescription

    def consume_by_order(self, order_id: UUID) -> Prescription | None:
        prescription = self.repo.get_latest_by_order(order_id)
        if not prescription or prescription.status != "APPROVED":
            return None
        prescription.status = "USED"
        self.notifications.create(
            prescription.patient_id,
            "PRESCRIPTION_USED",
            "Resep telah digunakan",
            f"Resep untuk pesanan {prescription.order.order_number if prescription.order else order_id} sudah dipakai untuk satu transaksi.",
            "PRESCRIPTION",
            prescription.id,
        )
        return prescription

    def by_order(self, order_id: UUID) -> Prescription | None:
        return self.repo.get_latest_by_order(order_id)

    def approve(self, prescription_id: UUID, pharmacist_id: UUID, notes: str | None) -> Prescription:
        try:
            prescription = self.repo.get(prescription_id)
            if not prescription:
                raise NotFoundException("Resep tidak ditemukan")
            prescription.status = "APPROVED"
            self.repo.add_verification(PrescriptionVerification(prescription_id=prescription.id, pharmacist_id=pharmacist_id, status="APPROVED", notes=notes))
            order = self.order_repo.get_with_items(prescription.order_id)
            if order and order.status in ("WAITING_PRESCRIPTION", "PRESCRIPTION_REVIEW"):
                order.status = "PENDING_PAYMENT"
                order.total_amount = Decimal(order.total_amount or sum((item.line_total or 0) for item in (order.items or [])))

                payment = order.payments[0] if getattr(order, "payments", None) else None
                if not payment:
                    try:
                        payment = self.order_repo.add_payment(
                            Payment(
                                order_id=order.id,
                                payment_number=f"PAY-{order.order_number}-{str(prescription.id)[:8]}",
                                method="BANK_TRANSFER",
                                status="PENDING",
                                amount=Decimal(order.total_amount or 0),
                            )
                        )
                        order.payments = [payment]
                    except Exception:
                        payment = None
                if payment:
                    order.payment_status = payment.status
                    order.payment_number = payment.payment_number
                    order.proof_file_url = payment.proof_file_url
                    order.proof_uploaded_at = payment.proof_uploaded_at
                    order.verified_at = payment.verified_at
                    order.rejection_reason = payment.rejection_reason
                try:
                    self.notifications.create(
                        order.patient_id,
                        "PRESCRIPTION_APPROVED",
                        "Resep disetujui",
                        f"Resep untuk pesanan {order.order_number} disetujui. Silakan lanjutkan ke pembayaran.",
                        "ORDER",
                        order.id,
                    )
                except Exception:
                    pass
            return prescription
        except AppException:
            self.repo.db.rollback()
            raise
        except Exception as exc:
            self.repo.db.rollback()
            raise AppException(f"Gagal memverifikasi resep: {exc}", "PRESCRIPTION_APPROVE_FAILED") from exc

    def reject(self, prescription_id: UUID, pharmacist_id: UUID, notes: str | None) -> Prescription:
        try:
            prescription = self.repo.get(prescription_id)
            if not prescription:
                raise NotFoundException("Resep tidak ditemukan")
            prescription.status = "REJECTED"
            self.repo.add_verification(PrescriptionVerification(prescription_id=prescription.id, pharmacist_id=pharmacist_id, status="REJECTED", notes=notes))
            order = self.order_repo.get_with_items(prescription.order_id)
            if order:
                order.status = "WAITING_PRESCRIPTION"
                try:
                    self.notifications.create(
                        order.patient_id,
                        "PRESCRIPTION_REJECTED",
                        "Resep ditolak",
                        f"Resep untuk pesanan {order.order_number} ditolak. Periksa detail pesanan.",
                        "ORDER",
                        order.id,
                        "HIGH",
                    )
                except Exception:
                    pass
            return prescription
        except AppException:
            self.repo.db.rollback()
            raise
        except Exception as exc:
            self.repo.db.rollback()
            raise AppException(f"Gagal menolak resep: {exc}", "PRESCRIPTION_REJECT_FAILED") from exc

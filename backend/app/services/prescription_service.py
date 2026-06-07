from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import AppException, ForbiddenException, NotFoundException
from app.models.entities import Order, Prescription, PrescriptionVerification
from app.repositories.order_repository import OrderRepository
from app.repositories.prescription_repository import PrescriptionRepository
from app.schemas.prescription import PrescriptionUploadRequest
from app.services.notification_service import NotificationService


class PrescriptionService:
    def __init__(self, db: Session) -> None:
        self.repo = PrescriptionRepository(db)
        self.order_repo = OrderRepository(db)
        self.notifications = NotificationService(db)

    def request(self, patient_id: UUID) -> Order:
        if self.repo.has_active_by_patient(patient_id):
            raise AppException("Masih ada resep aktif yang belum selesai diproses", "PRESCRIPTION_ALREADY_ACTIVE")
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
        prescription = Prescription(patient_id=patient_id, **payload.model_dump())
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

    def by_order(self, order_id: UUID) -> Prescription | None:
        return self.repo.get_latest_by_order(order_id)

    def approve(self, prescription_id: UUID, pharmacist_id: UUID, notes: str | None) -> Prescription:
        prescription = self.repo.get(prescription_id)
        if not prescription:
            raise NotFoundException("Resep tidak ditemukan")
        prescription.status = "APPROVED"
        self.repo.add_verification(PrescriptionVerification(prescription_id=prescription.id, pharmacist_id=pharmacist_id, status="APPROVED", notes=notes))
        order = self.order_repo.get(prescription.order_id)
        if order and order.items and order.status in ("WAITING_PRESCRIPTION", "PRESCRIPTION_REVIEW"):
            order.status = "PENDING_PAYMENT"
            self.notifications.create(
                order.patient_id,
                "PRESCRIPTION_APPROVED",
                "Resep disetujui",
                f"Resep untuk pesanan {order.order_number} disetujui. Silakan lanjutkan pembayaran.",
                "ORDER",
                order.id,
            )
        elif order:
            self.notifications.create(
                order.patient_id,
                "PRESCRIPTION_APPROVED",
                "Resep disetujui",
                f"Resep untuk permintaan {order.order_number} disetujui. Kamu bisa lanjut memasukkan obat ke keranjang dan checkout.",
                "ORDER",
                order.id,
            )
        return prescription

    def reject(self, prescription_id: UUID, pharmacist_id: UUID, notes: str | None) -> Prescription:
        prescription = self.repo.get(prescription_id)
        if not prescription:
            raise NotFoundException("Resep tidak ditemukan")
        prescription.status = "REJECTED"
        self.repo.add_verification(PrescriptionVerification(prescription_id=prescription.id, pharmacist_id=pharmacist_id, status="REJECTED", notes=notes))
        order = self.order_repo.get(prescription.order_id)
        if order:
            order.status = "WAITING_PRESCRIPTION"
            self.notifications.create(
                order.patient_id,
                "PRESCRIPTION_REJECTED",
                "Resep ditolak",
                f"Resep untuk pesanan {order.order_number} ditolak. Periksa detail pesanan.",
                "ORDER",
                order.id,
                "HIGH",
            )
        return prescription

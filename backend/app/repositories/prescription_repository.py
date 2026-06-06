from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.entities import Prescription, PrescriptionVerification
from app.repositories.base import BaseRepository


class PrescriptionRepository(BaseRepository[Prescription]):
    model = Prescription

    def list_pending(self) -> list[Prescription]:
        return list(
            self.db.scalars(
                select(Prescription)
                .options(joinedload(Prescription.patient), joinedload(Prescription.order))
                .where(
                    Prescription.deleted_at.is_(None),
                    Prescription.status.in_(["PENDING", "IN_REVIEW"]),
                )
                .order_by(Prescription.uploaded_at.asc())
            )
        )

    def get_active_by_order(self, order_id: UUID) -> Prescription | None:
        return self.db.scalar(
            select(Prescription).where(
                Prescription.order_id == order_id,
                Prescription.deleted_at.is_(None),
                Prescription.status.in_(["PENDING", "IN_REVIEW", "APPROVED"]),
            )
        )

    def add_verification(self, verification: PrescriptionVerification) -> PrescriptionVerification:
        return self.add(verification)

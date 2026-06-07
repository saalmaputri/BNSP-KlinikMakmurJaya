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

    def list_history(self) -> list[Prescription]:
        return list(
            self.db.scalars(
                select(Prescription)
                .options(joinedload(Prescription.patient), joinedload(Prescription.order))
                .where(Prescription.deleted_at.is_(None))
                .order_by(Prescription.uploaded_at.desc(), Prescription.created_at.desc())
            )
        )

    def list_by_patient(self, patient_id: UUID) -> list[Prescription]:
        return list(
            self.db.scalars(
                select(Prescription)
                .options(joinedload(Prescription.patient), joinedload(Prescription.order))
                .where(Prescription.deleted_at.is_(None), Prescription.patient_id == patient_id)
                .order_by(Prescription.uploaded_at.desc(), Prescription.created_at.desc())
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

    def get_latest_by_order(self, order_id: UUID) -> Prescription | None:
        return self.db.scalar(
            select(Prescription)
            .options(joinedload(Prescription.patient), joinedload(Prescription.order))
            .where(
                Prescription.order_id == order_id,
                Prescription.deleted_at.is_(None),
            )
            .order_by(Prescription.uploaded_at.desc(), Prescription.created_at.desc())
        )

    def has_approved_by_patient(self, patient_id: UUID) -> bool:
        return bool(
            self.db.scalar(
                select(Prescription.id).where(
                    Prescription.patient_id == patient_id,
                    Prescription.deleted_at.is_(None),
                    Prescription.status == "APPROVED",
                ).limit(1)
            )
        )

    def has_active_by_patient(self, patient_id: UUID) -> bool:
        return bool(
            self.db.scalar(
                select(Prescription.id).where(
                    Prescription.patient_id == patient_id,
                    Prescription.deleted_at.is_(None),
                    Prescription.status.in_(["PENDING", "IN_REVIEW", "APPROVED"]),
                ).limit(1)
            )
        )

    def get_latest_approved_by_patient(self, patient_id: UUID) -> Prescription | None:
        return self.db.scalar(
            select(Prescription)
            .options(joinedload(Prescription.patient), joinedload(Prescription.order))
            .where(
                Prescription.patient_id == patient_id,
                Prescription.deleted_at.is_(None),
                Prescription.status == "APPROVED",
            )
            .order_by(Prescription.uploaded_at.desc(), Prescription.created_at.desc())
        )

    def add_verification(self, verification: PrescriptionVerification) -> PrescriptionVerification:
        return self.add(verification)

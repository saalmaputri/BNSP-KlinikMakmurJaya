from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.core.dependencies import require_roles
from app.database import get_db
from app.models.entities import User
from app.schemas.prescription import PrescriptionResponse, PrescriptionUploadRequest, PrescriptionVerifyRequest
from app.services.prescription_service import PrescriptionService
from app.utils.file_upload import save_uploaded_image

router = APIRouter(prefix="/prescriptions", tags=["Prescriptions"])


def prescription_response(prescription) -> PrescriptionResponse:
    return PrescriptionResponse.model_validate(prescription).model_copy(
        update={"patient_name": prescription.patient.full_name if prescription.patient else None}
    )


@router.post("/upload", response_model=PrescriptionResponse)
async def upload(
    order_id: UUID = Form(...),
    prescription_image: UploadFile = File(...),
    doctor_name: str = Form(...),
    prescription_number: str = Form(...),
    notes: str | None = Form(None),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("PASIEN")),
):
    file_url = await save_uploaded_image(prescription_image, "prescriptions")
    payload = PrescriptionUploadRequest(
        order_id=order_id,
        doctor_name=doctor_name,
        prescription_number=prescription_number,
        file_url=file_url,
        notes=notes,
    )
    prescription = PrescriptionService(db).upload(user.id, payload)
    db.commit()
    db.refresh(prescription)
    return prescription_response(prescription)


@router.get("/pending", response_model=list[PrescriptionResponse])
def pending(db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN", "APOTEKER"))):
    return [prescription_response(item) for item in PrescriptionService(db).pending()]


@router.post("/{prescription_id}/approve")
def approve(prescription_id: UUID, payload: PrescriptionVerifyRequest, db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN", "APOTEKER"))):
    prescription = PrescriptionService(db).approve(prescription_id, user.id, payload.notes)
    db.commit()
    return prescription


@router.post("/{prescription_id}/reject")
def reject(prescription_id: UUID, payload: PrescriptionVerifyRequest, db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN", "APOTEKER"))):
    prescription = PrescriptionService(db).reject(prescription_id, user.id, payload.notes)
    db.commit()
    return prescription

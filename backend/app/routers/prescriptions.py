from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.core.dependencies import require_roles
from app.core.exceptions import NotFoundException
from app.database import get_db
from app.models.entities import User
from app.repositories.order_repository import OrderRepository
from app.schemas.prescription import PrescriptionResponse, PrescriptionUploadRequest, PrescriptionVerifyRequest
from app.services.prescription_service import PrescriptionService
from app.utils.file_upload import save_uploaded_image
from app.utils.order_serialization import serialize_order, serialize_prescription

router = APIRouter(prefix="/prescriptions", tags=["Prescriptions"])


def prescription_response(prescription) -> dict:
    return serialize_prescription(prescription)


@router.post("/upload")
async def upload(
    order_id: str | None = Form(None),
    medicine_id: str | None = Form(None),
    quantity: int = Form(1),
    prescription_image: UploadFile = File(...),
    doctor_name: str = Form(...),
    prescription_number: str = Form(...),
    notes: str | None = Form(None),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("PASIEN")),
):
    file_url = await save_uploaded_image(prescription_image, "prescriptions")
    request_service = PrescriptionService(db)
    parsed_order_id: UUID | None = None
    if order_id:
        try:
            parsed_order_id = UUID(str(order_id))
        except (TypeError, ValueError):
            parsed_order_id = None
    if not parsed_order_id:
        draft_order = request_service.request(user.id)
        parsed_order_id = draft_order.id
    parsed_medicine_id: UUID | None = None
    if medicine_id:
        try:
            parsed_medicine_id = UUID(str(medicine_id))
        except (TypeError, ValueError):
            parsed_medicine_id = None
    payload = PrescriptionUploadRequest(
        order_id=parsed_order_id,
        medicine_id=parsed_medicine_id,
        quantity=quantity,
        doctor_name=doctor_name,
        prescription_number=prescription_number,
        file_url=file_url,
        notes=notes,
    )
    prescription = request_service.upload(user.id, payload)
    db.commit()
    db.refresh(prescription)
    return prescription_response(prescription)


@router.post("/request")
def request(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("PASIEN")),
):
    order = PrescriptionService(db).request(user.id)
    db.commit()
    db.refresh(order)
    return {**serialize_order(order), "items": []}


@router.get("/my")
def my_prescriptions(db: Session = Depends(get_db), user: User = Depends(require_roles("PASIEN"))):
    return [prescription_response(item) for item in PrescriptionService(db).mine(user.id)]


@router.get("/pending")
def pending(db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN", "APOTEKER"))):
    return [prescription_response(item) for item in PrescriptionService(db).pending()]


@router.get("/history")
def history(db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN", "APOTEKER"))):
    return [prescription_response(item) for item in PrescriptionService(db).history()]


@router.get("/by-order/{order_id}")
def by_order(order_id: UUID, db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN", "APOTEKER", "PASIEN"))):
    order = OrderRepository(db).get(order_id)
    if not order:
        raise NotFoundException("Order tidak ditemukan")
    if user.role.code == "PASIEN" and order.patient_id != user.id:
        raise NotFoundException("Order tidak ditemukan")
    prescription = PrescriptionService(db).by_order(order_id)
    if not prescription:
        raise NotFoundException("Resep tidak ditemukan")
    return prescription_response(prescription)


@router.post("/{prescription_id}/approve")
def approve(prescription_id: UUID, payload: PrescriptionVerifyRequest, db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN", "APOTEKER"))):
    prescription = PrescriptionService(db).approve(prescription_id, user.id, payload.notes)
    db.commit()
    db.refresh(prescription)
    return prescription_response(prescription)


@router.post("/{prescription_id}/reject")
def reject(prescription_id: UUID, payload: PrescriptionVerifyRequest, db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN", "APOTEKER"))):
    prescription = PrescriptionService(db).reject(prescription_id, user.id, payload.notes)
    db.commit()
    db.refresh(prescription)
    return prescription_response(prescription)

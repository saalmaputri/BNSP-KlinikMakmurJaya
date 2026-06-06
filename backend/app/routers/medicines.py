from uuid import UUID

from decimal import Decimal

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy.orm import Session

from app.core.dependencies import require_roles
from app.database import get_db
from app.models.entities import User
from app.schemas.common import MessageResponse
from app.schemas.medicine import MedicineBatchResponse, MedicineCreate, MedicineResponse, MedicineUpdate
from app.services.medicine_service import MedicineService
from app.utils.file_upload import save_uploaded_image

router = APIRouter(prefix="/medicines", tags=["Medicines"])


@router.get("")
def list_medicines(keyword: str | None = None, category_id: UUID | None = None, sort: str = "name", page: int = 1, page_size: int = 20, db: Session = Depends(get_db)):
    items, total = MedicineService(db).list(keyword, category_id, sort, page, page_size)
    return {"total": total, "page": page, "page_size": page_size, "items": [MedicineResponse.model_validate(item) for item in items]}


@router.get("/search")
def search(keyword: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    items, total = MedicineService(db).list(keyword, None, "name", 1, 20)
    return {"total": total, "items": [MedicineResponse.model_validate(item) for item in items]}


@router.get("/autocomplete")
def autocomplete(keyword: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    return MedicineService(db).autocomplete(keyword)


@router.get("/{medicine_id}", response_model=MedicineResponse)
def detail(medicine_id: UUID, db: Session = Depends(get_db)):
    return MedicineService(db).get_detail(medicine_id)


@router.get("/{medicine_id}/batches", response_model=list[MedicineBatchResponse])
def batches(medicine_id: UUID, db: Session = Depends(get_db)):
    return [MedicineBatchResponse.model_validate(item) for item in MedicineService(db).batches(medicine_id)]


@router.post("", response_model=MedicineResponse)
async def create(
    category_id: UUID = Form(...),
    supplier_id: UUID = Form(...),
    name: str = Form(...),
    generic_name: str = Form(...),
    description: str = Form(...),
    dosage_form: str = Form(...),
    strength: str = Form(...),
    unit: str = Form(...),
    selling_price: Decimal = Form(...),
    requires_prescription: bool = Form(...),
    minimum_stock: int = Form(...),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("ADMIN")),
):
    payload = MedicineCreate(
        category_id=category_id,
        supplier_id=supplier_id,
        name=name,
        generic_name=generic_name,
        description=description,
        dosage_form=dosage_form,
        strength=strength,
        unit=unit,
        selling_price=selling_price,
        requires_prescription=requires_prescription,
        minimum_stock=minimum_stock,
    )
    image_url = await save_uploaded_image(image, "medicines")
    service = MedicineService(db)
    medicine = service.create(payload)
    service.add_image(medicine.id, image_url)
    db.commit()
    return medicine


@router.put("/{medicine_id}", response_model=MedicineResponse)
def update(medicine_id: UUID, payload: MedicineUpdate, db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN"))):
    medicine = MedicineService(db).update(medicine_id, payload)
    db.commit()
    return medicine


@router.delete("/{medicine_id}", response_model=MessageResponse)
def delete(medicine_id: UUID, db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN"))):
    MedicineService(db).delete(medicine_id)
    db.commit()
    return {"message": "Obat dinonaktifkan"}


@router.post("/{medicine_id}/images")
async def upload_image(
    medicine_id: UUID,
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("ADMIN")),
):
    image_url = await save_uploaded_image(image, "medicines")
    image = MedicineService(db).add_image(medicine_id, image_url)
    db.commit()
    return image

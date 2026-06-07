from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import require_roles
from app.database import get_db
from app.models.entities import User
from app.schemas.common import MessageResponse
from app.schemas.medicine import CategoryCreate, SupplierCreate, SupplierResponse, SupplierUpdate
from app.services.medicine_service import CategoryService, SupplierService

router = APIRouter(tags=["Master Data"])


@router.get("/categories")
def list_categories(db: Session = Depends(get_db)):
    return CategoryService(db).list()


@router.post("/categories")
def create_category(payload: CategoryCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN"))):
    category = CategoryService(db).create(payload)
    db.commit()
    return category


@router.get("/suppliers")
def list_suppliers(db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN", "APOTEKER"))):
    return SupplierService(db).list()


@router.post("/suppliers", response_model=SupplierResponse)
def create_supplier(payload: SupplierCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN"))):
    supplier = SupplierService(db).create(payload)
    db.commit()
    return supplier


@router.put("/suppliers/{supplier_id}", response_model=SupplierResponse)
def update_supplier(supplier_id: UUID, payload: SupplierUpdate, db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN"))):
    supplier = SupplierService(db).update(supplier_id, payload)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.delete("/suppliers/{supplier_id}", response_model=MessageResponse)
def delete_supplier(supplier_id: UUID, db: Session = Depends(get_db), user: User = Depends(require_roles("ADMIN"))):
    SupplierService(db).delete(supplier_id)
    db.commit()
    return {"message": "Supplier dinonaktifkan"}


@router.get("/customers")
def customers_placeholder(user: User = Depends(require_roles("ADMIN", "KASIR"))):
    return {"message": "CRUD pelanggan memakai tabel users dengan role PASIEN"}


@router.get("/transactions")
def transactions_placeholder(user: User = Depends(require_roles("ADMIN", "KASIR"))):
    return {"message": "CRUD transaksi memakai orders, order_items, dan payments"}

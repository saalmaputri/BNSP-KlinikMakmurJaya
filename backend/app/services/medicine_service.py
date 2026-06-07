import re
import secrets
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import joinedload
from sqlalchemy.orm import Session

from app.core.exceptions import AppException, NotFoundException
from app.models.entities import Category, Medicine, MedicineImage, Supplier
from app.repositories.medicine_repository import CategoryRepository, MedicineRepository, StockRepository, SupplierRepository
from app.schemas.medicine import CategoryCreate, MedicineCreate, MedicineUpdate, SupplierCreate, SupplierUpdate


class MedicineService:
    def __init__(self, db: Session) -> None:
        self.repo = MedicineRepository(db)
        self.stock_repo = StockRepository(db)

    def list(self, keyword=None, category_id=None, sort="name", page=1, page_size=20):
        medicines, total = self.repo.list(keyword, category_id, sort, page, page_size)
        current_stock_map = {row["medicine_id"]: row["current_stock"] for row in self.stock_repo.list_stocks()}
        for medicine in medicines:
            medicine.current_stock = int(current_stock_map.get(medicine.id, 0) or 0)
            medicine.category_name = medicine.category.name if medicine.category else None
            medicine.supplier_name = medicine.supplier.name if medicine.supplier else None
        return medicines, total

    def autocomplete(self, keyword: str):
        return self.repo.autocomplete(keyword)

    def get_detail(self, medicine_id: UUID) -> Medicine:
        medicine = self.repo.db.execute(
            select(Medicine)
            .options(joinedload(Medicine.category), joinedload(Medicine.supplier), joinedload(Medicine.images))
            .where(Medicine.id == medicine_id)
        ).unique().scalar_one_or_none()
        if not medicine or medicine.deleted_at:
            raise NotFoundException("Obat tidak ditemukan")
        current_stock_map = {row["medicine_id"]: row["current_stock"] for row in self.stock_repo.list_stocks()}
        medicine.current_stock = int(current_stock_map.get(medicine.id, 0) or 0)
        medicine.category_name = medicine.category.name if medicine.category else None
        medicine.supplier_name = medicine.supplier.name if medicine.supplier else None
        return medicine

    def create(self, payload: MedicineCreate) -> Medicine:
        sku = self._generate_sku(payload.name)
        return self.repo.add(Medicine(**payload.model_dump(), sku=sku))

    def update(self, medicine_id: UUID, payload: MedicineUpdate) -> Medicine:
        medicine = self.get_detail(medicine_id)
        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(medicine, key, value)
        return medicine

    def delete(self, medicine_id: UUID) -> None:
        self.repo.delete_soft(self.get_detail(medicine_id))

    def add_image(self, medicine_id: UUID, image_url: str, is_primary: bool = True) -> MedicineImage:
        medicine = self.get_detail(medicine_id)
        if is_primary:
            for image in medicine.images:
                image.is_primary = False
        return self.repo.add_image(MedicineImage(medicine=medicine, image_url=image_url, is_primary=is_primary))

    def batches(self, medicine_id: UUID):
        medicine = self.get_detail(medicine_id)
        return self.repo.batches_for_medicine(medicine.id)

    def _generate_sku(self, name: str) -> str:
        words = re.findall(r"[A-Za-z0-9]+", name.upper())
        prefix = "".join(word[:3] for word in words[:2])[:8] or "OBAT"
        for _ in range(10):
            sku = f"OBT-{prefix}-{secrets.token_hex(3).upper()}"
            if not self.repo.get_by_sku(sku):
                return sku
        raise AppException("Gagal membuat SKU unik", "SKU_GENERATION_FAILED")


class CategoryService:
    def __init__(self, db: Session) -> None:
        self.repo = CategoryRepository(db)

    def list(self):
        return self.repo.list()

    def create(self, payload: CategoryCreate):
        return self.repo.add(Category(**payload.model_dump()))


class SupplierService:
    def __init__(self, db: Session) -> None:
        self.repo = SupplierRepository(db)

    def list(self):
        return self.repo.list()

    def create(self, payload: SupplierCreate):
        return self.repo.add(Supplier(**payload.model_dump()))

    def update(self, supplier_id: UUID, payload: SupplierUpdate):
        supplier = self.repo.get(supplier_id)
        if not supplier or supplier.deleted_at is not None:
            raise NotFoundException("Supplier tidak ditemukan")
        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(supplier, key, value)
        return supplier

    def delete(self, supplier_id: UUID):
        supplier = self.repo.get(supplier_id)
        if not supplier or supplier.deleted_at is not None:
            raise NotFoundException("Supplier tidak ditemukan")
        supplier.is_active = False
        return self.repo.delete_soft(supplier)

from __future__ import annotations

from datetime import date, timedelta
from uuid import UUID

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.entities import Category, Medicine, MedicineBatch, MedicineImage, StockMovement, Supplier
from app.repositories.base import BaseRepository


class MedicineRepository(BaseRepository[Medicine]):
    model = Medicine

    def list(self, keyword: str | None, category_id: UUID | None, sort: str, page: int, page_size: int) -> tuple[list[Medicine], int]:
        stmt = select(Medicine).options(joinedload(Medicine.category), joinedload(Medicine.supplier), joinedload(Medicine.images)).where(Medicine.deleted_at.is_(None), Medicine.is_active.is_(True))
        if keyword:
            pattern = f"%{keyword.lower()}%"
            stmt = stmt.where(or_(func.lower(Medicine.name).like(pattern), func.lower(Medicine.sku).like(pattern)))
        if category_id:
            stmt = stmt.where(Medicine.category_id == category_id)
        if sort == "price_desc":
            stmt = stmt.order_by(Medicine.selling_price.desc())
        elif sort == "price_asc":
            stmt = stmt.order_by(Medicine.selling_price.asc())
        else:
            stmt = stmt.order_by(Medicine.name.asc())
        return self.paginate(stmt, page, page_size)

    def autocomplete(self, keyword: str, limit: int = 10) -> list[Medicine]:
        pattern = f"{keyword.lower()}%"
        return list(self.db.scalars(select(Medicine).where(func.lower(Medicine.name).like(pattern), Medicine.deleted_at.is_(None)).limit(limit)))

    def get_by_sku(self, sku: str) -> Medicine | None:
        return self.db.scalar(select(Medicine).where(Medicine.sku == sku))

    def add_image(self, image: MedicineImage) -> MedicineImage:
        return self.add(image)

    def batches_for_medicine(self, medicine_id: UUID) -> list[dict]:
        today = date.today()
        rows = self.db.execute(
            select(
                MedicineBatch.id,
                MedicineBatch.medicine_id,
                MedicineBatch.batch_number,
                MedicineBatch.manufacture_date,
                MedicineBatch.expired_date,
                MedicineBatch.received_date,
                MedicineBatch.initial_quantity,
                MedicineBatch.available_quantity,
                MedicineBatch.unit_cost,
                MedicineBatch.status,
                Supplier.name.label("supplier_name"),
            )
            .outerjoin(Supplier, Supplier.id == MedicineBatch.supplier_id)
            .where(
                MedicineBatch.medicine_id == medicine_id,
                MedicineBatch.deleted_at.is_(None),
            )
            .order_by(MedicineBatch.expired_date.asc(), MedicineBatch.received_date.asc(), MedicineBatch.id.asc())
        ).mappings()
        result = []
        for row in rows:
            item = dict(row)
            item["days_remaining"] = (item["expired_date"] - today).days
            result.append(item)
        return result


class CategoryRepository(BaseRepository[Category]):
    model = Category

    def list(self) -> list[Category]:
        return list(self.db.scalars(select(Category).where(Category.deleted_at.is_(None)).order_by(Category.name)))


class SupplierRepository(BaseRepository[Supplier]):
    model = Supplier

    def list(self) -> list[Supplier]:
        return list(self.db.scalars(select(Supplier).where(Supplier.deleted_at.is_(None)).order_by(Supplier.name)))


class StockRepository(BaseRepository[MedicineBatch]):
    model = MedicineBatch

    def get_fifo_batches_for_update(self, medicine_id: UUID, quantity: int) -> list[MedicineBatch]:
        return list(
            self.db.scalars(
                select(MedicineBatch)
                .where(
                    MedicineBatch.medicine_id == medicine_id,
                    MedicineBatch.deleted_at.is_(None),
                    MedicineBatch.status == "AVAILABLE",
                    MedicineBatch.available_quantity > 0,
                    MedicineBatch.expired_date >= date.today(),
                )
                .order_by(MedicineBatch.expired_date.asc(), MedicineBatch.received_date.asc(), MedicineBatch.id.asc())
                .with_for_update()
            )
        )

    def list_stocks(self) -> list[dict]:
        rows = self.db.execute(
            select(
                Medicine.id.label("medicine_id"),
                Medicine.sku,
                Medicine.name,
                Medicine.minimum_stock,
                func.coalesce(func.sum(MedicineBatch.available_quantity), 0).label("current_stock"),
            )
            .outerjoin(MedicineBatch, and_(MedicineBatch.medicine_id == Medicine.id, MedicineBatch.deleted_at.is_(None), MedicineBatch.status == "AVAILABLE"))
            .where(Medicine.deleted_at.is_(None))
            .group_by(Medicine.id, Medicine.sku, Medicine.name, Medicine.minimum_stock)
            .order_by(Medicine.name)
        ).mappings()
        return [dict(row) for row in rows]

    def critical_stocks(self) -> list[dict]:
        return [row for row in self.list_stocks() if row["current_stock"] <= row["minimum_stock"]]

    def expired_soon(self, days: int = 90) -> list[MedicineBatch]:
        today = date.today()
        total_stock_subquery = (
            select(
                MedicineBatch.medicine_id.label("medicine_id"),
                func.coalesce(func.sum(MedicineBatch.available_quantity), 0).label("total_stock"),
            )
            .where(
                MedicineBatch.deleted_at.is_(None),
                MedicineBatch.status == "AVAILABLE",
                MedicineBatch.available_quantity > 0,
            )
            .group_by(MedicineBatch.medicine_id)
            .subquery()
        )
        rows = self.db.execute(
            select(
                MedicineBatch.id.label("medicine_batch_id"),
                MedicineBatch.medicine_id,
                MedicineBatch.supplier_id,
                MedicineBatch.batch_number,
                MedicineBatch.manufacture_date,
                MedicineBatch.expired_date,
                MedicineBatch.received_date,
                MedicineBatch.initial_quantity,
                MedicineBatch.available_quantity,
                total_stock_subquery.c.total_stock,
                MedicineBatch.unit_cost,
                Medicine.name.label("medicine_name"),
                Medicine.sku.label("medicine_sku"),
                Medicine.minimum_stock,
                Supplier.name.label("supplier_name"),
            )
            .join(Medicine, Medicine.id == MedicineBatch.medicine_id)
            .outerjoin(total_stock_subquery, total_stock_subquery.c.medicine_id == MedicineBatch.medicine_id)
            .outerjoin(Supplier, Supplier.id == MedicineBatch.supplier_id)
            .where(
                MedicineBatch.deleted_at.is_(None),
                MedicineBatch.status == "AVAILABLE",
                MedicineBatch.available_quantity > 0,
                MedicineBatch.expired_date > today,
                MedicineBatch.expired_date <= today + timedelta(days=days),
            )
            .order_by(MedicineBatch.expired_date.asc(), MedicineBatch.received_date.asc(), MedicineBatch.id.asc())
        ).mappings()
        result = []
        for row in rows:
            item = dict(row)
            item["batch_stock"] = item["available_quantity"]
            item["current_stock"] = item["batch_stock"]
            item["days_remaining"] = (item["expired_date"] - today).days
            item["status"] = "menipis" if item["days_remaining"] <= 30 else "monitoring"
            result.append(item)
        return result

    def list_batches_with_expiry(self) -> list[dict]:
        today = date.today()
        total_stock_subquery = (
            select(
                MedicineBatch.medicine_id.label("medicine_id"),
                func.coalesce(func.sum(MedicineBatch.available_quantity), 0).label("total_stock"),
            )
            .where(
                MedicineBatch.deleted_at.is_(None),
                MedicineBatch.status == "AVAILABLE",
                MedicineBatch.available_quantity > 0,
            )
            .group_by(MedicineBatch.medicine_id)
            .subquery()
        )
        rows = self.db.execute(
            select(
                MedicineBatch.id.label("medicine_batch_id"),
                MedicineBatch.medicine_id,
                MedicineBatch.supplier_id,
                MedicineBatch.batch_number,
                MedicineBatch.manufacture_date,
                MedicineBatch.expired_date,
                MedicineBatch.received_date,
                MedicineBatch.initial_quantity,
                MedicineBatch.available_quantity,
                total_stock_subquery.c.total_stock,
                MedicineBatch.unit_cost,
                Medicine.name.label("medicine_name"),
                Medicine.sku.label("medicine_sku"),
                Medicine.minimum_stock,
                Supplier.name.label("supplier_name"),
            )
            .join(Medicine, Medicine.id == MedicineBatch.medicine_id)
            .outerjoin(total_stock_subquery, total_stock_subquery.c.medicine_id == MedicineBatch.medicine_id)
            .outerjoin(Supplier, Supplier.id == MedicineBatch.supplier_id)
            .where(
                MedicineBatch.deleted_at.is_(None),
                MedicineBatch.status == "AVAILABLE",
                MedicineBatch.available_quantity > 0,
            )
            .order_by(MedicineBatch.expired_date.asc(), MedicineBatch.received_date.asc(), MedicineBatch.id.asc())
        ).mappings()
        result = []
        for row in rows:
            item = dict(row)
            item["batch_stock"] = item["available_quantity"]
            item["current_stock"] = item["batch_stock"]
            item["days_remaining"] = (item["expired_date"] - today).days
            if item["days_remaining"] <= 0:
                item["status"] = "expired"
            elif item["days_remaining"] <= 30:
                item["status"] = "menipis"
            else:
                item["status"] = "monitoring"
            result.append(item)
        return result

    def add_movement(self, movement: StockMovement) -> StockMovement:
        return self.add(movement)

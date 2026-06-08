from datetime import date
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import AppException, NotFoundException
from app.models.entities import MedicineBatch, Order, StockMovement
from app.repositories.medicine_repository import StockRepository
from app.schemas.medicine import BatchCreate, StockAdjustmentRequest


class FIFOStockService:
    def __init__(self, db: Session) -> None:
        self.repo = StockRepository(db)

    def reserve_stock(self, medicine_id: UUID, quantity: int, order_id: UUID, created_by: UUID | None = None) -> list[tuple[MedicineBatch, int]]:
        batches = self.repo.get_fifo_batches_for_update(medicine_id, quantity)
        remaining = quantity
        selected: list[tuple[MedicineBatch, int]] = []
        for batch in batches:
            if remaining <= 0:
                break
            take = min(batch.available_quantity, remaining)
            before = batch.available_quantity
            batch.available_quantity -= take
            if batch.available_quantity == 0:
                batch.status = "EMPTY"
            self.repo.add_movement(
                StockMovement(
                    medicine_id=medicine_id,
                    medicine_batch_id=batch.id,
                    movement_type="OUT",
                    quantity=-take,
                    before_quantity=before,
                    after_quantity=batch.available_quantity,
                    reference_type="ORDER",
                    reference_id=order_id,
                    notes="FIFO checkout",
                    created_by=created_by,
                )
            )
            selected.append((batch, take))
            remaining -= take
        if remaining > 0:
            raise AppException("Stok obat tidak mencukupi", "INSUFFICIENT_STOCK")
        return selected

    def restore_order_stock(self, order: Order, created_by: UUID | None = None, notes: str = "Pembayaran melewati batas waktu") -> None:
        for item in order.items:
            batch = getattr(item, "batch", None)
            if not batch:
                continue
            before = batch.available_quantity
            batch.available_quantity = before + int(item.quantity or 0)
            if batch.expired_date >= date.today() and batch.available_quantity > 0:
                batch.status = "AVAILABLE"
            self.repo.add_movement(
                StockMovement(
                    medicine_id=item.medicine_id,
                    medicine_batch_id=batch.id,
                    movement_type="IN",
                    quantity=int(item.quantity or 0),
                    before_quantity=before,
                    after_quantity=batch.available_quantity,
                    reference_type="ORDER",
                    reference_id=order.id,
                    notes=notes,
                    created_by=created_by,
                )
            )


class StockService:
    def __init__(self, db: Session) -> None:
        self.repo = StockRepository(db)

    def list(self):
        return self.repo.list_stocks()

    def create_batch(self, payload: BatchCreate) -> MedicineBatch:
        batch = MedicineBatch(**payload.model_dump(), available_quantity=payload.initial_quantity, status="AVAILABLE")
        return self.repo.add(batch)

    def adjust(self, payload: StockAdjustmentRequest, user_id: UUID | None = None) -> MedicineBatch:
        batch = self.repo.get(payload.medicine_batch_id)
        if not batch:
            raise NotFoundException("Batch stok tidak ditemukan")
        before = batch.available_quantity
        after = before + payload.quantity_delta
        if after < 0:
            raise AppException("Adjustment membuat stok negatif", "NEGATIVE_STOCK")
        batch.available_quantity = after
        batch.status = "EMPTY" if after == 0 else "AVAILABLE"
        self.repo.add_movement(
            StockMovement(
                medicine_id=batch.medicine_id,
                medicine_batch_id=batch.id,
                movement_type="ADJUSTMENT",
                quantity=payload.quantity_delta,
                before_quantity=before,
                after_quantity=after,
                reference_type="MANUAL",
                notes=payload.notes,
                created_by=user_id,
            )
        )
        return batch

    def discard_batch(self, batch_id: UUID, user_id: UUID | None = None) -> MedicineBatch:
        batch = self.repo.get(batch_id)
        if not batch or batch.deleted_at is not None:
            raise NotFoundException("Batch stok tidak ditemukan")
        if batch.expired_date > date.today():
            raise AppException("Batch belum kadaluarsa", "BATCH_NOT_EXPIRED")
        before = batch.available_quantity
        if before > 0:
            batch.available_quantity = 0
            batch.status = "EXPIRED"
            self.repo.add_movement(
                StockMovement(
                    medicine_id=batch.medicine_id,
                    medicine_batch_id=batch.id,
                    movement_type="OUT",
                    quantity=-before,
                    before_quantity=before,
                    after_quantity=0,
                    reference_type="BATCH",
                    reference_id=batch.id,
                    notes="Batch expired dibuang",
                    created_by=user_id,
                )
            )
        else:
            batch.status = "EXPIRED"
        return self.repo.delete_soft(batch)

    def critical(self):
        return self.repo.critical_stocks()

    def expired_soon(self, days: int = 90):
        return self.repo.expired_soon(days)

    def list_batches_with_expiry(self):
        return self.repo.list_batches_with_expiry()

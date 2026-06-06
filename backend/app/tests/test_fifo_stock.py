from types import SimpleNamespace
from uuid import uuid4

from app.services.stock_service import FIFOStockService


class FakeStockRepository:
    def __init__(self, batches):
        self.batches = batches
        self.movements = []

    def get_fifo_batches_for_update(self, medicine_id, quantity):
        return self.batches

    def add_movement(self, movement):
        self.movements.append(movement)
        return movement


def test_fifo_reserve_uses_earliest_expired_batch_first():
    service = FIFOStockService.__new__(FIFOStockService)
    medicine_id = uuid4()
    order_id = uuid4()
    first = SimpleNamespace(id=uuid4(), medicine_id=medicine_id, available_quantity=5, status="AVAILABLE")
    second = SimpleNamespace(id=uuid4(), medicine_id=medicine_id, available_quantity=10, status="AVAILABLE")
    service.repo = FakeStockRepository([first, second])

    selected = service.reserve_stock(medicine_id, 7, order_id)

    assert selected[0][1] == 5
    assert selected[1][1] == 2
    assert first.available_quantity == 0
    assert first.status == "EMPTY"
    assert second.available_quantity == 8
    assert len(service.repo.movements) == 2

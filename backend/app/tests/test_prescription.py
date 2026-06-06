from types import SimpleNamespace
from uuid import uuid4

from app.services.prescription_service import PrescriptionService


class FakePrescriptionRepo:
    def __init__(self, prescription):
        self.prescription = prescription
        self.verifications = []

    def get(self, prescription_id):
        return self.prescription

    def add_verification(self, verification):
        self.verifications.append(verification)
        return verification


class FakeOrderRepo:
    def __init__(self, order):
        self.order = order

    def get(self, order_id):
        return self.order


def test_rejected_prescription_rejects_order():
    service = PrescriptionService.__new__(PrescriptionService)
    prescription = SimpleNamespace(id=uuid4(), order_id=uuid4(), status="PENDING")
    order = SimpleNamespace(status="PRESCRIPTION_REVIEW")
    service.repo = FakePrescriptionRepo(prescription)
    service.order_repo = FakeOrderRepo(order)

    result = service.reject(prescription.id, uuid4(), "Tidak sesuai")

    assert result.status == "REJECTED"
    assert order.status == "REJECTED"
    assert len(service.repo.verifications) == 1

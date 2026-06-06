from decimal import Decimal
from types import SimpleNamespace

from app.services.checkout_service import CheckoutService


def test_create_order_number_uses_type_prefix():
    service = CheckoutService.__new__(CheckoutService)
    service.db = SimpleNamespace(query=lambda model: SimpleNamespace(count=lambda: 0))
    created = {}

    class Repo:
        def add(self, order):
            created["order"] = order
            return order

    service.order_repo = Repo()
    order = service._create_order(None, None, "OFFLINE", "PICKUP", None, None, "Walk-in")

    assert order.order_number == "ORD-OFFLINE-000001"
    assert order.order_type == "OFFLINE"
    assert order.customer_name_snapshot == "Walk-in"

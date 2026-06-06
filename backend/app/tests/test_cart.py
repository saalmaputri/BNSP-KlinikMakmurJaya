from decimal import Decimal
from types import SimpleNamespace

from app.services.cart_service import CartService


def test_cart_total_calculation_without_database():
    service = CartService.__new__(CartService)
    cart = SimpleNamespace(items=[
        SimpleNamespace(unit_price_snapshot=Decimal("8000"), quantity=2),
        SimpleNamespace(unit_price_snapshot=Decimal("25000"), quantity=1),
    ])
    assert service.calculate_total(cart) == Decimal("41000")

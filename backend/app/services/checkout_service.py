from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import AppException, NotFoundException
from app.models.entities import Order, OrderItem, Payment
from app.repositories.cart_repository import CartRepository
from app.repositories.medicine_repository import MedicineRepository
from app.repositories.order_repository import OrderRepository
from app.schemas.cart import CheckoutRequest
from app.schemas.order import OfflineCheckoutRequest
from app.services.stock_service import FIFOStockService
from app.services.notification_service import NotificationService


class CheckoutService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.cart_repo = CartRepository(db)
        self.order_repo = OrderRepository(db)
        self.medicine_repo = MedicineRepository(db)
        self.fifo = FIFOStockService(db)
        self.notifications = NotificationService(db)

    def checkout_online(self, user_id: UUID, payload: CheckoutRequest) -> Order:
        cart = self.cart_repo.get_active_cart(user_id)
        if not cart or not cart.items:
            raise AppException("Cart kosong", "EMPTY_CART")
        try:
            order = self._create_order(user_id, None, "ONLINE", payload.fulfillment_method, payload.shipping_address, payload.notes)
            requires_prescription = False
            subtotal = Decimal("0")
            for cart_item in cart.items:
                medicine = cart_item.medicine
                requires_prescription = requires_prescription or medicine.requires_prescription
                selected_batches = self.fifo.reserve_stock(medicine.id, cart_item.quantity, order.id, user_id)
                for batch, qty in selected_batches:
                    line_total = medicine.selling_price * qty
                    subtotal += line_total
                    self.order_repo.add_item(
                        OrderItem(
                            order_id=order.id,
                            medicine_id=medicine.id,
                            medicine_batch_id=batch.id,
                            medicine_sku_snapshot=medicine.sku,
                            medicine_name_snapshot=medicine.name,
                            batch_number_snapshot=batch.batch_number,
                            expired_date_snapshot=batch.expired_date,
                            quantity=qty,
                            unit_price=medicine.selling_price,
                            line_total=line_total,
                        )
                    )
            order.subtotal = subtotal
            order.shipping_cost = Decimal("0") if payload.fulfillment_method == "PICKUP" else Decimal("10000")
            order.total_amount = order.subtotal + order.shipping_cost
            order.status = "WAITING_PRESCRIPTION" if requires_prescription else "PENDING_PAYMENT"
            self.order_repo.add_payment(Payment(order_id=order.id, payment_number=f"PAY-{order.order_number}", method=payload.payment_method, status="PENDING", amount=order.total_amount))
            cart.status = "CHECKED_OUT"
            self.notifications.create(
                user_id,
                "ORDER_CREATED",
                "Pesanan berhasil dibuat",
                f"Pesanan {order.order_number} berhasil dibuat.",
                "ORDER",
                order.id,
            )
            self.notifications.create_for_roles(
                ["ADMIN"],
                "NEW_ONLINE_ORDER",
                "Pesanan online baru",
                f"Pesanan {order.order_number} menunggu diproses.",
                "ORDER",
                order.id,
                "HIGH",
            )
            return order
        except Exception:
            self.db.rollback()
            raise

    def checkout_offline(self, cashier_id: UUID, payload: OfflineCheckoutRequest) -> Order:
        try:
            order = self._create_order(None, cashier_id, "OFFLINE", "PICKUP", None, None, customer_name=payload.customer_name)
            subtotal = Decimal("0")
            for item in payload.items:
                medicine = self.medicine_repo.get(item.medicine_id)
                if not medicine:
                    raise NotFoundException("Obat tidak ditemukan")
                selected_batches = self.fifo.reserve_stock(medicine.id, item.quantity, order.id, cashier_id)
                for batch, qty in selected_batches:
                    line_total = medicine.selling_price * qty
                    subtotal += line_total
                    self.order_repo.add_item(
                        OrderItem(
                            order_id=order.id,
                            medicine_id=medicine.id,
                            medicine_batch_id=batch.id,
                            medicine_sku_snapshot=medicine.sku,
                            medicine_name_snapshot=medicine.name,
                            batch_number_snapshot=batch.batch_number,
                            expired_date_snapshot=batch.expired_date,
                            quantity=qty,
                            unit_price=medicine.selling_price,
                            line_total=line_total,
                        )
                    )
            order.subtotal = subtotal
            order.total_amount = subtotal
            order.paid_amount = subtotal
            order.status = "COMPLETED"
            self.order_repo.add_payment(Payment(order_id=order.id, payment_number=f"PAY-{order.order_number}", method=payload.payment_method, status="VERIFIED", amount=subtotal, paid_at=datetime.now(timezone.utc), verified_by=cashier_id, verified_at=datetime.now(timezone.utc)))
            self.notifications.create(
                cashier_id,
                "CASHIER_ORDER_COMPLETED",
                "Transaksi kasir selesai",
                f"Transaksi {order.order_number} berhasil diselesaikan.",
                "ORDER",
                order.id,
            )
            self.notifications.create_for_roles(
                ["ADMIN"],
                "OFFLINE_ORDER_COMPLETED",
                "Transaksi offline baru",
                f"Transaksi {order.order_number} telah diselesaikan kasir.",
                "ORDER",
                order.id,
            )
            return order
        except Exception:
            self.db.rollback()
            raise

    def _create_order(self, patient_id, cashier_id, order_type, fulfillment_method, shipping_address, notes, customer_name=None) -> Order:
        count = self.db.query(Order).count() + 1
        order = Order(
            order_number=f"ORD-{order_type}-{count:06d}",
            patient_id=patient_id,
            cashier_id=cashier_id,
            order_type=order_type,
            status="PENDING_CHECKOUT",
            fulfillment_method=fulfillment_method,
            checkout_at=datetime.now(timezone.utc),
            shipping_address_snapshot=shipping_address,
            notes=notes,
            customer_name_snapshot=customer_name,
        )
        return self.order_repo.add(order)

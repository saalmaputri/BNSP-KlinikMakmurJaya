from datetime import datetime, timezone

from app.models.entities import Order, OrderItem, Payment, Prescription


def serialize_order_item(item: OrderItem) -> dict:
    return {
        "id": item.id,
        "medicine_id": item.medicine_id,
        "medicine_batch_id": item.medicine_batch_id,
        "medicine_name_snapshot": item.medicine_name_snapshot,
        "batch_number_snapshot": item.batch_number_snapshot,
        "expired_date_snapshot": item.expired_date_snapshot,
        "quantity": item.quantity,
        "unit_price": item.unit_price,
        "line_total": item.line_total,
    }


def serialize_payment(payment: Payment) -> dict:
    order = getattr(payment, "order", None)
    patient = getattr(order, "patient", None) if order else None
    return {
        "id": payment.id,
        "order_id": payment.order_id,
        "order_number": order.order_number if order else None,
        "patient_name": patient.full_name if patient else getattr(order, "customer_name_snapshot", None) if order else None,
        "payment_number": payment.payment_number,
        "method": payment.method,
        "status": payment.status,
        "amount": payment.amount,
        "paid_at": payment.paid_at,
        "proof_file_url": payment.proof_file_url,
        "proof_uploaded_at": payment.proof_uploaded_at,
        "verified_by": payment.verified_by,
        "verified_at": payment.verified_at,
        "rejection_reason": payment.rejection_reason,
    }


def serialize_order(order: Order) -> dict:
    payments = list(getattr(order, "payments", []) or [])
    payments = sorted(
        payments,
        key=lambda payment: (
            payment.proof_uploaded_at
            or payment.verified_at
            or payment.paid_at
            or payment.created_at
            or datetime.min.replace(tzinfo=timezone.utc)
        ),
        reverse=True,
    )
    latest_payment = payments[0] if payments else None
    synthetic_payment_method = getattr(order, "payment_method", None) or "BANK_TRANSFER"
    synthetic_payment_number = f"PAY-{order.order_number}"
    synthetic_payment_status = "PENDING" if order.status == "PENDING_PAYMENT" else None
    return {
        "id": order.id,
        "order_number": order.order_number,
        "patient_id": order.patient_id,
        "cashier_id": order.cashier_id,
        "order_type": order.order_type,
        "status": order.status,
        "fulfillment_method": order.fulfillment_method,
        "checkout_at": order.checkout_at,
        "customer_name_snapshot": order.customer_name_snapshot,
        "customer_phone_snapshot": order.customer_phone_snapshot,
        "shipping_address_snapshot": order.shipping_address_snapshot,
        "notes": order.notes,
        "subtotal": order.subtotal,
        "discount_amount": order.discount_amount,
        "shipping_cost": order.shipping_cost,
        "total_amount": order.total_amount,
        "paid_amount": order.paid_amount,
        "payment_method": latest_payment.method if latest_payment else synthetic_payment_method if synthetic_payment_status else None,
        "payment_status": latest_payment.status if latest_payment else synthetic_payment_status,
        "payment_number": latest_payment.payment_number if latest_payment else synthetic_payment_number if synthetic_payment_status else None,
        "proof_file_url": latest_payment.proof_file_url if latest_payment else None,
        "proof_uploaded_at": latest_payment.proof_uploaded_at if latest_payment else None,
        "verified_at": latest_payment.verified_at if latest_payment else None,
        "rejection_reason": latest_payment.rejection_reason if latest_payment else None,
        "items": [serialize_order_item(item) for item in list(getattr(order, "items", []) or [])],
        "payments": [serialize_payment(payment) for payment in payments],
    }


def serialize_prescription(prescription: Prescription) -> dict:
    return {
        "id": prescription.id,
        "order_id": prescription.order_id,
        "patient_id": prescription.patient_id,
        "patient_name": prescription.patient.full_name if getattr(prescription, "patient", None) else None,
        "doctor_name": prescription.doctor_name,
        "prescription_number": prescription.prescription_number,
        "file_url": prescription.file_url,
        "status": prescription.status,
        "notes": prescription.notes,
        "uploaded_at": prescription.uploaded_at,
    }

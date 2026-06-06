ROLE_PERMISSION_MATRIX = {
    "ADMIN": ["manage_users", "manage_medicines", "manage_stock", "verify_payment", "view_reports", "view_audit_logs"],
    "APOTEKER": ["verify_prescription", "manage_stock", "view_pharmacist_dashboard"],
    "KASIR": ["offline_sales", "verify_counter_payment", "view_cashier_dashboard"],
    "PASIEN": ["shop", "checkout", "upload_prescription", "upload_payment_proof", "view_own_orders"],
}

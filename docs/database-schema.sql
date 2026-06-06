-- PostgreSQL DDL
-- Sistem E-Commerce Penjualan Obat Klinik Makmur Jaya
-- Fokus: database only.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(80) NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_roles_code CHECK (code IN ('ADMIN', 'APOTEKER', 'KASIR', 'PASIEN'))
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(180) NOT NULL,
    phone VARCHAR(30),
    password_hash VARCHAR(255) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(20),
    address TEXT,
    email_verified_at TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'pending_verification',
    last_login_at TIMESTAMPTZ,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT chk_users_status CHECK (status IN ('pending_verification', 'active', 'suspended', 'inactive')),
    CONSTRAINT chk_users_gender CHECK (gender IS NULL OR gender IN ('male', 'female', 'other')),
    CONSTRAINT chk_users_failed_login CHECK (failed_login_attempts >= 0)
);

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    session_token_hash VARCHAR(255) NOT NULL UNIQUE,
    refresh_token_hash VARCHAR(255) UNIQUE,
    ip_address INET,
    user_agent TEXT,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    revoke_reason VARCHAR(150),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_user_sessions_expiry CHECK (expires_at > created_at)
);

CREATE TABLE email_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(180) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_email_verifications_expiry CHECK (expires_at > created_at)
);

CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    requested_ip INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_password_reset_expiry CHECK (expires_at > created_at)
);

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(140) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_categories_name UNIQUE (name),
    CONSTRAINT uq_categories_slug UNIQUE (slug)
);

CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(160) NOT NULL,
    contact_person VARCHAR(150),
    phone VARCHAR(30),
    email VARCHAR(180),
    address TEXT,
    tax_number VARCHAR(80),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_suppliers_name UNIQUE (name)
);

CREATE TABLE medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    supplier_id UUID REFERENCES suppliers(id) ON UPDATE CASCADE ON DELETE SET NULL,
    sku VARCHAR(80) NOT NULL,
    name VARCHAR(180) NOT NULL,
    generic_name VARCHAR(180),
    description TEXT,
    dosage_form VARCHAR(80),
    strength VARCHAR(80),
    unit VARCHAR(50) NOT NULL DEFAULT 'pcs',
    selling_price NUMERIC(14,2) NOT NULL,
    requires_prescription BOOLEAN NOT NULL DEFAULT FALSE,
    minimum_stock INTEGER NOT NULL DEFAULT 10,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_medicines_sku UNIQUE (sku),
    CONSTRAINT chk_medicines_price CHECK (selling_price >= 0),
    CONSTRAINT chk_medicines_minimum_stock CHECK (minimum_stock >= 0)
);

CREATE TABLE medicine_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON UPDATE CASCADE ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text VARCHAR(180),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_medicine_images_sort CHECK (sort_order >= 0)
);

CREATE TABLE medicine_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    supplier_id UUID REFERENCES suppliers(id) ON UPDATE CASCADE ON DELETE SET NULL,
    batch_number VARCHAR(100) NOT NULL,
    manufacture_date DATE,
    expired_date DATE NOT NULL,
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    initial_quantity INTEGER NOT NULL,
    available_quantity INTEGER NOT NULL,
    unit_cost NUMERIC(14,2),
    status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_medicine_batches UNIQUE (medicine_id, batch_number),
    CONSTRAINT chk_batches_qty CHECK (initial_quantity >= 0 AND available_quantity >= 0 AND available_quantity <= initial_quantity),
    CONSTRAINT chk_batches_unit_cost CHECK (unit_cost IS NULL OR unit_cost >= 0),
    CONSTRAINT chk_batches_status CHECK (status IN ('AVAILABLE', 'HOLD', 'EXPIRED', 'RECALLED', 'EMPTY')),
    CONSTRAINT chk_batches_expiry CHECK (expired_date >= received_date)
);

CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    medicine_batch_id UUID REFERENCES medicine_batches(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    movement_type VARCHAR(30) NOT NULL,
    quantity INTEGER NOT NULL,
    before_quantity INTEGER,
    after_quantity INTEGER,
    reference_type VARCHAR(50),
    reference_id UUID,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_stock_movement_type CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT', 'RETURN', 'CANCEL')),
    CONSTRAINT chk_stock_movement_qty CHECK (quantity <> 0)
);

CREATE TABLE carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_carts_status CHECK (status IN ('ACTIVE', 'CHECKED_OUT', 'ABANDONED'))
);

CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES carts(id) ON UPDATE CASCADE ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    quantity INTEGER NOT NULL,
    unit_price_snapshot NUMERIC(14,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cart_items_cart_medicine UNIQUE (cart_id, medicine_id),
    CONSTRAINT chk_cart_items_qty CHECK (quantity > 0),
    CONSTRAINT chk_cart_items_price CHECK (unit_price_snapshot >= 0)
);

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) NOT NULL UNIQUE,
    patient_id UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    cashier_id UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    order_type VARCHAR(20) NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'PENDING_CHECKOUT',
    fulfillment_method VARCHAR(30) NOT NULL DEFAULT 'PICKUP',
    checkout_at TIMESTAMPTZ,
    subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    shipping_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    customer_name_snapshot VARCHAR(150),
    customer_phone_snapshot VARCHAR(30),
    shipping_address_snapshot TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_orders_type CHECK (order_type IN ('ONLINE', 'OFFLINE')),
    CONSTRAINT chk_orders_status CHECK (status IN (
        'PENDING_CHECKOUT', 'PENDING_PAYMENT', 'WAITING_PRESCRIPTION',
        'PRESCRIPTION_REVIEW', 'PAID', 'PROCESSING', 'READY_FOR_PICKUP',
        'SHIPPED', 'COMPLETED', 'CANCELLED', 'REJECTED'
    )),
    CONSTRAINT chk_orders_fulfillment CHECK (fulfillment_method IN ('PICKUP', 'DELIVERY')),
    CONSTRAINT chk_orders_amount CHECK (
        subtotal >= 0 AND discount_amount >= 0 AND shipping_cost >= 0
        AND total_amount >= 0 AND paid_amount >= 0
    )
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON UPDATE CASCADE ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    medicine_batch_id UUID REFERENCES medicine_batches(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    medicine_sku_snapshot VARCHAR(80) NOT NULL,
    medicine_name_snapshot VARCHAR(180) NOT NULL,
    batch_number_snapshot VARCHAR(100),
    expired_date_snapshot DATE,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(14,2) NOT NULL,
    discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    line_total NUMERIC(14,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_order_items_qty CHECK (quantity > 0),
    CONSTRAINT chk_order_items_amount CHECK (unit_price >= 0 AND discount_amount >= 0 AND line_total >= 0)
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON UPDATE CASCADE ON DELETE CASCADE,
    payment_number VARCHAR(50) NOT NULL UNIQUE,
    method VARCHAR(40) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    amount NUMERIC(14,2) NOT NULL,
    paid_at TIMESTAMPTZ,
    proof_file_url TEXT,
    proof_uploaded_at TIMESTAMPTZ,
    verified_by UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_payments_method CHECK (method IN ('CASH', 'BANK_TRANSFER', 'QRIS', 'DEBIT_CARD', 'CREDIT_CARD', 'E_WALLET')),
    CONSTRAINT chk_payments_status CHECK (status IN ('PENDING', 'WAITING_VERIFICATION', 'VERIFIED', 'REJECTED', 'REFUNDED', 'FAILED')),
    CONSTRAINT chk_payments_amount CHECK (amount >= 0)
);

CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON UPDATE CASCADE ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    doctor_name VARCHAR(150),
    prescription_number VARCHAR(100),
    file_url TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_prescriptions_status CHECK (status IN ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED'))
);

CREATE TABLE prescription_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON UPDATE CASCADE ON DELETE CASCADE,
    pharmacist_id UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL,
    notes TEXT,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_prescription_verifications_status CHECK (status IN ('APPROVED', 'REJECTED'))
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    type VARCHAR(40) NOT NULL,
    title VARCHAR(180) NOT NULL,
    message TEXT NOT NULL,
    entity_name VARCHAR(80),
    entity_id UUID,
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_notifications_type CHECK (type IN ('LOW_STOCK', 'EXPIRY', 'ORDER', 'PAYMENT', 'PRESCRIPTION', 'IMPORT', 'REPORT', 'SYSTEM')),
    CONSTRAINT chk_notifications_priority CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT'))
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    role_code VARCHAR(30),
    action VARCHAR(120) NOT NULL,
    entity_name VARCHAR(80) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    stack_trace TEXT,
    path TEXT,
    method VARCHAR(10),
    request_id VARCHAR(100),
    user_id UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    context JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'UNRESOLVED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_error_logs_level CHECK (level IN ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL')),
    CONSTRAINT chk_error_logs_status CHECK (status IN ('UNRESOLVED', 'RESOLVED'))
);

CREATE TABLE import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type VARCHAR(40) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'QUEUED',
    original_file_name VARCHAR(255) NOT NULL,
    file_url TEXT,
    total_rows INTEGER NOT NULL DEFAULT 0,
    success_rows INTEGER NOT NULL DEFAULT 0,
    failed_rows INTEGER NOT NULL DEFAULT 0,
    error_summary JSONB,
    created_by UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_import_jobs_type CHECK (job_type IN ('MEDICINES', 'BATCHES', 'SUPPLIERS')),
    CONSTRAINT chk_import_jobs_status CHECK (status IN ('QUEUED', 'PROCESSING', 'SUCCESS', 'PARTIAL_FAILED', 'FAILED', 'CANCELLED')),
    CONSTRAINT chk_import_jobs_rows CHECK (total_rows >= 0 AND success_rows >= 0 AND failed_rows >= 0)
);

CREATE TABLE report_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'QUEUED',
    filter_params JSONB,
    file_url TEXT,
    created_by UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_report_jobs_type CHECK (report_type IN ('DAILY_SALES', 'WEEKLY_SALES', 'MONTHLY_SALES', 'BEST_SELLING', 'STOCK', 'PAYMENT_RECAP', 'ONLINE_OFFLINE')),
    CONSTRAINT chk_report_jobs_status CHECK (status IN ('QUEUED', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED'))
);

CREATE TABLE payment_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(id) ON UPDATE CASCADE ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON UPDATE CASCADE ON DELETE CASCADE,
    job_type VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'QUEUED',
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    payload JSONB,
    response JSONB,
    error_message TEXT,
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_payment_jobs_type CHECK (job_type IN ('VERIFY_PAYMENT', 'SEND_PAYMENT_NOTIFICATION', 'REFUND_PAYMENT')),
    CONSTRAINT chk_payment_jobs_status CHECK (status IN ('QUEUED', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED')),
    CONSTRAINT chk_payment_jobs_attempts CHECK (attempts >= 0 AND max_attempts > 0 AND attempts <= max_attempts)
);

-- Indexing strategy
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_email_lower ON users (LOWER(email));
CREATE INDEX idx_users_deleted_at ON users(deleted_at);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_active ON user_sessions(user_id, expires_at) WHERE revoked_at IS NULL;

CREATE INDEX idx_email_verifications_user_id ON email_verifications(user_id);
CREATE INDEX idx_email_verifications_expires ON email_verifications(expires_at) WHERE verified_at IS NULL;
CREATE INDEX idx_password_reset_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_expires ON password_reset_tokens(expires_at) WHERE used_at IS NULL;

CREATE INDEX idx_categories_active ON categories(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_suppliers_active ON suppliers(is_active) WHERE deleted_at IS NULL;

CREATE INDEX idx_medicines_category_id ON medicines(category_id);
CREATE INDEX idx_medicines_supplier_id ON medicines(supplier_id);
CREATE INDEX idx_medicines_active_name ON medicines(is_active, name) WHERE deleted_at IS NULL;
CREATE INDEX idx_medicines_requires_prescription ON medicines(requires_prescription);
CREATE INDEX idx_medicines_name_lower ON medicines (LOWER(name));

CREATE INDEX idx_medicine_images_medicine_id ON medicine_images(medicine_id);
CREATE UNIQUE INDEX uq_medicine_images_primary ON medicine_images(medicine_id) WHERE is_primary = TRUE AND deleted_at IS NULL;

CREATE INDEX idx_batches_medicine_fifo ON medicine_batches(medicine_id, expired_date, received_date, id) WHERE deleted_at IS NULL AND status = 'AVAILABLE' AND available_quantity > 0;
CREATE INDEX idx_batches_expired_date ON medicine_batches(expired_date);
CREATE INDEX idx_batches_available ON medicine_batches(medicine_id, available_quantity);

CREATE INDEX idx_stock_movements_medicine_created ON stock_movements(medicine_id, created_at DESC);
CREATE INDEX idx_stock_movements_batch_id ON stock_movements(medicine_batch_id);
CREATE INDEX idx_stock_movements_reference ON stock_movements(reference_type, reference_id);

CREATE UNIQUE INDEX uq_active_cart_per_user ON carts(user_id) WHERE status = 'ACTIVE' AND deleted_at IS NULL;
CREATE INDEX idx_carts_user_status ON carts(user_id, status);
CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX idx_cart_items_medicine_id ON cart_items(medicine_id);

CREATE INDEX idx_orders_patient_created ON orders(patient_id, created_at DESC);
CREATE INDEX idx_orders_cashier_created ON orders(cashier_id, created_at DESC);
CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX idx_orders_type_created ON orders(order_type, created_at DESC);
CREATE INDEX idx_orders_checkout_at ON orders(checkout_at);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_medicine_id ON order_items(medicine_id);
CREATE INDEX idx_order_items_batch_id ON order_items(medicine_batch_id);

CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_method_created ON payments(method, created_at DESC);
CREATE INDEX idx_payments_status_created ON payments(status, created_at DESC);
CREATE INDEX idx_payments_verified_at ON payments(verified_at);

CREATE INDEX idx_prescriptions_order_id ON prescriptions(order_id);
CREATE INDEX idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_status ON prescriptions(status);
CREATE INDEX idx_prescription_verifications_prescription_id ON prescription_verifications(prescription_id);
CREATE INDEX idx_prescription_verifications_pharmacist_id ON prescription_verifications(pharmacist_id);

CREATE INDEX idx_notifications_user_read ON notifications(user_id, read_at, created_at DESC);
CREATE INDEX idx_notifications_type_created ON notifications(type, created_at DESC);

CREATE INDEX idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_name, entity_id);
CREATE INDEX idx_audit_logs_action_created ON audit_logs(action, created_at DESC);

CREATE INDEX idx_error_logs_level_created ON error_logs(level, created_at DESC);
CREATE INDEX idx_error_logs_request_id ON error_logs(request_id);
CREATE INDEX idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX idx_error_logs_status ON error_logs(status);

CREATE INDEX idx_import_jobs_status_created ON import_jobs(status, created_at DESC);
CREATE INDEX idx_import_jobs_created_by ON import_jobs(created_by);
CREATE INDEX idx_report_jobs_status_created ON report_jobs(status, created_at DESC);
CREATE INDEX idx_report_jobs_created_by ON report_jobs(created_by);
CREATE INDEX idx_payment_jobs_status_schedule ON payment_jobs(status, scheduled_at);
CREATE INDEX idx_payment_jobs_payment_id ON payment_jobs(payment_id);

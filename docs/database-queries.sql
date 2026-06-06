-- Query SQL laporan, FIFO, dan operasional database.
-- Gunakan parameter binding dari ORM, contoh :start_date, :end_date, :medicine_id, :quantity.

-- 1. Total penjualan harian
SELECT
    DATE_TRUNC('day', o.checkout_at)::date AS sales_date,
    COUNT(DISTINCT o.id) AS total_orders,
    SUM(o.total_amount) AS gross_sales,
    SUM(o.paid_amount) AS paid_sales
FROM orders o
WHERE o.status IN ('PAID', 'PROCESSING', 'READY_FOR_PICKUP', 'SHIPPED', 'COMPLETED')
  AND o.checkout_at >= :start_date
  AND o.checkout_at < :end_date
GROUP BY DATE_TRUNC('day', o.checkout_at)::date
ORDER BY sales_date;

-- 2. Total penjualan mingguan
SELECT
    DATE_TRUNC('week', o.checkout_at)::date AS week_start,
    COUNT(DISTINCT o.id) AS total_orders,
    SUM(o.total_amount) AS gross_sales,
    SUM(o.paid_amount) AS paid_sales
FROM orders o
WHERE o.status IN ('PAID', 'PROCESSING', 'READY_FOR_PICKUP', 'SHIPPED', 'COMPLETED')
  AND o.checkout_at >= :start_date
  AND o.checkout_at < :end_date
GROUP BY DATE_TRUNC('week', o.checkout_at)::date
ORDER BY week_start;

-- 3. Total penjualan bulanan
SELECT
    DATE_TRUNC('month', o.checkout_at)::date AS month_start,
    COUNT(DISTINCT o.id) AS total_orders,
    SUM(o.total_amount) AS gross_sales,
    SUM(o.paid_amount) AS paid_sales
FROM orders o
WHERE o.status IN ('PAID', 'PROCESSING', 'READY_FOR_PICKUP', 'SHIPPED', 'COMPLETED')
  AND o.checkout_at >= :start_date
  AND o.checkout_at < :end_date
GROUP BY DATE_TRUNC('month', o.checkout_at)::date
ORDER BY month_start;

-- 4. Obat terlaris
SELECT
    m.id AS medicine_id,
    m.sku,
    m.name,
    SUM(oi.quantity) AS total_qty_sold,
    SUM(oi.line_total) AS total_sales
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
JOIN medicines m ON m.id = oi.medicine_id
WHERE o.status IN ('PAID', 'PROCESSING', 'READY_FOR_PICKUP', 'SHIPPED', 'COMPLETED')
  AND o.checkout_at >= :start_date
  AND o.checkout_at < :end_date
GROUP BY m.id, m.sku, m.name
ORDER BY total_qty_sold DESC, total_sales DESC
LIMIT :limit OFFSET :offset;

-- 5. Stok kritis berdasarkan total available_quantity per obat
SELECT
    m.id AS medicine_id,
    m.sku,
    m.name,
    m.minimum_stock,
    COALESCE(SUM(mb.available_quantity), 0) AS current_stock
FROM medicines m
LEFT JOIN medicine_batches mb
    ON mb.medicine_id = m.id
   AND mb.deleted_at IS NULL
   AND mb.status = 'AVAILABLE'
WHERE m.deleted_at IS NULL
  AND m.is_active = TRUE
GROUP BY m.id, m.sku, m.name, m.minimum_stock
HAVING COALESCE(SUM(mb.available_quantity), 0) <= m.minimum_stock
ORDER BY current_stock ASC, m.name ASC;

-- 6. Obat mendekati kadaluarsa 30/60/90 hari
SELECT
    m.id AS medicine_id,
    m.sku,
    m.name,
    mb.id AS batch_id,
    mb.batch_number,
    mb.expired_date,
    mb.available_quantity,
    CASE
        WHEN mb.expired_date <= CURRENT_DATE + INTERVAL '30 days' THEN '30_HARI'
        WHEN mb.expired_date <= CURRENT_DATE + INTERVAL '60 days' THEN '60_HARI'
        WHEN mb.expired_date <= CURRENT_DATE + INTERVAL '90 days' THEN '90_HARI'
    END AS expiry_bucket
FROM medicine_batches mb
JOIN medicines m ON m.id = mb.medicine_id
WHERE mb.deleted_at IS NULL
  AND m.deleted_at IS NULL
  AND mb.status = 'AVAILABLE'
  AND mb.available_quantity > 0
  AND mb.expired_date > CURRENT_DATE
  AND mb.expired_date <= CURRENT_DATE + INTERVAL '90 days'
ORDER BY mb.expired_date ASC, m.name ASC;

-- 7. Rekap transaksi per metode pembayaran
SELECT
    p.method,
    COUNT(DISTINCT p.id) AS total_payments,
    COUNT(DISTINCT p.order_id) AS total_orders,
    SUM(p.amount) AS total_amount
FROM payments p
JOIN orders o ON o.id = p.order_id
WHERE p.status = 'VERIFIED'
  AND p.verified_at >= :start_date
  AND p.verified_at < :end_date
GROUP BY p.method
ORDER BY total_amount DESC;

-- 8. Laporan transaksi online dan offline
SELECT
    o.order_type,
    COUNT(*) AS total_orders,
    SUM(o.subtotal) AS subtotal,
    SUM(o.discount_amount) AS discount_amount,
    SUM(o.shipping_cost) AS shipping_cost,
    SUM(o.total_amount) AS total_amount,
    SUM(o.paid_amount) AS paid_amount
FROM orders o
WHERE o.status IN ('PAID', 'PROCESSING', 'READY_FOR_PICKUP', 'SHIPPED', 'COMPLETED')
  AND o.checkout_at >= :start_date
  AND o.checkout_at < :end_date
GROUP BY o.order_type
ORDER BY o.order_type;

-- 9. Query FIFO untuk melihat batch yang akan dipakai.
-- Prinsip FIFO farmasi memakai batch dengan expired_date paling dekat, lalu received_date paling lama.
WITH fifo_batches AS (
    SELECT
        mb.id,
        mb.medicine_id,
        mb.batch_number,
        mb.expired_date,
        mb.available_quantity,
        SUM(mb.available_quantity) OVER (
            ORDER BY mb.expired_date ASC, mb.received_date ASC, mb.id ASC
        ) AS running_qty
    FROM medicine_batches mb
    WHERE mb.medicine_id = :medicine_id
      AND mb.deleted_at IS NULL
      AND mb.status = 'AVAILABLE'
      AND mb.available_quantity > 0
      AND mb.expired_date >= CURRENT_DATE
    ORDER BY mb.expired_date ASC, mb.received_date ASC, mb.id ASC
    FOR UPDATE
),
selected_batches AS (
    SELECT
        id,
        medicine_id,
        batch_number,
        expired_date,
        available_quantity,
        CASE
            WHEN running_qty <= :requested_quantity THEN available_quantity
            ELSE :requested_quantity - (running_qty - available_quantity)
        END AS quantity_to_take
    FROM fifo_batches
    WHERE running_qty - available_quantity < :requested_quantity
)
SELECT *
FROM selected_batches
WHERE quantity_to_take > 0
ORDER BY expired_date ASC, id ASC;

-- 10. Query FIFO untuk mengurangi stok dari batch.
-- Jalankan di dalam transaksi database.
-- Setelah SELECT FIFO di atas menghasilkan selected batch, aplikasi membuat order_items per batch
-- dan menjalankan update berikut untuk masing-masing batch memakai parameter terikat.
UPDATE medicine_batches
SET
    available_quantity = available_quantity - :quantity_to_take,
    status = CASE
        WHEN available_quantity - :quantity_to_take = 0 THEN 'EMPTY'
        ELSE status
    END,
    updated_at = NOW()
WHERE id = :medicine_batch_id
  AND available_quantity >= :quantity_to_take
RETURNING id, medicine_id, batch_number, available_quantity;

-- 11. Insert mutasi stok setelah batch dikurangi.
INSERT INTO stock_movements (
    medicine_id,
    medicine_batch_id,
    movement_type,
    quantity,
    before_quantity,
    after_quantity,
    reference_type,
    reference_id,
    notes,
    created_by
) VALUES (
    :medicine_id,
    :medicine_batch_id,
    'OUT',
    -:quantity_to_take,
    :before_quantity,
    :after_quantity,
    'ORDER',
    :order_id,
    :notes,
    :created_by
);

-- 12. Notifikasi stok minimum
INSERT INTO notifications (user_id, type, title, message, entity_name, entity_id, priority)
SELECT
    u.id,
    'LOW_STOCK',
    'Stok minimum tercapai',
    'Stok obat ' || m.name || ' berada di bawah atau sama dengan minimum.',
    'medicines',
    m.id,
    'HIGH'
FROM medicines m
JOIN roles r ON r.code IN ('ADMIN', 'APOTEKER')
JOIN users u ON u.role_id = r.id AND u.status = 'active'
LEFT JOIN medicine_batches mb
    ON mb.medicine_id = m.id
   AND mb.deleted_at IS NULL
   AND mb.status = 'AVAILABLE'
WHERE m.id = :medicine_id
GROUP BY u.id, m.id, m.name, m.minimum_stock
HAVING COALESCE(SUM(mb.available_quantity), 0) <= m.minimum_stock;

-- 13. Session timeout cleanup atau revoke expired session
UPDATE user_sessions
SET revoked_at = NOW(),
    revoke_reason = 'SESSION_TIMEOUT',
    updated_at = NOW()
WHERE revoked_at IS NULL
  AND expires_at < NOW();

-- Indexing strategy notes:
-- Search medicine: idx_medicines_name_lower, idx_medicines_active_name, idx_medicines_category_id.
-- Filter katalog: category_id, is_active, deleted_at.
-- Sorting dan pagination order: idx_orders_status_created, idx_orders_patient_created, idx_orders_type_created.
-- FIFO stok: idx_batches_medicine_fifo.
-- Laporan penjualan: idx_orders_checkout_at, idx_orders_type_created, idx_payments_method_created.
-- Audit: idx_audit_logs_user_created, idx_audit_logs_entity.
-- Session timeout: idx_user_sessions_active, idx_user_sessions_expires_at.

-- Data dummy minimal untuk testing database.
-- Password hash di bawah adalah placeholder bcrypt. Pada aplikasi nyata, hash dibuat oleh bcrypt.

INSERT INTO roles (id, code, name, description, permissions) VALUES
('00000000-0000-0000-0000-000000000001', 'ADMIN', 'Admin', 'Administrator sistem', '{"manage_all": true}'),
('00000000-0000-0000-0000-000000000002', 'APOTEKER', 'Apoteker', 'Verifikasi resep dan stok', '{"verify_prescription": true, "manage_stock": true}'),
('00000000-0000-0000-0000-000000000003', 'KASIR', 'Kasir', 'Transaksi offline dan pembayaran', '{"offline_sales": true, "verify_payment": true}'),
('00000000-0000-0000-0000-000000000004', 'PASIEN', 'Pasien', 'Pelanggan online', '{"shop": true}');

INSERT INTO users (id, role_id, full_name, email, phone, password_hash, email_verified_at, status) VALUES
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Admin Klinik', 'admin@klinikmakmurjaya.com', '081100000001', '$2b$12$dummyadminhashdummyadminhashdummyadminhash', NOW(), 'active'),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Apt. Siti Rahma', 'apoteker@klinikmakmurjaya.com', '081100000002', '$2b$12$dummyapotekerhashdummyapotekerhashdummy', NOW(), 'active'),
('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'Kasir Klinik', 'kasir@klinikmakmurjaya.com', '081100000003', '$2b$12$dummykasirhashdummykasirhashdummykasir', NOW(), 'active'),
('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 'Budi Santoso', 'budi@klinikmakmurjaya.com', '081100000004', '$2b$12$dummypasienhashdummypasienhashdummy', NOW(), 'active');

INSERT INTO email_verifications (user_id, token_hash, email, expires_at, verified_at) VALUES
('10000000-0000-0000-0000-000000000004', 'dummy-email-verification-token-hash', 'budi@klinikmakmurjaya.com', NOW() + INTERVAL '1 day', NOW());

INSERT INTO user_sessions (user_id, session_token_hash, refresh_token_hash, ip_address, user_agent, expires_at) VALUES
('10000000-0000-0000-0000-000000000001', 'dummy-session-admin', 'dummy-refresh-admin', '127.0.0.1', 'Test Browser', NOW() + INTERVAL '2 hours'),
('10000000-0000-0000-0000-000000000004', 'dummy-session-pasien', 'dummy-refresh-pasien', '127.0.0.1', 'Test Browser', NOW() + INTERVAL '2 hours');

INSERT INTO categories (id, name, slug, description) VALUES
('20000000-0000-0000-0000-000000000001', 'Analgesik', 'analgesik', 'Obat pereda nyeri'),
('20000000-0000-0000-0000-000000000002', 'Antibiotik', 'antibiotik', 'Obat antibiotik wajib resep'),
('20000000-0000-0000-0000-000000000003', 'Vitamin', 'vitamin', 'Suplemen dan vitamin');

INSERT INTO suppliers (id, name, contact_person, phone, email, address) VALUES
('30000000-0000-0000-0000-000000000001', 'PT Sehat Farma', 'Andi', '021111111', 'sales@sehatfarma.test', 'Jakarta'),
('30000000-0000-0000-0000-000000000002', 'PT Makmur Medika', 'Rina', '021222222', 'sales@makmurmedika.test', 'Bandung');

INSERT INTO medicines (
    id, category_id, supplier_id, sku, name, generic_name, description,
    dosage_form, strength, unit, selling_price, requires_prescription, minimum_stock
) VALUES
('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'OBT-PCM-500', 'Paracetamol 500mg', 'Paracetamol', 'Pereda demam dan nyeri', 'Tablet', '500mg', 'strip', 8000, FALSE, 20),
('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'OBT-AMX-500', 'Amoxicillin 500mg', 'Amoxicillin', 'Antibiotik wajib resep', 'Kapsul', '500mg', 'strip', 18000, TRUE, 15),
('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', 'VIT-C-500', 'Vitamin C 500mg', 'Ascorbic Acid', 'Suplemen vitamin C', 'Tablet', '500mg', 'botol', 25000, FALSE, 10);

INSERT INTO medicine_images (medicine_id, image_url, alt_text, is_primary, sort_order) VALUES
('40000000-0000-0000-0000-000000000001', '/uploads/medicines/paracetamol.jpg', 'Paracetamol 500mg', TRUE, 1),
('40000000-0000-0000-0000-000000000002', '/uploads/medicines/amoxicillin.jpg', 'Amoxicillin 500mg', TRUE, 1),
('40000000-0000-0000-0000-000000000003', '/uploads/medicines/vitamin-c.jpg', 'Vitamin C 500mg', TRUE, 1);

INSERT INTO medicine_batches (
    id, medicine_id, supplier_id, batch_number, manufacture_date, expired_date,
    received_date, initial_quantity, available_quantity, unit_cost
) VALUES
('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'PCM-A001', CURRENT_DATE - INTERVAL '180 days', CURRENT_DATE + INTERVAL '45 days', CURRENT_DATE - INTERVAL '90 days', 100, 100, 5000),
('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'PCM-A002', CURRENT_DATE - INTERVAL '120 days', CURRENT_DATE + INTERVAL '180 days', CURRENT_DATE - INTERVAL '30 days', 150, 150, 5200),
('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'AMX-B001', CURRENT_DATE - INTERVAL '200 days', CURRENT_DATE + INTERVAL '75 days', CURRENT_DATE - INTERVAL '60 days', 50, 50, 12000),
('50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', 'VTC-C001', CURRENT_DATE - INTERVAL '100 days', CURRENT_DATE + INTERVAL '365 days', CURRENT_DATE - INTERVAL '20 days', 8, 8, 18000);

INSERT INTO carts (id, user_id, status) VALUES
('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'ACTIVE');

INSERT INTO cart_items (cart_id, medicine_id, quantity, unit_price_snapshot) VALUES
('60000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 2, 8000),
('60000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', 1, 25000);

INSERT INTO orders (
    id, order_number, patient_id, cashier_id, order_type, status, fulfillment_method,
    checkout_at, subtotal, discount_amount, shipping_cost, total_amount, paid_amount,
    customer_name_snapshot, customer_phone_snapshot, shipping_address_snapshot
) VALUES
('70000000-0000-0000-0000-000000000001', 'ORD-ONLINE-0001', '10000000-0000-0000-0000-000000000004', NULL, 'ONLINE', 'PAID', 'DELIVERY', NOW(), 41000, 0, 10000, 51000, 51000, 'Budi Santoso', '081100000004', 'Jl. Melati No. 1, Jakarta'),
('70000000-0000-0000-0000-000000000002', 'ORD-OFFLINE-0001', NULL, '10000000-0000-0000-0000-000000000003', 'OFFLINE', 'COMPLETED', 'PICKUP', NOW(), 8000, 0, 0, 8000, 8000, 'Pelanggan Walk-in', NULL, NULL);

INSERT INTO order_items (
    order_id, medicine_id, medicine_batch_id, medicine_sku_snapshot, medicine_name_snapshot,
    batch_number_snapshot, expired_date_snapshot, quantity, unit_price, discount_amount, line_total
) VALUES
('70000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'OBT-PCM-500', 'Paracetamol 500mg', 'PCM-A001', CURRENT_DATE + INTERVAL '45 days', 2, 8000, 0, 16000),
('70000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000004', 'VIT-C-500', 'Vitamin C 500mg', 'VTC-C001', CURRENT_DATE + INTERVAL '365 days', 1, 25000, 0, 25000),
('70000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'OBT-PCM-500', 'Paracetamol 500mg', 'PCM-A001', CURRENT_DATE + INTERVAL '45 days', 1, 8000, 0, 8000);

INSERT INTO payments (
    id, order_id, payment_number, method, status, amount, paid_at,
    proof_file_url, proof_uploaded_at, verified_by, verified_at
) VALUES
('80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'PAY-0001', 'BANK_TRANSFER', 'VERIFIED', 51000, NOW(), '/uploads/payments/pay-0001.jpg', NOW(), '10000000-0000-0000-0000-000000000001', NOW()),
('80000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002', 'PAY-0002', 'CASH', 'VERIFIED', 8000, NOW(), NULL, NULL, '10000000-0000-0000-0000-000000000003', NOW());

INSERT INTO prescriptions (
    id, order_id, patient_id, doctor_name, prescription_number, file_url, status
) VALUES
('90000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'dr. Ahmad', 'RSP-001', '/uploads/prescriptions/rsp-001.jpg', 'APPROVED');

INSERT INTO prescription_verifications (
    prescription_id, pharmacist_id, status, notes
) VALUES
('90000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'APPROVED', 'Resep valid dan sesuai.');

INSERT INTO stock_movements (
    medicine_id, medicine_batch_id, movement_type, quantity, before_quantity, after_quantity,
    reference_type, reference_id, notes, created_by
) VALUES
('40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'OUT', -3, 100, 97, 'ORDER', '70000000-0000-0000-0000-000000000001', 'Penjualan online dan offline dummy', '10000000-0000-0000-0000-000000000003'),
('40000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000004', 'OUT', -1, 8, 7, 'ORDER', '70000000-0000-0000-0000-000000000001', 'Penjualan online dummy', '10000000-0000-0000-0000-000000000003');

UPDATE medicine_batches
SET available_quantity = 97, updated_at = NOW()
WHERE id = '50000000-0000-0000-0000-000000000001';

UPDATE medicine_batches
SET available_quantity = 7, updated_at = NOW()
WHERE id = '50000000-0000-0000-0000-000000000004';

INSERT INTO notifications (user_id, type, title, message, entity_name, entity_id, priority) VALUES
('10000000-0000-0000-0000-000000000001', 'ORDER', 'Pesanan baru', 'Pesanan online ORD-ONLINE-0001 telah dibuat.', 'orders', '70000000-0000-0000-0000-000000000001', 'NORMAL'),
('10000000-0000-0000-0000-000000000002', 'EXPIRY', 'Obat mendekati kadaluarsa', 'Batch PCM-A001 akan kadaluarsa dalam kurang dari 60 hari.', 'medicine_batches', '50000000-0000-0000-0000-000000000001', 'HIGH'),
('10000000-0000-0000-0000-000000000001', 'LOW_STOCK', 'Stok minimum', 'Vitamin C 500mg berada di bawah stok minimum.', 'medicines', '40000000-0000-0000-0000-000000000003', 'HIGH');

INSERT INTO audit_logs (user_id, role_code, action, entity_name, entity_id, old_values, new_values, ip_address, user_agent, request_id) VALUES
('10000000-0000-0000-0000-000000000004', 'PASIEN', 'CREATE_ORDER', 'orders', '70000000-0000-0000-0000-000000000001', NULL, '{"status": "PAID"}', '127.0.0.1', 'Test Browser', 'req-dummy-001'),
('10000000-0000-0000-0000-000000000002', 'APOTEKER', 'VERIFY_PRESCRIPTION', 'prescriptions', '90000000-0000-0000-0000-000000000001', '{"status": "PENDING"}', '{"status": "APPROVED"}', '127.0.0.1', 'Test Browser', 'req-dummy-002');

INSERT INTO error_logs (level, message, path, method, request_id, user_id, context) VALUES
('ERROR', 'Contoh error validasi upload file', '/uploads/payment-proof', 'POST', 'req-error-001', '10000000-0000-0000-0000-000000000004', '{"reason": "invalid_file_type"}');

INSERT INTO import_jobs (job_type, status, original_file_name, file_url, total_rows, success_rows, failed_rows, created_by, started_at, finished_at) VALUES
('MEDICINES', 'SUCCESS', 'import_obat.xlsx', '/uploads/imports/import_obat.xlsx', 3, 3, 0, '10000000-0000-0000-0000-000000000001', NOW(), NOW());

INSERT INTO report_jobs (report_type, status, filter_params, file_url, created_by, started_at, finished_at) VALUES
('DAILY_SALES', 'SUCCESS', '{"date": "today"}', '/reports/daily-sales.pdf', '10000000-0000-0000-0000-000000000001', NOW(), NOW());

INSERT INTO payment_jobs (payment_id, order_id, job_type, status, attempts, payload, response, started_at, finished_at) VALUES
('80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'SEND_PAYMENT_NOTIFICATION', 'SUCCESS', 1, '{"channel": "email"}', '{"sent": true}', NOW(), NOW());

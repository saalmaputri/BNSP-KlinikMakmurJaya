# Rancangan Database PostgreSQL

Sistem: **E-Commerce Penjualan Obat Klinik Makmur Jaya**

Fokus dokumen ini hanya database. Rancangan mendukung transaksi penjualan obat online dan offline, role Admin, Apoteker, Kasir, dan Pasien, serta kebutuhan audit, stok FIFO, resep, pembayaran, import, report, dan job background.

## 1. Prinsip Desain

- Database menggunakan PostgreSQL.
- Primary key menggunakan UUID dengan `gen_random_uuid()`.
- Password tidak disimpan dalam bentuk plain text; kolom `users.password_hash` menyimpan hasil hashing bcrypt dari aplikasi.
- Soft delete digunakan pada data yang masih mungkin direferensikan transaksi, seperti user, kategori, obat, supplier, cart, order, dan payment. Notifikasi tidak memakai soft delete karena status tampil/baca cukup dikelola dengan `read_at`.
- Tabel master/transaksi utama memiliki `created_at` dan `updated_at`.
- Tabel event/log/history cukup memiliki `created_at` agar histori tidak berubah-ubah, misalnya `stock_movements`, `audit_logs`, `error_logs`, dan `prescription_verifications`.
- Kolom pencarian dan filter utama diberi index.
- Validasi data dijaga menggunakan foreign key, unique constraint, check constraint, dan index.
- SQL injection dicegah pada layer akses data dengan parameterized query melalui ORM SQLAlchemy, bukan string concatenation.

## 2. ERD dan Penjelasan Relasi

Relasi utama:

- `roles` 1..N `users`: satu user memiliki satu role, role dapat dimiliki banyak user.
- `users` 1..N `user_sessions`: satu user dapat memiliki banyak sesi login.
- `users` 1..N `email_verifications`: satu user dapat memiliki banyak token verifikasi email.
- `users` 1..N `password_reset_tokens`: satu user dapat memiliki banyak token reset password.
- `categories` 1..N `medicines`: satu kategori memiliki banyak obat.
- `suppliers` 1..N `medicines`: supplier utama dapat memasok banyak obat.
- `medicines` 1..N `medicine_images`: satu obat memiliki banyak gambar.
- `medicines` 1..N `medicine_batches`: satu obat memiliki banyak batch stok.
- `medicine_batches` 1..N `stock_movements`: satu batch memiliki banyak mutasi stok.
- `users` 1..N `carts`: satu pasien dapat memiliki cart aktif maupun histori cart.
- `carts` 1..N `cart_items`: satu cart memiliki banyak item.
- `medicines` 1..N `cart_items`: satu obat dapat masuk ke banyak cart item.
- `users` 1..N `orders`: pasien memiliki banyak order; kasir/admin juga dapat tercatat sebagai pembuat order offline.
- `orders` 1..N `order_items`: satu order memiliki banyak item.
- `order_items` N..1 `medicines`: item order mengambil data obat.
- `order_items` N..1 `medicine_batches`: item order mengambil stok dari batch tertentu untuk mendukung FIFO.
- `orders` 1..N `payments`: satu order dapat memiliki satu atau lebih pembayaran.
- `orders` 1..N `prescriptions`: satu order dapat memiliki resep dokter jika obat membutuhkan resep.
- `prescriptions` 1..N `prescription_verifications`: resep diverifikasi oleh apoteker dan histori verifikasi disimpan.
- `users` 1..N `notifications`: notifikasi ditujukan ke user tertentu.
- `users` 1..N `audit_logs`: seluruh aktivitas role dicatat dengan aktor user.
- `import_jobs`, `report_jobs`, dan `payment_jobs` menyimpan status background process.

## 3. Daftar Tabel

Tabel wajib yang dirancang:

1. `users`
2. `roles`
3. `user_sessions`
4. `email_verifications`
5. `password_reset_tokens`
6. `categories`
7. `medicines`
8. `medicine_images`
9. `suppliers`
10. `medicine_batches`
11. `stock_movements`
12. `carts`
13. `cart_items`
14. `orders`
15. `order_items`
16. `payments`
17. `prescriptions`
18. `prescription_verifications`
19. `notifications`
20. `audit_logs`
21. `error_logs`
22. `import_jobs`
23. `report_jobs`
24. `payment_jobs`

## 4. Desain Tabel Ringkas

### roles

Menyimpan role multi-level: Admin, Apoteker, Kasir, dan Pasien.

Kolom penting:

- `id`: primary key.
- `code`: kode unik role, contoh `ADMIN`, `APOTEKER`, `KASIR`, `PASIEN`.
- `name`: nama role.
- `permissions`: JSONB untuk daftar izin.

### users

Menyimpan akun internal dan pasien.

Kolom penting:

- `role_id`: relasi ke `roles`.
- `email`: unik untuk login dan verifikasi.
- `password_hash`: hasil hash bcrypt dari aplikasi.
- `email_verified_at`: waktu verifikasi email.
- `status`: `pending_verification`, `active`, `suspended`, `inactive`.
- `last_login_at`: login terakhir.

### user_sessions

Mendukung session management dengan timeout.

Kolom penting:

- `session_token_hash`: hash token sesi.
- `refresh_token_hash`: hash refresh token jika digunakan.
- `expires_at`: waktu timeout sesi.
- `revoked_at`: waktu sesi dicabut.
- `last_activity_at`: aktivitas terakhir.

### email_verifications

Menyimpan token verifikasi email.

Kolom penting:

- `token_hash`: hash token verifikasi, bukan token asli.
- `expires_at`: batas valid token.
- `verified_at`: waktu token digunakan.

### password_reset_tokens

Menyimpan token reset password.

Kolom penting:

- `token_hash`: hash token reset.
- `expires_at`: batas valid token.
- `used_at`: waktu token digunakan.

### categories

Kategori obat, misalnya analgesik, antibiotik, vitamin.

Kolom penting:

- `name`, `slug`, `description`, `is_active`.

### medicines

Data master obat.

Kolom penting:

- `category_id`: kategori.
- `supplier_id`: supplier utama.
- `sku`: kode unik obat.
- `name`: nama obat.
- `requires_prescription`: penanda obat wajib resep.
- `selling_price`: harga jual.
- `minimum_stock`: batas stok minimum.
- `is_active`: status tampil/dijual.

### medicine_images

Gambar obat.

Kolom penting:

- `medicine_id`, `image_url`, `is_primary`, `sort_order`.

### suppliers

Data pemasok obat.

Kolom penting:

- `name`, `phone`, `email`, `address`, `is_active`.

### medicine_batches

Batch stok obat untuk FIFO dan tanggal kadaluarsa.

Kolom penting:

- `medicine_id`: obat.
- `supplier_id`: supplier batch.
- `batch_number`: nomor batch.
- `expired_date`: tanggal kadaluarsa.
- `initial_quantity`: jumlah awal.
- `available_quantity`: stok tersisa real-time per batch.
- `unit_cost`: harga beli.

### stock_movements

Mutasi stok real-time.

Kolom penting:

- `movement_type`: `IN`, `OUT`, `ADJUSTMENT`, `RETURN`, `CANCEL`.
- `quantity`: positif untuk masuk, negatif untuk keluar.
- `reference_type`: `ORDER`, `IMPORT`, `MANUAL`, `PAYMENT_CANCEL`, dan sejenisnya.

### carts dan cart_items

Keranjang belanja pasien.

Kolom penting:

- `carts.user_id`: pasien pemilik cart.
- `carts.status`: `ACTIVE`, `CHECKED_OUT`, `ABANDONED`.
- `cart_items.medicine_id`: obat yang dipilih.
- `cart_items.quantity`: jumlah.

### orders dan order_items

Transaksi penjualan online dan offline.

Kolom penting:

- `orders.order_type`: `ONLINE` atau `OFFLINE`.
- `orders.status`: status checkout dan fulfillment.
- `orders.patient_id`: pasien pembeli.
- `orders.cashier_id`: kasir pembuat order offline.
- `orders.checkout_at`: waktu checkout.
- `order_items.medicine_id`: obat.
- `order_items.medicine_batch_id`: batch stok yang dipakai.

### payments

Pembayaran order.

Kolom penting:

- `method`: metode pembayaran.
- `status`: status pembayaran.
- `proof_file_url`: bukti pembayaran untuk transfer.
- `verified_by`: admin/kasir yang memverifikasi.

### prescriptions dan prescription_verifications

Resep dokter dan verifikasi oleh apoteker.

Kolom penting:

- `prescriptions.order_id`: order terkait.
- `prescriptions.patient_id`: pasien.
- `prescription_verifications.pharmacist_id`: apoteker pemeriksa.
- `prescription_verifications.status`: `APPROVED` atau `REJECTED`.

### notifications

Mendukung notifikasi stok minimum dan pesanan.

Kolom penting:

- `user_id`: penerima.
- `type`: `LOW_STOCK`, `ORDER`, `PAYMENT`, `PRESCRIPTION`, `SYSTEM`.
- `read_at`: waktu dibaca.

### audit_logs

Mencatat aktivitas seluruh role.

Kolom penting:

- `user_id`, `role_code`, `action`, `entity_name`, `entity_id`, `old_values`, `new_values`, `ip_address`.

### error_logs

Mencatat error aplikasi.

Kolom penting:

- `level`, `message`, `stack_trace`, `path`, `request_id`, `user_id`.

### import_jobs, report_jobs, payment_jobs

Mendukung background process.

Kolom penting:

- `status`: `QUEUED`, `PROCESSING`, `SUCCESS`, `FAILED`, `CANCELLED`.
- `started_at`, `finished_at`, `error_message`.
- metadata JSONB sesuai jenis job.

## 5. File SQL

DDL lengkap tersedia pada:

- [database-schema.sql](./database-schema.sql)

ERD tersedia dalam dua versi:

- [erd-ringkas-mermaid.md](./erd-ringkas-mermaid.md)
- [erd-database-mermaid.md](./erd-database-mermaid.md)

Query laporan, FIFO, dan strategi indexing tersedia pada:

- [database-queries.sql](./database-queries.sql)

Data dummy minimal tersedia pada:

- [database-dummy-data.sql](./database-dummy-data.sql)

## 6. Catatan Keamanan SQL Injection

Database menyediakan constraint dan index, tetapi pencegahan SQL injection dilakukan pada layer akses data. Implementasi backend nanti wajib memakai SQLAlchemy parameter binding, contohnya pola konseptual:

```python
session.execute(
    text("SELECT * FROM medicines WHERE name ILIKE :keyword"),
    {"keyword": f"%{keyword}%"}
)
```

Hindari membuat SQL dengan string interpolation seperti:

```python
f"SELECT * FROM medicines WHERE name = '{name}'"
```

Semua input user seperti pencarian obat, filter status, tanggal laporan, ID order, token, dan pagination harus dikirim sebagai parameter query ORM.

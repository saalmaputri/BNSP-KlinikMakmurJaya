# Klinik Makmur Jaya

Sistem E-Commerce Penjualan Obat Klinik Makmur Jaya berbasis web..

## Pendahuluan

Klinik Makmur Jaya membutuhkan sistem web untuk membantu penjualan obat dan produk kesehatan secara lebih terstruktur. Sistem ini dipakai untuk katalog produk, pengajuan resep, checkout online pickup-only, upload bukti pembayaran, verifikasi resep dan pembayaran, manajemen stok batch, dan laporan operasional.

Tujuan utamanya:

- Memudahkan pasien mengakses obat secara daring.
- Mempercepat verifikasi resep dan pembayaran secara terpusat.
- Menjaga stok obat tetap akurat sampai level batch dan kedaluwarsa.
- Menyediakan laporan penjualan dan analitik untuk manajemen.

## Ringkasan Sistem

Aplikasi ini terdiri dari:

- Frontend React + Vite + Tailwind CSS
- Backend FastAPI + SQLAlchemy
- PostgreSQL sebagai database
- Redis + Celery untuk background job
- ReportLab untuk export PDF
- Pandas + OpenPyXL untuk import CSV/Excel

## Arsitektur Sistem

```mermaid
flowchart LR
  User[Admin / Apoteker / Kasir / Pasien] --> FE[Frontend React]
  FE --> API[Backend FastAPI]
  API --> DB[(PostgreSQL)]
  API --> REDIS[(Redis)]
  REDIS --> WORKER[Celery Worker]
  WORKER --> DB
  WORKER --> FILES[(File Storage)]
  API --> FILES
```

### Alur Komponen

- Pasien memakai katalog, ajukan resep, checkout, upload bukti bayar, dan melihat status pesanan.
- Apoteker atau admin memverifikasi resep.
- Admin memverifikasi bukti pembayaran.
- Sistem stok memakai batch FIFO dan melacak kedaluwarsa.
- Laporan penjualan dan PDF dibuat dari backend, lalu hasilnya ditampilkan di frontend.

## Tugas Setiap Role

### Pasien

- Melihat katalog obat dan detail batch obat.
- Mengajukan resep untuk obat yang wajib resep.
- Mengelola keranjang dan checkout.
- Mengunggah bukti pembayaran.
- Melihat status pesanan, status resep, dan riwayat pembelian.

### Apoteker

- Memverifikasi atau menolak resep.
- Memantau stok obat dan batch kedaluwarsa.
- Menyiapkan pesanan sampai status siap diambil.
- Mencatat mutasi stok dan koreksi stok.

### Admin

- Mengelola obat, kategori, supplier, dan data master lain.
- Memverifikasi atau menolak bukti pembayaran.
- Mengelola pesanan operasional.
- Mengelola stok batch dan koreksi stok.
- Mengakses laporan, dashboard, audit log, dan job report.

### Kasir

- Melayani transaksi offline.
- Mengelola transaksi kasir dan riwayat pembayaran.
- Membantu proses operasional sesuai hak akses yang diberikan.

## Business Logic

- Sistem pasien memakai alur pickup-only, bukan pengiriman.
- Obat yang wajib resep tidak bisa langsung checkout sebelum resep diunggah dan diverifikasi.
- Resep yang sudah disetujui hanya bisa dipakai satu kali transaksi.
- Setelah checkout berhasil, order masuk alur pembayaran manual dengan upload bukti.
- Admin memverifikasi bukti pembayaran sebelum pesanan diproses.
- Stok diambil dari batch dengan metode FIFO agar stok batch dan kedaluwarsa tetap akurat.
- Status pesanan bergerak dari `waiting_prescription` atau `pending_payment` ke `paid`, `processing`, `ready_for_pickup`, lalu `completed`.
- Laporan penjualan dan laporan obat terlaris dibangun dari data backend dan dapat diekspor ke PDF.

## Struktur Folder Utama

- `backend/` - FastAPI, service, router, repository, job, dan API
- `frontend/` - React, halaman role-based, dan komponen UI
- `docs/` - perancangan sistem, use case, dan dokumentasi pendukung
- `database/` - rancangan database, DDL, query, dan ERD

## Prasyarat

- Python 3.11+
- Node.js 18+
- PostgreSQL
- Redis

## Instalasi

### 1. Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Isi `.env` backend minimal:

```env
DATABASE_URL=postgresql+psycopg2://postgres:password@localhost:5432/klinik_makmur_jaya
JWT_SECRET_KEY=ganti-dengan-secret-panjang
REDIS_URL=redis://localhost:6379/0
BACKEND_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Lalu buat database:

```powershell
alembic upgrade head
```

Jika ingin data contoh:

```powershell
python -m app.utils.seeder
```

### 2. Frontend

```powershell
cd frontend
npm install
copy .env.example .env
```

Isi `.env` frontend:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## Menjalankan Aplikasi

### Backend

```powershell
cd backend
python -m uvicorn app.main:app --reload
```

### Frontend

```powershell
cd frontend
npm start
```

## Urutan Jalan Lokal

1. Jalankan PostgreSQL.
2. Jalankan Redis.
3. Jalankan backend FastAPI.
4. Jalankan frontend React.
5. Buka `http://localhost:5173`.

## Dokumentasi

- [Perancangan Sistem](docs/perancangan-sistem.md)
- [Use Case Diagram](docs/use-case-diagram.md)
- [Folder Database](database/README.md)

## Akun Dummy

Jika seeder dijalankan, akun contoh default memakai password yang sama:

```text
Password123
```

Daftar akun dummy:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@klinikmakmurjaya.com` | `Password123` |
| Apoteker | `apoteker@klinikmakmurjaya.com` | `Password123` |
| Kasir | `kasir@klinikmakmurjaya.com` | `Password123` |
| Pasien | `budi@klinikmakmurjaya.com` | `Password123` |

Catatan:

- Seeder akan membuat atau menyesuaikan akun di atas saat `python -m app.utils.seeder` dijalankan.
- Semua akun dummy memakai password yang sama agar mudah untuk testing lokal.

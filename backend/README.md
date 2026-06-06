# Backend Klinik Makmur Jaya

Backend FastAPI untuk Sistem E-Commerce Penjualan Obat Klinik Makmur Jaya.

## Stack

- FastAPI
- PostgreSQL
- SQLAlchemy ORM
- Alembic
- JWT
- bcrypt/argon2
- Pydantic
- Celery + Redis
- ReportLab
- Pandas + OpenPyXL

## Koneksi ke Database pgAdmin/PostgreSQL

pgAdmin hanya alat untuk mengelola PostgreSQL. Backend tersambung langsung ke server PostgreSQL melalui `DATABASE_URL`.

Jika database yang dibuat di pgAdmin bernama:

```text
klinik_makmur_jaya
```

maka isi file `.env` di folder `backend/` seperti ini:

```env
DATABASE_URL=postgresql+psycopg2://postgres:password_postgres_kamu@localhost:5432/klinik_makmur_jaya
JWT_SECRET_KEY=ganti-dengan-secret-panjang
REDIS_URL=redis://localhost:6379/0
```

Ganti `password_postgres_kamu` sesuai password user PostgreSQL milikmu. Jika port PostgreSQL berbeda dari `5432`, sesuaikan portnya.

## Setup Environment Backend

Buat `.env` dari contoh:

```powershell
copy .env.example .env
```

Contoh konfigurasi lokal:

```env
APP_NAME="Klinik Makmur Jaya API"
ENVIRONMENT=development
DEBUG=true
DATABASE_URL=postgresql+psycopg2://postgres:password_postgres_kamu@localhost:5432/klinik_makmur_jaya
JWT_SECRET_KEY=ganti-dengan-secret-panjang
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
SESSION_TIMEOUT_MINUTES=120
REDIS_URL=redis://localhost:6379/0
BACKEND_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://172.20.10.3:5173,https://frontend-domain-deploy.com
```

`BACKEND_CORS_ORIGINS` harus berisi alamat frontend yang boleh mengakses API. Untuk deploy, tambahkan domain frontend production.

## Instalasi Lokal

```powershell
cd C:\Users\salma\Documents\KlinikMakmurJaya\backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Edit `.env`, terutama bagian `DATABASE_URL`.

## Membuat Tabel

Jika database masih kosong, gunakan Alembic:

```powershell
alembic upgrade head
```

Jika sebelumnya tabel sudah dibuat manual dari `docs/database-schema.sql`, jangan jalankan migration create table lagi pada database yang sama. Untuk menjadikan kondisi saat ini sebagai baseline Alembic:

```powershell
alembic stamp head
```

Jika database sudah sempat dibuat sebelum backend ini ditambahkan, jalankan patch kecil berikut di pgAdmin Query Tool atau psql:

```powershell
psql -U postgres -d klinik_makmur_jaya -f sql\patch_existing_database.sql
```

## Seeder Data Dummy

```powershell
python -m app.utils.seeder
```

Default password akun dummy:

```text
Password123
```

Akun dummy:

| Role | Email |
| --- | --- |
| Admin | admin@klinikmakmurjaya.com |
| Apoteker | apoteker@klinikmakmurjaya.com |
| Kasir | kasir@klinikmakmurjaya.com |
| Pasien | budi@klinikmakmurjaya.com |

## Menjalankan API

```powershell
uvicorn app.main:app --reload
```

Alternatif yang lebih aman di Windows:

```powershell
python -m uvicorn app.main:app --reload
```

Buka dokumentasi Swagger:

```text
http://127.0.0.1:8000/docs
```

Frontend lokal berjalan di:

```text
http://localhost:5173
```

Pastikan `BACKEND_CORS_ORIGINS` di `.env` memuat origin frontend:

```env
BACKEND_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://172.20.10.3:5173,https://frontend-domain-deploy.com
```

## Deploy Backend di Railway/Render

Set environment variable berikut di dashboard Railway/Render:

```text
DATABASE_URL=postgresql+psycopg2://...
JWT_SECRET_KEY=secret-production
REDIS_URL=redis://...
BACKEND_CORS_ORIGINS=https://frontend-domain-deploy.com
ENVIRONMENT=production
DEBUG=false
```

Start command:

```text
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Jika frontend production berada di Vercel/Netlify, tambahkan domain frontend production ke `BACKEND_CORS_ORIGINS`. Di sisi frontend, set `VITE_API_BASE_URL` ke URL backend production.

## Mengatasi Error CORS

Jika browser menampilkan error CORS:

1. Pastikan frontend berjalan di origin yang ada pada `BACKEND_CORS_ORIGINS`.
2. Jika frontend lokal memakai `http://localhost:5173`, masukkan origin itu.
3. Jika frontend memakai `http://127.0.0.1:5173`, masukkan juga origin itu.
4. Restart backend setelah mengubah `.env`.

## Cek Koneksi FE-BE

Backend:

```text
http://localhost:8000/docs
```

Cek database:

```text
GET /monitoring/database
```

Cek frontend dari browser console:

```js
fetch(`${window.__KMJ_API_BASE_URL__}/monitoring/health`).then((r) => r.json()).then(console.log)
```

## Menjalankan Celery Worker

Pastikan Redis berjalan, lalu:

```powershell
celery -A app.jobs.celery_app.celery_app worker --loglevel=info
```

## Pola OOP

- Model database: `app/models/entities.py`
- Schema request/response: `app/schemas/`
- Query database: `app/repositories/`
- Business logic: `app/services/`
- Endpoint tipis: `app/routers/`
- JWT/password/import/PDF helper: `app/utils/`
- Middleware: `app/middlewares/`
- Background job: `app/jobs/`

## Catatan SQL Injection

Semua query aplikasi memakai SQLAlchemy ORM/repository. Input user tidak digabungkan langsung ke string SQL. Untuk query raw di masa depan, wajib memakai parameter binding.

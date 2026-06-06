# Klinik Makmur Jaya

Sistem e-commerce penjualan obat dengan backend FastAPI dan frontend React + Vite + Tailwind CSS.

## Dokumentasi BNSP

Dokumen lingkup uji BNSP lengkap tersedia di:

- `docs/BNSP-Sistem-E-Commerce-Obat-Klinik-Makmur-Jaya.md`

Dokumen tersebut mencakup arsitektur perangkat keras, project integration/scope/quality management, risiko keamanan, analisis tools, skalabilitas, library, SQL, algoritma, migrasi, debugging, real-time notification, Celery/Redis, multimedia upload, UAT, user guide, cutover, impact analysis, alerting, monitoring resource, proses update software, dan mapping use case role Admin/Apoteker/Kasir/Pasien ke route frontend serta endpoint backend.

## URL Lokal

- Backend: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`
- Frontend: `http://localhost:5173`

## Setup Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Isi penting `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg2://postgres:password_postgres_kamu@localhost:5432/klinik_makmur_jaya
JWT_SECRET_KEY=ganti-dengan-secret-panjang
BACKEND_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,https://frontend-domain-deploy.com
```

Jalankan backend:

```powershell
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload
```

## Setup Frontend

```powershell
cd frontend
npm install
copy .env.example .env
npm run dev
```

Isi `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Frontend membaca URL API dari `VITE_API_BASE_URL`. Axios otomatis mengirim `Authorization: Bearer <token>` dari `localStorage` untuk request protected. Jika backend mengembalikan `401`, token dibersihkan dan user diarahkan ke `/login`.

## Deploy

Frontend Vercel/Netlify:

```env
VITE_API_BASE_URL=https://domain-backend-production.com
```

Backend Railway/Render:

```env
DATABASE_URL=postgresql+psycopg2://...
JWT_SECRET_KEY=secret-production
BACKEND_CORS_ORIGINS=https://domain-frontend-production.com
ENVIRONMENT=production
DEBUG=false
```

Start command backend:

```text
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

## Cek Koneksi FE-BE

1. Buka Swagger: `http://localhost:8000/docs`
2. Buka frontend: `http://localhost:5173`
3. Cek dari browser console frontend:

```js
fetch(`${window.__KMJ_API_BASE_URL__}/monitoring/health`).then((r) => r.json()).then(console.log)
```

Jika muncul error CORS, pastikan origin frontend ada di `BACKEND_CORS_ORIGINS`, misalnya `http://localhost:5173`, lalu restart backend.

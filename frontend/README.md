# Frontend Klinik Makmur Jaya

Frontend React + Vite + Tailwind CSS untuk Sistem E-Commerce Penjualan Obat Klinik Makmur Jaya.

## Environment

Buat file `.env` dari contoh:

```powershell
copy .env.example .env
```

Isi lokal:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Saat deploy di Vercel/Netlify, set environment variable:

```env
VITE_API_BASE_URL=https://domain-backend-production.com
```

Jangan hardcode URL API di source frontend. Semua request memakai Axios instance di `src/services/api.js`.

## Menjalankan Lokal

```powershell
npm install
npm start
```

Frontend berjalan di:

```text
http://localhost:5173
```

Alternatif Vite standar:

```powershell
npm run dev
```

## Integrasi API

- Base URL API dibaca dari `VITE_API_BASE_URL`.
- JWT disimpan di `localStorage`.
- Request protected otomatis memakai `Authorization: Bearer <token>`.
- Jika response API `401 Unauthorized`, token dan user lokal dihapus, lalu browser diarahkan ke `/login`.
- Dummy fallback data tetap tersedia untuk mode demo, tetapi hanya dipakai jika API error/tidak tersedia.

## Cek FE-BE

Pastikan backend berjalan di `http://localhost:8000`, lalu buka browser console dari frontend:

```js
fetch(`${window.__KMJ_API_BASE_URL__}/monitoring/health`).then((r) => r.json()).then(console.log)
```

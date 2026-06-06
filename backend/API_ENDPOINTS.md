# Dokumentasi Endpoint API

Base URL lokal:

```text
http://127.0.0.1:8000
```

Dokumentasi interaktif tersedia di:

```text
/docs
```

## Auth

| Method | Endpoint | Role |
| --- | --- | --- |
| POST | `/auth/register` | Public |
| POST | `/auth/login` | Public |
| POST | `/auth/logout` | Authenticated |
| POST | `/auth/verify-email` | Public |
| POST | `/auth/refresh` | Public |
| GET | `/auth/me` | Authenticated |

## Dashboard

| Method | Endpoint | Role |
| --- | --- | --- |
| GET | `/dashboard/admin` | Admin |
| GET | `/dashboard/pharmacist` | Apoteker |
| GET | `/dashboard/cashier` | Kasir |
| GET | `/dashboard/customer` | Pasien |

## Katalog Obat

| Method | Endpoint | Role |
| --- | --- | --- |
| GET | `/medicines` | Public |
| GET | `/medicines/search` | Public |
| GET | `/medicines/autocomplete` | Public |
| GET | `/medicines/{id}` | Public |
| POST | `/medicines` | Admin |
| PUT | `/medicines/{id}` | Admin |
| DELETE | `/medicines/{id}` | Admin |
| POST | `/medicines/{id}/images` | Admin |

## Master Data

| Method | Endpoint | Role |
| --- | --- | --- |
| GET | `/categories` | Public |
| POST | `/categories` | Admin |
| GET | `/suppliers` | Admin, Apoteker |
| POST | `/suppliers` | Admin |
| GET | `/customers` | Admin, Kasir |
| GET | `/transactions` | Admin, Kasir |

## Cart, Checkout, Orders

| Method | Endpoint | Role |
| --- | --- | --- |
| GET | `/cart` | Pasien |
| POST | `/cart/items` | Pasien |
| PUT | `/cart/items/{id}` | Pasien |
| DELETE | `/cart/items/{id}` | Pasien |
| POST | `/checkout` | Pasien |
| POST | `/payments/{order_id}/upload-proof` | Pasien |
| GET | `/orders/my` | Pasien |
| GET | `/orders/{id}` | Admin, Apoteker, Kasir, Pasien |

## Resep

| Method | Endpoint | Role |
| --- | --- | --- |
| POST | `/prescriptions/upload` | Pasien |
| GET | `/prescriptions/pending` | Apoteker |
| POST | `/prescriptions/{id}/approve` | Apoteker |
| POST | `/prescriptions/{id}/reject` | Apoteker |

## Stok dan Kasir

| Method | Endpoint | Role |
| --- | --- | --- |
| GET | `/stocks` | Admin, Apoteker, Kasir |
| POST | `/stocks/batches` | Admin, Apoteker |
| POST | `/stocks/adjustment` | Admin, Apoteker |
| GET | `/stocks/critical` | Admin, Apoteker, Kasir |
| GET | `/stocks/expired-soon` | Admin, Apoteker |
| POST | `/cashier/cart` | Kasir |
| POST | `/cashier/checkout` | Kasir |
| GET | `/cashier/transactions` | Kasir, Admin |

## Notifikasi, Error, Report, Import, Audit

| Method | Endpoint | Role |
| --- | --- | --- |
| GET | `/notifications` | Semua role |
| POST | `/notifications/mark-read` | Semua role |
| GET | `/alerts/stock` | Admin, Apoteker |
| GET | `/alerts/expired` | Admin, Apoteker |
| GET | `/error-logs` | Admin |
| POST | `/error-logs` | Admin |
| PUT | `/error-logs/{id}/resolve` | Admin |
| GET | `/reports/sales` | Admin, Kasir |
| GET | `/reports/best-selling` | Admin, Kasir |
| GET | `/reports/revenue` | Admin, Kasir |
| POST | `/reports/generate-pdf` | Admin |
| GET | `/reports/jobs/{id}` | Admin |
| POST | `/imports/medicines` | Admin |
| GET | `/imports/jobs/{id}` | Admin |
| GET | `/audit-logs` | Admin |

## Monitoring

| Method | Endpoint | Role |
| --- | --- | --- |
| GET | `/monitoring/health` | Public |
| GET | `/monitoring/resources` | Public |
| GET | `/monitoring/database` | Public |
| GET | `/monitoring/redis` | Public |

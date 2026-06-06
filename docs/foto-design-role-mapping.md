# Mapping Desain Stitch AI ke Role dan Route Frontend

| Folder desain | Role | Halaman frontend | Route |
| --- | --- | --- | --- |
| `dashboard_utama_admin_modern` | Admin | `DashboardPage` mode admin | `/admin/dashboard` |
| `manajemen_obat_stok` | Admin | `MedicinesManagement` | `/admin/medicines` |
| `manajemen_stok_obat_modern` | Admin, Apoteker | `StockManagement` | `/apoteker/stocks`, subfitur `/admin/medicines` |
| `manajemen_transaksi_penjualan` | Admin, Kasir | `TransactionsManagement` | `/admin/transactions`, `/kasir/transactions` |
| `manajemen_verifikasi_resep` | Admin | `PrescriptionsManagement` | `/admin/prescriptions` |
| `verifikasi_resep_modern` | Admin, Apoteker | `PrescriptionVerify` | `/admin/prescriptions/verify`, `/apoteker/prescriptions` |
| `laporan_analistik_penjualan` | Admin | `SalesReport` | `/admin/reports` |
| `sistem_log_panduan_pengguna` | Admin, Pasien | `HelpPage`, `AuditLogPage`, `ErrorLogDashboard` | `/admin/system`, `/pasien/help` |
| `dashboard_apoteker_modern` | Apoteker | `DashboardPage` mode apoteker | `/apoteker/dashboard` |
| `monitoring_kadaluarsa_modern` | Apoteker | `StockManagement` mode expired | `/apoteker/expired` |
| `pusat_notifikasi_apoteker` | Apoteker | `NotificationsPage` | `/apoteker/notifications` |
| `dashboard_kasir_desktop` | Kasir | `DashboardPage` mode kasir | `/kasir/dashboard` |
| `katalog_obat_modern_desktop` | Kasir | `CatalogPage` untuk pilih item transaksi | `/kasir/catalog` |
| `keranjang_belanja_kasir_desktop` | Kasir | `TransactionsManagement` dengan panel keranjang kanan | `/kasir/transactions` |
| `riwayat_transaksi_desktop` | Kasir | `TransactionsManagement` riwayat | `/kasir/history` |
| `dashboard_pasien_modern_hub` | Pasien | `DashboardPage` mode pasien | `/pasien/dashboard` |
| `katalog_obat_modern_desktop` | Pasien | `CatalogPage` | `/pasien/catalog` |
| `katalog_obat_3_kolom_dengan_tombol_detail` | Pasien | `CatalogPage` grid produk | `/pasien/catalog` |
| `detail_produk_desktop` | Pasien | `DetailObat` | `/pasien/products/:id` |
| `detail_produk_obat_desktop` | Pasien | `DetailObat` | `/pasien/products/:id` |
| `keranjang_belanja_desktop` | Pasien | `CartPage` via floating cart | `/pasien/cart` |
| `halaman_checkout_desktop` | Pasien | `CheckoutPage` | `/pasien/checkout` |
| `pesanan_saya_desktop` | Pasien | `OrdersPage` | `/pasien/orders` |
| `riwayat_pembelian_desktop` | Pasien | `OrdersPage` riwayat | `/pasien/history` |
| `pusat_bantuan_notifikasi_desktop` | Pasien | `HelpPage`, `NotificationBell` | `/pasien/help`, header |
| `pengaturan_pengguna_desktop` | Admin, Pasien | Profil/pengaturan header dan sistem | `/admin/system`, header profile |
| `clinical_vitality_system` | Semua | Design system global | Layout, warna, cards, spacing |
| `klinik_makmur_jaya_1` | Semua | Design system global | Layout, warna, cards, spacing |
| `klinik_makmur_jaya_2` | Semua | Design system global | Layout, warna, cards, spacing |

import {
  FiActivity,
  FiAlertCircle,
  FiBarChart2,
  FiBookOpen,
  FiBox,
  FiClipboard,
  FiDatabase,
  FiFileText,
  FiHelpCircle,
  FiHome,
  FiShoppingBag,
  FiSettings,
  FiUsers
} from "react-icons/fi";

export const roleDashboards = {
  admin: "/admin/dashboard",
  apoteker: "/apoteker/dashboard",
  kasir: "/kasir/dashboard",
  pasien: "/pasien/dashboard"
};

export const roleRoutes = {
  admin: ["/admin"],
  apoteker: ["/apoteker"],
  kasir: ["/kasir"],
  pasien: ["/pasien"]
};

export const roleMenus = {
  admin: [
    { label: "Dashboard", path: "/admin/dashboard", icon: FiHome, design: "dashboard_utama_admin_modern" },
    { label: "User", path: "/admin/users", icon: FiUsers, design: "daftar_user_admin" },
    { label: "Manajemen Obat", path: "/admin/medicines", icon: FiBox, design: "manajemen_obat_stok" },
    { label: "Supplier", path: "/admin/suppliers", icon: FiDatabase, design: "manajemen_supplier_obat" },
    { label: "Transaksi", path: "/admin/transactions", icon: FiClipboard, design: "manajemen_transaksi_penjualan" },
    { label: "Pembayaran", path: "/admin/payments", icon: FiBookOpen, design: "verifikasi_bukti_pembayaran" },
    { label: "Resep", path: "/admin/prescriptions", icon: FiFileText, design: "manajemen_verifikasi_resep" },
    { label: "Laporan", path: "/admin/reports", icon: FiBarChart2, design: "laporan_analistik_penjualan" },
    { label: "Sistem", path: "/admin/system", icon: FiSettings, design: "sistem_log_panduan_pengguna" }
  ],
  apoteker: [
    { label: "Dashboard", path: "/apoteker/dashboard", icon: FiHome, design: "dashboard_apoteker_modern" },
    { label: "Verifikasi Resep", path: "/apoteker/prescriptions", icon: FiActivity, design: "verifikasi_resep_modern" },
    { label: "Stok Obat", path: "/apoteker/stocks", icon: FiDatabase, design: "manajemen_stok_obat_modern" },
    { label: "Kadaluarsa", path: "/apoteker/expired", icon: FiAlertCircle, design: "monitoring_kadaluarsa_modern" }
  ],
  kasir: [
    { label: "Dashboard", path: "/kasir/dashboard", icon: FiHome, design: "dashboard_kasir_desktop" },
    { label: "Transaksi Kasir", path: "/kasir/transactions", icon: FiClipboard, design: "keranjang_belanja_kasir_desktop" },
    { label: "Riwayat Transaksi", path: "/kasir/history", icon: FiActivity, design: "riwayat_transaksi_desktop" }
  ],
  pasien: [
    { label: "Dashboard", path: "/pasien/dashboard", icon: FiHome, design: "dashboard_pasien_modern_hub" },
    { label: "Katalog Obat", path: "/pasien/catalog", icon: FiShoppingBag, design: "katalog_obat_modern_desktop" },
    { label: "Pesanan Saya", path: "/pasien/orders", icon: FiClipboard, design: "pesanan_saya_desktop" },
    { label: "Riwayat Pembelian", path: "/pasien/history", icon: FiActivity, design: "riwayat_pembelian_desktop" },
    { label: "Bantuan", path: "/pasien/help", icon: FiHelpCircle, design: "pusat_bantuan_notifikasi_desktop" }
  ]
};

export const getRoleMenu = (role) => roleMenus[role] || [];

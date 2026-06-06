import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import { Login, Register, VerifyEmail } from "../pages/AuthPages";
import DashboardPage from "../pages/DashboardPage";
import { CatalogPage, DetailObat, UploadPrescription } from "../pages/CatalogPages";
import { CartPage, CheckoutPage, CheckoutSuccessPage, OrderDetail, OrdersPage, PaymentPage } from "../pages/CartCheckoutOrders";
import { MedicinesManagement, PrescriptionsManagement, SimpleManagement, StockManagement, TransactionsManagement } from "../pages/ManagementPages";
import PrescriptionVerify from "../pages/PrescriptionVerify";
import { AuditLogPage, ErrorLogDashboard, HelpPage, ImportPage, MonitoringPage, SalesReport } from "../pages/LogsReportsHelp";
import ProtectedRoute from "./ProtectedRoute";
import { roleDashboards } from "../config/roleMenus";
import { authStorage } from "../utils/storage";

function LegacyRedirect() {
  const user = authStorage.getUser();
  return <Navigate to={roleDashboards[user?.role] || "/login"} replace />;
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LegacyRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/admin/dashboard" element={<DashboardPage roleOverride="admin" />} />
            <Route path="/admin/medicines" element={<MedicinesManagement />} />
            <Route path="/admin/medicines/:id" element={<DetailObat catalogPath="/admin/medicines" showBatchDetails showPurchaseActions={false} />} />
            <Route path="/admin/medicines/categories" element={<SimpleManagement type="categories" title="Manajemen Kategori" subtitle="Kelola kategori produk obat." />} />
            <Route path="/admin/medicines/suppliers" element={<SimpleManagement type="suppliers" title="Manajemen Supplier" subtitle="Kelola distributor dan supplier obat." />} />
            <Route path="/admin/medicines/imports" element={<ImportPage />} />
            <Route path="/admin/transactions" element={<TransactionsManagement title="Manajemen Transaksi" subtitle="Kelola transaksi penjualan, pembayaran, pelanggan, dan invoice." />} />
            <Route path="/admin/transactions/customers" element={<SimpleManagement type="customers" title="Manajemen Pelanggan" subtitle="Data pelanggan dan pasien e-commerce." />} />
            <Route path="/admin/prescriptions" element={<PrescriptionsManagement />} />
            <Route path="/admin/prescriptions/verify" element={<PrescriptionVerify />} />
            <Route path="/admin/reports" element={<SalesReport />} />
            <Route path="/admin/system" element={<HelpPage type="system" />} />
            <Route path="/admin/system/audit" element={<AuditLogPage />} />
            <Route path="/admin/system/errors" element={<ErrorLogDashboard />} />
            <Route path="/admin/system/monitoring" element={<MonitoringPage />} />

            <Route path="/apoteker/dashboard" element={<DashboardPage roleOverride="apoteker" />} />
            <Route path="/apoteker/prescriptions" element={<PrescriptionVerify />} />
            <Route path="/apoteker/stocks" element={<StockManagement />} />
            <Route path="/apoteker/expired" element={<StockManagement mode="expired" />} />

            <Route path="/kasir/dashboard" element={<DashboardPage roleOverride="kasir" />} />
            <Route path="/kasir/catalog" element={<CatalogPage basePath="/kasir/products" cartPath="/kasir/transactions" />} />
            <Route path="/kasir/products/:id" element={<DetailObat cartPath="/kasir/transactions" catalogPath="/kasir/catalog" />} />
            <Route path="/kasir/transactions" element={<TransactionsManagement title="Transaksi Kasir" subtitle="POS kasir dengan panel keranjang transaksi." cashierMode />} />
            <Route path="/kasir/history" element={<TransactionsManagement title="Riwayat Transaksi" subtitle="Riwayat transaksi kasir dan penjualan apotek." />} />

            <Route path="/pasien/dashboard" element={<DashboardPage roleOverride="pasien" />} />
            <Route path="/pasien/catalog" element={<CatalogPage />} />
            <Route path="/pasien/products/:id" element={<DetailObat catalogPath="/pasien/catalog" />} />
            <Route path="/pasien/prescriptions/upload" element={<UploadPrescription />} />
            <Route path="/pasien/cart" element={<CartPage />} />
            <Route path="/pasien/checkout" element={<CheckoutPage />} />
            <Route path="/pasien/checkout/success/:id" element={<CheckoutSuccessPage />} />
            <Route path="/pasien/orders" element={<OrdersPage />} />
            <Route path="/pasien/orders/:id" element={<OrderDetail />} />
            <Route path="/pasien/orders/:id/payment" element={<PaymentPage />} />
            <Route path="/pasien/history" element={<OrdersPage title="Riwayat Pembelian" subtitle="Kelola dan pantau semua transaksi kesehatan Anda." />} />
            <Route path="/pasien/help" element={<HelpPage type="faq" />} />

            <Route path="/dashboard/:role" element={<LegacyRedirect />} />
            <Route path="/catalog/*" element={<LegacyRedirect />} />
            <Route path="/cart" element={<LegacyRedirect />} />
            <Route path="/checkout" element={<LegacyRedirect />} />
            <Route path="/orders/*" element={<LegacyRedirect />} />
            <Route path="/purchase-history" element={<LegacyRedirect />} />
            <Route path="/cashier/*" element={<LegacyRedirect />} />
            <Route path="/management/*" element={<LegacyRedirect />} />
            <Route path="/prescriptions/*" element={<LegacyRedirect />} />
            <Route path="/stock" element={<LegacyRedirect />} />
            <Route path="/alerts/*" element={<LegacyRedirect />} />
            <Route path="/notifications" element={<LegacyRedirect />} />
            <Route path="/logs/*" element={<LegacyRedirect />} />
            <Route path="/reports/*" element={<LegacyRedirect />} />
            <Route path="/system" element={<LegacyRedirect />} />
            <Route path="/imports" element={<LegacyRedirect />} />
            <Route path="/help/*" element={<LegacyRedirect />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

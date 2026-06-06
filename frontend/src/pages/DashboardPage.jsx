import { useEffect, useState } from "react";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiDatabase,
  FiFileText,
  FiHeadphones,
  FiHeart,
  FiPackage,
  FiSearch,
  FiShoppingBag,
  FiShoppingCart,
  FiTrendingUp
} from "react-icons/fi";
import { Link, useParams } from "react-router-dom";
import ChartCard from "../components/ChartCard";
import DataTable from "../components/DataTable";
import StatCard from "../components/StatCard";
import EmptyState from "../components/EmptyState";
import { Toast } from "../components/Toast";
import { dashboardService } from "../services/dashboardService";
import { medicineService } from "../services/medicineService";
import { authStorage, normalizeList, rupiah } from "../utils/storage";
import PageHeader from "./PageHeader";

export default function DashboardPage({ roleOverride }) {
  const { role: routeRole = "admin" } = useParams();
  const role = roleOverride || routeRole;
  const [data, setData] = useState(null);

  useEffect(() => {
    dashboardService.get(role)
      .then(setData)
      .catch((error) => {
        setData({});
        Toast.error(error?.response?.data?.detail || error?.message || "Dashboard gagal dimuat");
      });
  }, [role]);

  if (role === "pasien") return <PatientDashboard data={data} />;
  if (role === "apoteker") return <PharmacistDashboard data={data} />;
  if (role === "kasir") return <CashierDashboard data={data} />;
  return <AdminDashboard data={data} />;
}

const transactionColumns = [
  { key: "order_number", label: "ID Transaksi" },
  { key: "patient_id", label: "Pasien" },
  { key: "total_amount", label: "Total", render: (row) => rupiah(row.total_amount) },
  { key: "status", label: "Status", type: "badge" }
];

function AdminDashboard({ data }) {
  return (
    <>
      <PageHeader title="Dashboard Utama" subtitle="Pusat kendali operasional Klinik Makmur Jaya." action={<Link className="btn-primary" to="/admin/reports"><FiTrendingUp /> Lihat Laporan</Link>} />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={FiCreditCard} label="Pendapatan Hari Ini" value={rupiah(data?.revenue)} trend="Hari ini" />
        <StatCard icon={FiTrendingUp} label="Transaksi Hari Ini" value={data?.transaction_count || 0} />
        <StatCard icon={FiAlertTriangle} label="Stok Kritis" value={`${data?.critical_stock || 0} Item`} danger />
        <StatCard icon={FiFileText} label="Resep Pending" value={data?.new_orders || 0} trend="Review" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2"><ChartCard title="Tren Penjualan Mingguan" subtitle="Performa penjualan dan transaksi klinik" data={data?.chart || []} /></div>
        <RoleActionPanel title="Kontrol Admin" items={[
          { label: "Manajemen Obat", to: "/admin/medicines", icon: FiPackage },
          { label: "Transaksi", to: "/admin/transactions", icon: FiCreditCard },
          { label: "Resep", to: "/admin/prescriptions", icon: FiFileText },
          { label: "Sistem", to: "/admin/system", icon: FiDatabase }
        ]} />
      </div>
      <div className="mt-6">
        <DataTable columns={transactionColumns} rows={data?.latest_transactions || []} />
      </div>
    </>
  );
}

function PharmacistDashboard({ data }) {
  return (
    <>
      <PageHeader title="Dashboard Apoteker" subtitle="Pantau resep, stok obat, dan kadaluarsa klinis." action={<Link className="btn-primary" to="/apoteker/prescriptions"><FiFileText /> Verifikasi Resep</Link>} />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={FiFileText} label="Resep Pending" value={data?.pending_prescriptions || 0} trend="Review" />
        <StatCard icon={FiDatabase} label="Jenis Obat Aktif" value={`${data?.total_medicines || 0} Item`} />
        <StatCard icon={FiAlertTriangle} label="Stok Kritis" value={`${data?.critical_stock || 0} Item`} danger />
        <StatCard icon={FiClock} label="Kadaluarsa Dekat" value={data?.expired_soon || 0} danger />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <RoleActionPanel title="Tugas Apoteker" items={[
          { label: "Verifikasi Resep", to: "/apoteker/prescriptions", icon: FiFileText },
          { label: "Stok Obat", to: "/apoteker/stocks", icon: FiDatabase },
          { label: "Monitoring Kadaluarsa", to: "/apoteker/expired", icon: FiClock }
        ]} />
        <div className="glass-card p-6 xl:col-span-2">
          <h3 className="mb-5 text-xl font-extrabold text-primary">Antrean Klinis</h3>
          {(data?.pending_items || []).map((item) => (
            <div key={item.id} className="flex items-center justify-between border-b border-outline/40 py-4 last:border-0">
              <div>
                <p className="font-extrabold text-ink">Resep {item.prescription_number || item.id}</p>
                <p className="text-sm text-muted">Order: {item.order_id}</p>
              </div>
              <Link className="btn-secondary px-4 py-2" to="/apoteker/prescriptions">Buka</Link>
            </div>
          ))}
          {!data?.pending_items?.length && <p className="py-8 text-center text-sm text-muted">Tidak ada resep yang menunggu verifikasi.</p>}
        </div>
      </div>
    </>
  );
}

function CashierDashboard({ data }) {
  return (
    <>
      <PageHeader title="Dashboard Kasir" subtitle="Transaksi cepat, keranjang kasir, dan riwayat pembayaran." action={<Link className="btn-primary" to="/kasir/transactions"><FiShoppingCart /> Buka Keranjang</Link>} />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={FiCreditCard} label="Penjualan Hari Ini" value={rupiah(data?.sales_today || data?.revenue)} trend="Kasir" />
        <StatCard icon={FiTrendingUp} label="Transaksi Kasir" value={data?.transactions_today || 0} />
        <StatCard icon={FiCheckCircle} label="Selesai Hari Ini" value={data?.completed_today || 0} />
        <StatCard icon={FiDatabase} label="Status Kasir" value={data?.counter_status || "-"} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <RoleActionPanel title="Aksi Kasir" items={[
          { label: "Transaksi Kasir", to: "/kasir/transactions", icon: FiCreditCard },
          { label: "Keranjang", to: "/kasir/transactions", icon: FiShoppingCart },
          { label: "Riwayat Transaksi", to: "/kasir/history", icon: FiClock }
        ]} />
        <div className="xl:col-span-2">
          <DataTable columns={transactionColumns} rows={data?.latest_transactions || []} />
        </div>
      </div>
    </>
  );
}

function RoleActionPanel({ title, items }) {
  return (
    <div className="glass-card p-6">
      <h3 className="mb-5 text-xl font-extrabold text-primary">{title}</h3>
      <div className="grid gap-3">
        {items.map(({ label, to, icon: Icon }) => (
          <Link key={label} to={to} className="flex items-center gap-4 rounded-2xl bg-surface-low p-4 font-extrabold text-primary transition hover:bg-surface-high">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white"><Icon /></span>
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function PatientDashboard({ data }) {
  const user = authStorage.getUser();
  const firstName = user?.name?.split(" ")?.[0] || "Pasien";
  const [products, setProducts] = useState([]);
  const activeOrders = data?.active_orders || 0;
  const completedOrders = data?.completed_orders || 0;
  const totalSpent = data?.total_spent || 0;
  const latestOrder = data?.latest_order || data?.latest_transactions?.[0];

  useEffect(() => {
    medicineService.list()
      .then((payload) => setProducts(normalizeList(payload).slice(0, 5)))
      .catch(() => setProducts([]));
  }, []);

  const quickActions = [
    { title: "Catalog", description: "Browse medicines and equipment", icon: FiShoppingBag, to: "/pasien/catalog" },
    { title: "Prescriptions", description: "Upload and manage your scripts", icon: FiFileText, to: "/pasien/orders" },
    { title: "Health Tips", description: "Daily wellness and recovery guides", icon: FiHeart, to: "/pasien/help" },
    { title: "Support", description: "Talk to our medical concierge", icon: FiHeadphones, to: "/pasien/help" }
  ];

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-[2rem] bg-primary px-6 py-10 text-white shadow-soft sm:px-10 lg:min-h-[320px] lg:px-12">
        <img
          className="absolute inset-0 h-full w-full object-cover opacity-25"
          src="https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1600&q=80"
          alt="Interior klinik modern"
        />
        <div className="relative z-10 max-w-3xl">
          <h1 className="max-w-2xl text-4xl font-extrabold leading-tight sm:text-5xl">
            Hello, {firstName}! How can we help you today?
          </h1>
          <div className="mt-8 flex max-w-3xl flex-col gap-3 rounded-full bg-white/80 p-2 text-primary shadow-soft backdrop-blur-xl sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3 px-4">
              <FiSearch className="shrink-0" />
              <input className="w-full border-0 bg-transparent py-3 text-sm outline-none placeholder:text-primary/60 focus:ring-0" placeholder="Search for healthcare products..." />
            </div>
            <Link className="btn-primary px-8" to="/pasien/catalog">Search</Link>
          </div>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-3">
        <PatientStat icon={FiPackage} label="Pesanan Aktif" value={String(activeOrders).padStart(2, "0")} note="pesanan" />
        <PatientStat icon={FiCheckCircle} label="Pesanan Selesai" value={completedOrders} note="total" />
        <PatientStat icon={FiCreditCard} label="Total Belanja" value={rupiah(totalSpent)} note="selesai" />
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="grid gap-6 sm:grid-cols-2 xl:col-span-7">
          {quickActions.map(({ title, description, icon: Icon, to }) => (
            <Link key={title} to={to} className="rounded-[2rem] bg-white p-8 shadow-soft transition hover:-translate-y-1 hover:bg-secondary-soft/40">
              <Icon className="mb-5 text-primary" size={38} />
              <h3 className="text-2xl font-extrabold text-primary">{title}</h3>
              <p className="mt-2 max-w-xs text-muted">{description}</p>
            </Link>
          ))}
        </div>

        {latestOrder ? (
          <section className="rounded-[2rem] border-t-4 border-primary bg-white p-8 shadow-soft xl:col-span-5">
            <div className="mb-8 flex items-start justify-between gap-4">
              <h3 className="text-2xl font-extrabold text-primary">Pesanan Terbaru</h3>
              <span className="text-sm font-semibold text-muted">#{latestOrder.order_number}</span>
            </div>
            <div className="rounded-2xl bg-surface-low p-5">
              <p className="text-xs font-extrabold uppercase text-muted">Status</p>
              <p className="mt-2 text-xl font-extrabold text-primary">{String(latestOrder.status || "-").replaceAll("_", " ")}</p>
              <p className="mt-3 text-sm text-muted">Total pesanan</p>
              <p className="text-2xl font-extrabold text-primary">{rupiah(latestOrder.total_amount)}</p>
            </div>
            <Link className="btn-secondary mt-8 w-full" to={`/pasien/orders/${latestOrder.id}`}>Lihat Detail Pesanan</Link>
          </section>
        ) : (
          <div className="xl:col-span-5"><EmptyState title="Belum ada pesanan" description="Pesanan terbaru akan tampil setelah Anda melakukan checkout." /></div>
        )}
      </div>

      <section>
        <div className="mb-6">
          <h2 className="text-3xl font-extrabold text-primary">Recommended for You</h2>
          <p className="text-muted">Based on your recent health profile and purchases</p>
        </div>
        <div className="flex gap-6 overflow-x-auto pb-4">
          {products.map((product) => (
            <div key={product.id} className="min-w-[280px] overflow-hidden rounded-[2rem] bg-white shadow-soft">
              <img className="h-40 w-full object-cover" src={product.image_url} alt={product.name} />
              <div className="p-6">
                <span className="rounded-full bg-secondary-soft px-3 py-1 text-xs font-bold text-secondary">{product.category_name || "Wellness"}</span>
                <h3 className="mt-3 font-extrabold text-primary">{product.name}</h3>
                <p className="text-sm text-muted">{product.sku || "Healthcare product"}</p>
                <div className="mt-5 flex items-center justify-between">
                  <span className="font-extrabold text-primary">{rupiah(product.selling_price)}</span>
                  <Link className="icon-btn" to={`/pasien/products/${product.id}`}><FiShoppingCart /></Link>
                </div>
              </div>
            </div>
          ))}
          {!products.length && <p className="text-sm text-muted">Belum ada produk aktif dari database.</p>}
        </div>
      </section>
    </div>
  );
}

function PatientStat({ icon: Icon, label, value, note, badge, action }) {
  return (
    <div className="rounded-[2rem] bg-white p-8 shadow-soft transition hover:-translate-y-1">
      <div className="mb-5 flex items-start justify-between">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-secondary-soft text-secondary">
          <Icon size={22} />
        </div>
        {badge && <span className="rounded-full bg-tertiary-fixed px-3 py-1 text-xs font-bold text-primary">{badge}</span>}
        {action && <span className="text-sm font-extrabold text-primary">{action}</span>}
      </div>
      <p className="text-xs font-extrabold uppercase tracking-wide text-muted">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-extrabold text-primary">{value}</span>
        <span className="text-sm font-bold text-ink">{note}</span>
      </div>
    </div>
  );
}

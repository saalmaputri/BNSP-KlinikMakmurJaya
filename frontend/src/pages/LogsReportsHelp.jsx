import { useEffect, useMemo, useState } from "react";
import { FiActivity, FiCalendar, FiClock, FiDatabase, FiDownload, FiFilter, FiGlobe, FiPackage, FiSearch, FiShield, FiUpload, FiUser } from "react-icons/fi";
import { Link } from "react-router-dom";
import ChartCard from "../components/ChartCard";
import DataTable from "../components/DataTable";
import UploadPreview from "../components/UploadPreview";
import { Toast } from "../components/Toast";
import { auditLogService } from "../services/auditLogService";
import { errorLogService } from "../services/errorLogService";
import { importService } from "../services/importService";
import { monitoringService } from "../services/monitoringService";
import { reportService } from "../services/reportService";
import { normalizeList, rupiah } from "../utils/storage";
import PageHeader from "./PageHeader";

export function ErrorLogDashboard() {
  const [rows, setRows] = useState([]);
  const load = () => errorLogService.list().then((data) => setRows(normalizeList(data))).catch((error) => Toast.error(error?.response?.data?.message || "Gagal memuat error log"));
  useEffect(() => { load(); }, []);
  const resolveLog = async (row) => {
    await errorLogService.resolve(row.id);
    await load();
    Toast.success("Error log ditandai resolved");
  };
  return <><PageHeader title="Error Log Dashboard" subtitle="Pantau error backend, level, dan status resolve." /><DataTable rows={rows} columns={[{ key: "path", label: "Path" }, { key: "message", label: "Message" }, { key: "level", label: "Level", type: "badge" }, { key: "status", label: "Status", type: "badge" }, { key: "created_at", label: "Waktu" }]} onEdit={resolveLog} /></>;
}

export function AuditLogPage() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");

  useEffect(() => {
    auditLogService
      .list()
      .then((data) => setRows(normalizeAuditLogs(data)))
      .catch((error) => Toast.error(error?.response?.data?.message || "Gagal memuat audit log"));
  }, []);

  const roles = uniqueValues(rows.map((row) => row.role));
  const entities = uniqueValues(rows.map((row) => row.entity));
  const filteredRows = rows.filter((row) => {
    const text = `${row.actor} ${row.role} ${row.action} ${row.entity} ${row.entity_id} ${row.ip} ${row.request_id}`.toLowerCase();
    const matchesQuery = !query || text.includes(query.toLowerCase());
    const matchesRole = roleFilter === "all" || row.role === roleFilter;
    const matchesEntity = entityFilter === "all" || row.entity === entityFilter;
    return matchesQuery && matchesRole && matchesEntity;
  });

  const exportCsv = () => {
    const header = ["id", "actor", "role", "action", "entity", "entity_id", "ip", "created_at"];
    const csv = [
      header.join(","),
      ...filteredRows.map((row) => header.map((key) => `"${String(row[key] ?? "").replaceAll("\"", "\"\"")}"`).join(","))
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="Audit Log"
        subtitle="Jejak aktivitas pengguna, perubahan entity, IP, dan request backend."
        action={<button className="btn-secondary" onClick={exportCsv}><FiDownload /> Export CSV</button>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AuditSummary icon={FiActivity} label="Total Aktivitas" value={rows.length} note="100 log terbaru dari backend" />
        <AuditSummary icon={FiShield} label="Role Terlibat" value={roles.length} note={roles.slice(0, 3).join(", ") || "Belum ada role"} />
        <AuditSummary icon={FiDatabase} label="Entity Diubah" value={entities.length} note={entities.slice(0, 3).join(", ") || "Belum ada entity"} />
        <AuditSummary icon={FiGlobe} label="IP Unik" value={uniqueValues(rows.map((row) => row.ip)).length} note="Sumber request terekam" />
      </div>

      <section className="glass-card mt-6 p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative flex-1">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="field pl-11"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari user, action, entity, IP, request ID..."
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <AuditSelect label="Role" value={roleFilter} onChange={setRoleFilter} options={roles} />
            <AuditSelect label="Entity" value={entityFilter} onChange={setEntityFilter} options={entities} />
          </div>
        </div>
      </section>

      <section className="mt-6 space-y-4">
        {filteredRows.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-lg font-extrabold text-primary">Tidak ada audit log yang cocok</p>
            <p className="mt-2 text-sm text-muted">Ubah keyword atau filter untuk melihat aktivitas lain.</p>
          </div>
        ) : filteredRows.map((row) => <AuditLogItem key={row.id || `${row.action}-${row.created_at}`} row={row} />)}
      </section>
    </>
  );
}

function AuditSummary({ icon: Icon, label, value, note }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-muted">{label}</p>
          <p className="mt-2 text-3xl font-extrabold text-primary">{value}</p>
        </div>
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary-soft text-xl text-primary">
          <Icon />
        </div>
      </div>
      <p className="mt-4 line-clamp-1 text-sm font-semibold text-muted">{note}</p>
    </div>
  );
}

function AuditSelect({ label, value, onChange, options }) {
  return (
    <label className="relative min-w-44">
      <FiFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
      <select className="field pl-11" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="all">Semua {label}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function AuditLogItem({ row }) {
  const roleTone = getRoleTone(row.role);
  return (
    <article className="glass-card overflow-hidden">
      <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-lg text-white">
            <FiUser />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${roleTone}`}>{row.role}</span>
              <span className="rounded-full bg-surface-low px-3 py-1 text-xs font-bold text-muted">{formatDate(row.created_at)}</span>
            </div>
            <h3 className="mt-3 text-lg font-extrabold text-primary">{row.action}</h3>
            <p className="mt-1 text-sm text-muted">
              {row.actor} mengakses <b className="text-ink">{row.entity}</b>{row.entity_id ? ` #${row.entity_id}` : ""}.
            </p>
          </div>
        </div>
        <div className="rounded-2xl bg-surface-low px-4 py-3 text-sm font-semibold text-muted lg:min-w-72">
          <p>IP: <span className="text-primary">{row.ip}</span></p>
          <p className="mt-1 truncate">Request: <span className="text-primary">{row.request_id}</span></p>
        </div>
      </div>

      {(row.old_values || row.new_values || row.user_agent) && (
        <div className="grid gap-4 border-t border-outline/60 bg-surface-low/60 p-5 lg:grid-cols-3">
          <AuditValue title="Sebelum" value={row.old_values} />
          <AuditValue title="Sesudah" value={row.new_values} />
          <div className="rounded-2xl bg-white p-4">
            <p className="text-xs font-extrabold uppercase tracking-wide text-muted">User Agent</p>
            <p className="mt-2 line-clamp-3 text-sm font-semibold text-primary">{row.user_agent || "-"}</p>
          </div>
        </div>
      )}
    </article>
  );
}

function AuditValue({ title, value }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <p className="text-xs font-extrabold uppercase tracking-wide text-muted">{title}</p>
      <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap text-xs font-semibold leading-relaxed text-primary">{formatAuditValue(value)}</pre>
    </div>
  );
}

function normalizeAuditLogs(payload) {
  return normalizeList(payload).map((row) => ({
    id: row.id,
    actor: row.actor || row.user_name || (row.user_id ? `User #${row.user_id}` : "System"),
    role: String(row.role_code || row.role || "system").toLowerCase(),
    action: row.action || "Aktivitas sistem",
    entity: row.entity_name || row.module || row.entity || "-",
    entity_id: row.entity_id,
    ip: row.ip_address || row.ip || "-",
    user_agent: row.user_agent || "",
    request_id: row.request_id || "-",
    old_values: row.old_values,
    new_values: row.new_values,
    created_at: row.created_at || row.time || row.date
  }));
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean).map(String))];
}

function formatAuditValue(value) {
  if (!value) return "-";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function getRoleTone(role) {
  const tones = {
    admin: "bg-primary text-white",
    apoteker: "bg-secondary-soft text-primary",
    pharmacist: "bg-secondary-soft text-primary",
    kasir: "bg-tertiary-fixed text-primary",
    cashier: "bg-tertiary-fixed text-primary",
    pasien: "bg-success-soft text-success",
    customer: "bg-success-soft text-success"
  };
  return tones[role] || "bg-surface-high text-primary";
}

export function SalesReport() {
  const [periodPreset, setPeriodPreset] = useState("3m");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [range, setRange] = useState(getRange("3m"));
  const [salesData, setSalesData] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [bestSellingData, setBestSellingData] = useState([]);

  useEffect(() => {
    const nextRange = getRange(periodPreset);
    setRange(nextRange);
    Promise.all([
      reportService.sales(nextRange),
      reportService.revenue(nextRange),
      reportService.bestSelling()
    ])
      .then(([salesRows, revenueRows, bestRows]) => {
        setSalesData(Array.isArray(salesRows) ? salesRows : []);
        setRevenueData(Array.isArray(revenueRows) ? revenueRows : []);
        setBestSellingData(normalizeList(bestRows));
      })
      .catch((error) => Toast.error(error?.response?.data?.message || "Gagal memuat laporan"));
  }, [periodPreset]);

  const updatePreset = (value) => {
    setPeriodPreset(value);
  };

  const exportPdf = async () => {
    try {
      const currentRange = getRange(periodPreset);
      await reportService.generatePdf(currentRange);
      Toast.success("Job export PDF dibuat di backend");
    } catch (error) {
      Toast.error(error?.response?.data?.message || error?.message || "Gagal membuat job PDF");
    }
  };
  const bestSellingRows = useMemo(() => {
    return normalizeList(bestSellingData)
      .filter((row) => {
        const text = `${row.name || row.medicine_name || ""} ${row.sku || ""}`.toLowerCase();
        const matchesQuery = !query || text.includes(query.toLowerCase());
        const matchesCategory = category === "all" || category === "medicine";
        return matchesQuery && matchesCategory;
      })
      .slice(0, 8);
  }, [bestSellingData, query, category]);

  const chartRows = useMemo(() => {
    return revenueData.map((row) => ({
      name: formatPeriod(row.period),
      sales: Number(row.gross_sales || 0),
      orders: Number(row.total_orders || 0)
    }));
  }, [revenueData]);

  const grossSales = salesData.reduce((sum, row) => sum + Number(row.gross_sales || 0), 0);
  const verifiedSales = salesData.reduce((sum, row) => sum + Number(row.paid_sales || 0), 0);
  const totalOrders = salesData.reduce((sum, row) => sum + Number(row.total_orders || 0), 0);
  const monthlyGrossSales = revenueData.reduce((sum, row) => sum + Number(row.gross_sales || 0), 0);
  const growth = calcGrowth(revenueData);
  const maxBest = Math.max(...bestSellingRows.map((item) => Number(item.total_sold || 0)), 1);

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-5xl font-extrabold tracking-tight text-primary">Laporan Penjualan</h2>
          <p className="mt-2 text-lg text-muted">Analisis pendapatan dan performa inventaris klinik.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-outline/40 bg-white px-4 py-3 text-sm font-semibold text-muted">
            <FiCalendar className="text-primary" />
            <span>{periodLabel(range.start_date, range.end_date)}</span>
          </div>
          <button type="button" className="btn-primary px-8 py-4 text-base" onClick={exportPdf}>
            <FiDownload /> Export PDF Laporan
          </button>
        </div>
      </div>
      <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-transparent bg-white/0 xl:flex-row xl:items-center">
        <label className="relative flex-1">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="field h-14 rounded-full border-0 bg-surface-low pl-12"
            placeholder="Cari laporan..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <select className="field h-14 rounded-full border-0 bg-surface-low px-5" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">Semua Kategori</option>
            <option value="medicine">Obat-obatan</option>
          </select>
          <select className="field h-14 rounded-full border-0 bg-surface-low px-5" value={periodPreset} onChange={(event) => updatePreset(event.target.value)}>
            <option value="3m">Periode: 3 Bulan Terakhir</option>
            <option value="1m">Bulan Ini</option>
            <option value="12m">Tahun Ini</option>
          </select>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <div className="glass-card rounded-3xl p-6">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-muted">Total Pendapatan</p>
                <h3 className="mt-2 text-3xl font-extrabold text-primary">{rupiah(grossSales)}</h3>
              </div>
              <div className="flex gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span className="h-2 w-2 rounded-full bg-outline/40" />
              </div>
            </div>
            <div className="h-[360px]">
              <ChartCard
                data={chartRows}
                type="bar"
                valueKey="sales"
                tooltipFormatter={(value) => rupiah(value)}
                yAxisFormatter={(value) => `${Math.round(Number(value || 0) / 1000000)}jt`}
                hideHeader
                className="border-0 bg-transparent p-0 shadow-none"
                chartHeight="h-[320px]"
              />
            </div>
          </div>
        </div>
        <div className="space-y-6 xl:col-span-4">
          <StatBox
            label="Pertumbuhan Pendapatan"
            value={`${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%`}
            tone="success"
            icon={FiActivity}
          />
          <StatBox
            label="Transaksi Baru"
            value={totalOrders.toLocaleString("id-ID")}
            tone="primary"
            icon={FiDatabase}
          />
          <StatBox
            label="Pendapatan Terverifikasi"
            value={rupiah(verifiedSales)}
            tone="secondary"
            icon={FiClock}
          />
        </div>

        <div className="glass-card overflow-hidden xl:col-span-7">
          <div className="flex items-center justify-between border-b border-outline/40 px-6 py-5">
            <div>
              <h3 className="text-2xl font-extrabold text-primary">Obat Terlaris</h3>
              <p className="text-sm text-muted">Jumlah item yang benar-benar terjual.</p>
            </div>
          </div>
          <div className="space-y-5 p-6">
            {bestSellingRows.map((item, index) => {
              const qty = Number(item.total_sold || 0);
              const pct = Math.max(6, Math.round((qty / maxBest) * 100));
              const colors = ["#003f87", "#006e25", "#973d00"];
              return (
                <div key={item.id || item.sku || item.name || index} className="flex items-center gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
                    <FiPackage />
                  </div>
                  <div className="flex-1">
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <span className="font-semibold text-primary">{String(item.name || item.medicine_name || "-")}</span>
                      <span className="text-sm font-semibold text-muted">{qty.toLocaleString("id-ID")} terjual</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-low">
                      <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: colors[index % colors.length] }} />
                    </div>
                  </div>
                </div>
              );
            })}
            {!bestSellingRows.length && <p className="text-sm text-muted">Belum ada data obat terlaris.</p>}
          </div>
        </div>

        <div className="glass-card overflow-hidden xl:col-span-5">
          <div className="flex items-center justify-between border-b border-outline/40 px-6 py-5">
            <div>
              <h3 className="text-2xl font-extrabold text-primary">Ringkasan Analitik</h3>
              <p className="text-sm text-muted">Metrik penting dari backend laporan.</p>
            </div>
          </div>
          <div className="grid gap-3 p-6">
            <MiniMetric label="Revenue Bulanan" value={rupiah(monthlyGrossSales)} />
            <MiniMetric label="Pertumbuhan Pendapatan" value={`${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%`} />
            <MiniMetric label="Transaksi Baru" value={totalOrders.toLocaleString("id-ID")} />
            <MiniMetric label="Pendapatan Terverifikasi" value={rupiah(verifiedSales)} />
          </div>
        </div>
      </div>
    </>
  );
}

function StatBox({ label, value, tone = "primary", icon: Icon }) {
  const tones = {
    primary: "border-primary text-primary bg-primary-soft/20",
    success: "border-secondary text-secondary bg-secondary-soft/20",
    secondary: "border-tertiary text-tertiary bg-tertiary-fixed/30"
  };
  return (
    <div className={`glass-card flex items-center justify-between rounded-3xl border-l-4 p-6 ${tones[tone] || tones.primary}`}>
      <div>
        <p className="text-sm font-semibold text-muted">{label}</p>
        <p className="mt-2 text-2xl font-extrabold text-primary">{value}</p>
      </div>
      <div className="grid h-14 w-14 place-items-center rounded-full bg-white text-primary shadow-sm">
        <Icon />
      </div>
    </div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-2xl bg-surface-low p-4">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="mt-2 text-lg font-extrabold text-primary">{value}</p>
    </div>
  );
}

function getRange(preset) {
  const end = new Date();
  const start = new Date();
  if (preset === "1m") {
    start.setDate(end.getDate() - 30);
  } else if (preset === "12m") {
    start.setMonth(end.getMonth() - 12);
  } else {
    start.setMonth(end.getMonth() - 3);
  }
  return {
    start_date: start.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10)
  };
}

function periodLabel(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "-";
  return `${monthNameId(start)} - ${monthNameId(end)}`;
}

function monthNameId(date) {
  return new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric" }).format(date).replace(".", "");
}

function formatPeriod(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("id-ID", { month: "short" }).format(date).replace(".", "");
}

function calcGrowth(rows) {
  if (!Array.isArray(rows) || rows.length < 2) return 0;
  const current = Number(rows[rows.length - 1]?.gross_sales || 0);
  const previous = Number(rows[rows.length - 2]?.gross_sales || 0);
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
}

function InfoPill({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl bg-surface-low p-4">
      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-muted">
        <Icon className="text-sm" />
        <span>{label}</span>
      </div>
      <p className="mt-2 break-all text-sm font-bold text-primary">{value}</p>
    </div>
  );
}

function normalizeJob(payload) {
  if (!payload) return null;
  if (payload.data && typeof payload.data === "object") return payload.data;
  if (payload.job && typeof payload.job === "object") return payload.job;
  if (payload.item && typeof payload.item === "object") return payload.item;
  return payload;
}

export function ImportPage() {
  const [file, setFile] = useState(null);
  const [jobId, setJobId] = useState("");
  const [job, setJob] = useState(null);
  const submit = async () => {
    if (!file) return Toast.warning("Pilih file CSV atau Excel terlebih dahulu");
    try {
      const created = await importService.medicines(file);
      const nextJobId = created?.id || created?.job_id || "";
      setJobId(nextJobId);
      setJob(created);
      Toast.success("Import job masuk antrean");
    } catch (error) {
      Toast.error(error?.response?.data?.detail || error?.response?.data?.message || error?.message || "Gagal mengirim file import");
    }
  };
  const checkJob = async () => {
    if (!jobId) return Toast.warning("Isi job ID import");
    try {
      setJob(await importService.job(jobId));
    } catch (error) {
      Toast.error(error?.response?.data?.detail || error?.response?.data?.message || error?.message || "Gagal memuat job import");
    }
  };
  return (
    <>
      <PageHeader title="Import CSV/Excel" subtitle="Import master obat dari file CSV atau Excel." />
      <div className="glass-card max-w-3xl p-6">
        <label className="block text-sm font-bold text-muted">
          File CSV / Excel
          <input
            className="field mt-2"
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
        </label>
        <p className="mt-2 text-xs text-muted">
          Upload file langsung dari komputer. Sistem akan membuat job import dan memproses data di backend.
        </p>
        <button type="button" className="btn-primary mt-6" onClick={submit} disabled={!file}><FiUpload /> Import Data</button>
        <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto]">
          <input className="field" placeholder="Cek import job ID" value={jobId} onChange={(e) => setJobId(e.target.value)} />
          <button type="button" className="btn-secondary" onClick={checkJob}>Cek Status</button>
        </div>
        {job && <pre className="mt-4 max-h-56 overflow-auto rounded-2xl bg-surface-low p-4 text-xs font-semibold text-primary">{JSON.stringify(job, null, 2)}</pre>}
      </div>
    </>
  );
}

export function MonitoringPage() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    Promise.all([
      monitoringService.health().then((data) => ({ label: "Health", data })),
      monitoringService.resources().then((data) => ({ label: "Resources", data })),
      monitoringService.database().then((data) => ({ label: "Database", data })),
      monitoringService.redis().then((data) => ({ label: "Redis", data }))
    ]).then(setItems);
  }, []);
  return (
    <>
      <PageHeader title="Monitoring Backend" subtitle="Status health, resource server, database, dan Redis dari FastAPI." />
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="glass-card p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-primary">{item.label}</h3>
              <span className="rounded-full bg-secondary-soft px-3 py-1 text-xs font-bold text-primary">{item.data?.status || "ready"}</span>
            </div>
            <pre className="mt-4 max-h-52 overflow-auto rounded-2xl bg-surface-low p-4 text-xs font-semibold text-primary">{JSON.stringify(item.data, null, 2)}</pre>
          </div>
        ))}
      </div>
    </>
  );
}

export function HelpPage({ type }) {
  const content = {
    guide: ["Login sesuai role", "Gunakan menu sidebar role-based", "CRUD data dari halaman manajemen", "Upload resep dan bukti pembayaran dari form upload"],
    faq: ["Semua data dibaca dari backend FastAPI.", "Token tersimpan di localStorage.", "Role menu mengikuti response login."],
    troubleshooting: ["Cek VITE_API_BASE_URL di .env", "Pastikan backend FastAPI berjalan di port 8000", "Cek console browser untuk error API"],
    system: ["Audit log aktivitas pengguna", "Error log dan status resolve", "Konfigurasi CORS dan koneksi API", "Panduan operasional sistem"]
  };
  const title = type === "guide" ? "User Guide" : type === "faq" ? "Bantuan" : type === "system" ? "Sistem" : "Troubleshooting";
  const systemLinks = [
    { label: "Audit Log", description: "Aktivitas user, entity, IP, dan request backend.", to: "/admin/system/audit" },
    { label: "Error Log", description: "Pantau error backend dan status penyelesaiannya.", to: "/admin/system/errors" },
    { label: "Monitoring", description: "Health check, database, Redis, dan resource backend.", to: "/admin/system/monitoring" }
  ];
  return (
    <>
      <PageHeader title={title} subtitle="Panduan singkat penggunaan frontend demo." />
      {type === "system" && (
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          {systemLinks.map((item) => (
            <Link key={item.to} to={item.to} className="glass-card p-5 transition hover:-translate-y-1 hover:border-primary/30">
              <p className="text-lg font-extrabold text-primary">{item.label}</p>
              <p className="mt-2 text-sm font-semibold text-muted">{item.description}</p>
            </Link>
          ))}
        </div>
      )}
      <div className="glass-card p-6">
        <div className="space-y-4">
          {(content[type] || []).map((item, index) => <div key={item} className="flex gap-4 rounded-2xl bg-surface-low p-4"><span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-sm font-bold text-white">{index + 1}</span><p className="font-bold">{item}</p></div>)}
        </div>
      </div>
    </>
  );
}

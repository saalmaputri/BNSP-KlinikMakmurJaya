import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FiCheckCircle, FiClock, FiDownload, FiEye, FiFileText, FiSearch, FiXCircle } from "react-icons/fi";
import StatusBadge from "../components/StatusBadge";
import ConfirmDialog from "../components/ConfirmDialog";
import { Toast } from "../components/Toast";
import { prescriptionService } from "../services/prescriptionService";
import { normalizeList } from "../utils/storage";

const prescriptionImageFallback = "https://images.unsplash.com/photo-1583912267550-d44c1f2462a0?auto=format&fit=crop&w=900&q=80";

export default function PrescriptionVerify() {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);

  const load = () => {
    setLoading(true);
    return prescriptionService.pending()
    .then((data) => {
      const rows = normalizeList(data);
      setItems(rows);
      const linkedId = searchParams.get("prescription_id");
      setSelectedId((current) => {
        if (linkedId && rows.some((item) => String(item.id) === linkedId)) return linkedId;
        return rows.some((item) => String(item.id) === String(current)) ? current : rows[0]?.id || "";
      });
      setNotes("");
    })
    .catch((error) => {
      setItems([]);
      Toast.error(error?.response?.data?.detail || error?.message || "Gagal memuat resep");
    })
    .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const selected = items.find((item) => String(item.id) === String(selectedId)) || items[0];
  const filtered = useMemo(() => {
    const keyword = query.toLowerCase();
    return items.filter((item) => `${item.id} ${item.patient_id} ${item.doctor_name} ${item.prescription_number} ${item.order_id}`.toLowerCase().includes(keyword));
  }, [items, query]);

  const approve = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await prescriptionService.approve(selected.id, { notes });
      Toast.success("Resep disetujui dan dikirim ke backend");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!selected) return;
    if (!notes.trim()) return Toast.warning("Isi catatan apoteker sebelum menolak resep");
    setBusy(true);
    try {
      await prescriptionService.reject(selected.id, { notes });
      Toast.warning("Resep ditolak dan dikirim ke backend");
      await load();
      setRejectConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
      <aside className="xl:sticky xl:top-24 xl:h-[calc(100vh-7rem)] xl:overflow-hidden">
        <div className="mb-5 flex flex-col gap-4 xl:shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-extrabold text-primary">Antrean Resep</h2>
              <p className="mt-1 text-sm font-semibold text-muted">Resep pending dari backend FastAPI.</p>
            </div>
            <span className="rounded-full bg-primary px-4 py-2 text-sm font-extrabold text-white">{items.length} baru</span>
          </div>
          <div className="relative">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input className="field pl-11" placeholder="Cari ID resep, pasien, dokter..." value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
        </div>

        <div className="space-y-3 xl:max-h-[calc(100vh-17rem)] xl:overflow-y-auto xl:pr-2">
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`w-full rounded-2xl border-l-4 p-5 text-left shadow-sm transition hover:-translate-y-0.5 ${selected?.id === item.id ? "border-primary bg-white ring-1 ring-primary/10" : "border-outline bg-white/80"}`}
              onClick={() => {
                setSelectedId(item.id);
                setNotes(item.notes || "");
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <StatusBadge status={item.status} />
                <span className="text-xs font-semibold text-muted">{formatDate(item.created_at)}</span>
              </div>
              <p className="font-extrabold text-primary">{item.prescription_number || item.id}</p>
              <p className="mt-1 font-bold">{item.patient_name}</p>
              <p className="mt-1 text-sm text-muted">Order: {item.order_id}</p>
              <p className="text-sm text-muted">Dokter: {item.doctor_name || "-"}</p>
            </button>
          ))}
          {!loading && !filtered.length && (
            <div className="glass-card p-8 text-center">
              <FiClock className="mx-auto text-4xl text-primary" />
              <p className="mt-3 font-extrabold text-primary">Tidak ada antrean resep</p>
              <p className="mt-1 text-sm text-muted">Semua resep pending dari backend sudah diproses.</p>
            </div>
          )}
        </div>
      </aside>

      <section className="glass-card overflow-hidden">
        {!selected ? (
          <div className="flex min-h-[680px] flex-col items-center justify-center p-8 text-center">
            <FiFileText className="text-5xl text-primary" />
            <h1 className="mt-4 text-2xl font-extrabold text-primary">Belum ada resep untuk diverifikasi</h1>
            <p className="mt-2 text-muted">Data akan muncul setelah pasien upload resep ke backend.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col justify-between gap-4 border-b border-outline/60 bg-white p-6 lg:flex-row lg:items-start">
              <div>
                <h1 className="text-3xl font-extrabold text-primary">Detail Verifikasi Resep</h1>
                <p className="mt-1 text-muted">Validasi file resep, catatan dokter, dan keputusan apoteker.</p>
              </div>
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <a className="btn-secondary" href={selected.file_url || selected.image_url || prescriptionImageFallback} target="_blank" rel="noreferrer"><FiEye /> Lihat File</a>
                <a className="btn-secondary" href={selected.file_url || selected.image_url || prescriptionImageFallback} download><FiDownload /> Unduh</a>
              </div>
            </div>

            <div className="grid gap-6 p-6 2xl:grid-cols-[360px_minmax(0,1fr)]">
              <div className="space-y-4">
                <div className="rounded-2xl bg-surface-low p-5">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-muted">Pasien</p>
                  <p className="mt-2 text-xl font-extrabold text-primary">{selected.patient_name}</p>
                  <p className="mt-1 text-sm text-muted">Patient ID: {selected.patient_id || "-"}</p>
                  <p className="text-sm text-muted">Order ID: {selected.order_id}</p>
                </div>
                <div className="overflow-hidden rounded-2xl bg-surface-low shadow-sm">
                  <img src={selected.file_url || selected.image_url || prescriptionImageFallback} alt="Preview resep" className="h-96 w-full object-cover" />
                </div>
              </div>

              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <PrescriptionInfo label="Status" value={<StatusBadge status={selected.status} />} />
                  <PrescriptionInfo label="Nomor Resep" value={selected.prescription_number || "-"} />
                  <PrescriptionInfo label="Dokter" value={selected.doctor_name || "-"} />
                </div>

                <div className="rounded-2xl border border-outline bg-white p-5">
                  <h3 className="text-lg font-extrabold text-primary">Catatan Pasien / Dokter</h3>
                  <p className="mt-3 min-h-20 rounded-2xl bg-surface-low p-4 text-sm font-semibold leading-7 text-muted">{selected.notes || "Tidak ada catatan tambahan dari pasien."}</p>
                </div>

                <div>
                  <label className="mb-3 block text-sm font-extrabold text-primary">Catatan Apoteker</label>
                  <textarea
                    className="field min-h-36 rounded-2xl bg-surface-low"
                    placeholder="Tambahkan catatan verifikasi, instruksi penyiapan obat, atau alasan penolakan..."
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </div>

                <div className="grid gap-4 border-t border-outline/60 pt-6 md:grid-cols-2">
                  <button type="button" className="btn-secondary h-14 border-danger text-danger" disabled={busy} onClick={() => setRejectConfirmOpen(true)}><FiXCircle /> Reject</button>
                  <button type="button" className="btn-primary h-14" disabled={busy} onClick={approve}><FiCheckCircle /> Approve</button>
                </div>
              </div>
            </div>
          </>
        )}
      </section>
      <ConfirmDialog
        open={rejectConfirmOpen}
        title="Tolak Resep"
        message={selected ? `Tolak resep ${selected.prescription_number || selected.id}? Pastikan catatan penolakan sudah diisi.` : "Tolak resep ini?"}
        onCancel={() => setRejectConfirmOpen(false)}
        onConfirm={reject}
      />
    </div>
  );
}

function PrescriptionInfo({ label, value }) {
  return (
    <div className="rounded-2xl bg-surface-low p-4">
      <p className="text-xs font-extrabold uppercase tracking-wide text-muted">{label}</p>
      <div className="mt-2 font-extrabold text-primary">{value}</div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

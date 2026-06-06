import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FiAlertCircle, FiChevronRight, FiInfo, FiSearch, FiShoppingCart, FiUpload } from "react-icons/fi";
import DataTable from "../components/DataTable";
import ProductCard from "../components/ProductCard";
import UploadPreview from "../components/UploadPreview";
import { Toast } from "../components/Toast";
import { medicineService } from "../services/medicineService";
import { prescriptionService } from "../services/prescriptionService";
import { cartService } from "../services/cartService";
import { normalizeList, rupiah } from "../utils/storage";
import PageHeader from "./PageHeader";

export function CatalogPage({ basePath = "/pasien/products", cartPath = "/pasien/cart" }) {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua");

  useEffect(() => {
    medicineService.list().then((data) => setItems(normalizeList(data))).catch((error) => Toast.error(error?.response?.data?.message || "Gagal memuat katalog dari backend"));
  }, []);

  const addToCart = async (product) => {
    await cartService.add({ medicine_id: product.id, quantity: 1 });
    Toast.success("Produk ditambahkan ke keranjang");
  };

  const filtered = useMemo(() => {
    return items
      .filter((item) => category === "Semua" || item.category_name === category)
      .filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
  }, [items, query, category]);

  const categories = useMemo(() => [
    { value: "Semua", label: "Semua Produk" },
    ...[...new Set(items.map((item) => item.category_name).filter(Boolean))].map((item) => ({ value: item, label: item }))
  ], [items]);

  return (
    <div className="pb-10">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative w-full max-w-xl">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-muted" />
          <input
            className="h-12 w-full rounded-full border-0 bg-surface-low pl-12 pr-5 text-sm font-medium text-ink outline-none ring-1 ring-transparent transition placeholder:text-muted focus:ring-2 focus:ring-primary/20"
            placeholder="Search by name or code..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <Link className="btn-primary h-12 px-6" to={cartPath}><FiShoppingCart /> Keranjang</Link>
      </div>

      <div className="mb-8 flex flex-wrap gap-3">
        {categories.map((item) => (
          <button
            key={item.value}
            className={`h-11 rounded-full px-5 text-sm font-extrabold transition ${category === item.value ? "bg-primary text-white shadow-soft" : "border border-outline/70 bg-white text-ink hover:border-primary hover:text-primary"}`}
            onClick={() => setCategory(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((product) => <ProductCard key={product.id} product={product} detailPath={`${basePath}/${product.id}`} onAdd={addToCart} />)}
      </div>
    </div>
  );
}

export function DetailObat({ cartPath = "/pasien/cart", catalogPath = "/pasien/catalog", showBatchDetails = false, showPurchaseActions = true }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [batches, setBatches] = useState([]);
  useEffect(() => {
    let alive = true;
    Promise.all([
      medicineService.detail(id),
      showBatchDetails ? medicineService.batches(id) : Promise.resolve([])
    ])
      .then(([medicine, batchData]) => {
        if (!alive) return;
        setProduct(medicine);
        setBatches(normalizeList(batchData));
      })
      .catch((error) => Toast.error(error?.response?.data?.message || "Gagal memuat detail obat"));
    return () => {
      alive = false;
    };
  }, [id]);
  if (!product) return null;

  const addToCart = async () => {
    await cartService.add({ medicine_id: product.id, quantity: 1 });
    Toast.success("Produk ditambahkan ke keranjang");
  };
  const buyNow = async () => {
    await addToCart();
    navigate(cartPath);
  };
  const stockReady = Number(product.current_stock || 0) > Number(product.minimum_stock || 0);
  const batchColumns = [
    { key: "batch_number", label: "Batch" },
    { key: "available_quantity", label: "Stok Batch", render: (row) => row.available_quantity ?? 0 },
    { key: "received_date", label: "Diterima" },
    { key: "expired_date", label: "Kadaluarsa" },
    { key: "days_remaining", label: "Sisa Hari", render: (row) => row.days_remaining ?? "-" },
    { key: "status", label: "Status", type: "badge" }
  ];

  return (
    <div className="space-y-8">
      <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-muted">
        <Link to={catalogPath} className="hover:text-primary">Katalog Obat</Link>
        <FiChevronRight size={14} />
        <span>{product.category_name}</span>
        <FiChevronRight size={14} />
        <span className="font-extrabold text-primary">{product.name}</span>
      </nav>

      <section className="grid gap-10 rounded-2xl bg-white p-6 shadow-sm xl:grid-cols-2">
        <div>
          <div className="relative overflow-hidden rounded-xl border border-outline/30 bg-surface-low">
            <img src={product.image_url} alt={product.name} className="aspect-square w-full object-cover transition duration-500" />
            {product.requires_prescription && (
              <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-danger-soft px-4 py-2 text-sm font-bold text-danger">
                <FiAlertCircle /> Butuh Resep Dokter
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col">
          <div className="mb-6">
            <span className="rounded-full bg-primary-soft px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-primary">{product.category_name}</span>
            <h1 className="mt-5 text-5xl font-extrabold tracking-tight text-primary">{product.name}</h1>
            <p className="mt-3 text-lg text-muted">{product.strength}</p>
          </div>

          <div className="mb-8 flex flex-wrap items-end gap-3">
            <span className="text-4xl font-extrabold text-primary">{rupiah(product.selling_price)}</span>
          </div>

          <dl className="mb-10 space-y-4">
            <div className="flex items-center gap-6">
              <dt className="w-24 text-sm font-bold text-muted">Stok:</dt>
              <dd className={`rounded-lg px-4 py-2 text-sm font-extrabold ${stockReady ? "bg-secondary text-white" : "bg-warning text-white"}`}>
                {stockReady ? `Tersedia > ${product.current_stock} unit` : `Stok ${product.current_stock} unit`}
              </dd>
            </div>
            <div className="flex items-center gap-6"><dt className="w-24 text-sm font-bold text-muted">Kategori:</dt><dd className="font-semibold text-ink">{product.category_name}</dd></div>
            <div className="flex items-center gap-6"><dt className="w-24 text-sm font-bold text-muted">Expired:</dt><dd className="font-semibold text-ink">{product.expired_date}</dd></div>
            <div className="flex items-center gap-6"><dt className="w-24 text-sm font-bold text-muted">SKU:</dt><dd className="font-semibold text-ink">{product.sku}</dd></div>
          </dl>

          {product.requires_prescription && (
            <div className="mb-8 rounded-xl border border-primary/20 bg-surface-low p-6">
              <div className="mb-5 flex items-start gap-3">
                <FiInfo className="mt-1 text-primary" />
                <div>
                  <h3 className="font-extrabold text-primary">Perhatian Khusus</h3>
                  <p className="mt-1 text-sm text-muted">Obat ini membutuhkan resep dokter yang valid. Silakan unggah foto resep sebelum melanjutkan ke pembayaran.</p>
                </div>
              </div>
              <Link to="/pasien/prescriptions/upload" className="flex w-full items-center justify-center gap-3 rounded-lg border-2 border-dashed border-primary py-5 font-extrabold text-primary transition hover:bg-primary hover:text-white">
                <FiUpload /> Upload Resep Dokter
              </Link>
            </div>
          )}

          {showPurchaseActions && (
            <div className="mt-auto grid gap-4 sm:grid-cols-2">
              <button className="btn-primary h-16 text-base" onClick={buyNow}>Beli Sekarang</button>
              <button className="btn-secondary h-16 border-2 border-primary text-base" onClick={addToCart}><FiShoppingCart /> Tambah ke Keranjang</button>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="border-b border-outline/50 pb-4 text-2xl font-extrabold text-primary">Deskripsi Produk</h2>
        <p className="mt-6 leading-8 text-muted">{product.description}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <ProductField label="Generic" value={product.generic_name || "-"} />
          <ProductField label="Satuan" value={product.unit || "-"} />
          <ProductField label="Resep" value={product.requires_prescription ? "Wajib resep" : "Tidak wajib resep"} />
        </div>
      </section>

      {showBatchDetails && (
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-extrabold text-primary">Detail Batch</h2>
              <p className="mt-1 text-sm text-muted">Daftar batch obat ini beserta stok dan tanggal kadaluarsa.</p>
            </div>
            <div className="rounded-full bg-surface-low px-4 py-2 text-sm font-bold text-primary">
              Total stok aktif: {product.current_stock ?? 0}
            </div>
          </div>
          <DataTable rows={batches} columns={batchColumns} />
        </section>
      )}
    </div>
  );
}

function ProductField({ label, value }) {
  return <div className="rounded-2xl bg-surface-low p-4"><p className="text-xs font-extrabold uppercase text-muted">{label}</p><p className="mt-2 font-bold text-primary">{value}</p></div>;
}

export function UploadPrescription() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ order_id: searchParams.get("order_id") || "", file: null, doctor_name: "", prescription_number: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    if (!form.order_id || !form.file || !form.doctor_name.trim() || !form.prescription_number.trim()) return Toast.warning("Order ID, gambar resep, nama dokter, dan nomor resep wajib diisi");
    setSubmitting(true);
    try {
      await prescriptionService.upload(form);
      Toast.success("Resep berhasil diupload");
      navigate(`/pasien/orders/${form.order_id}`);
    } catch (error) {
      Toast.error(error?.response?.data?.detail || error?.message || "Resep gagal diupload");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <>
      <PageHeader title="Upload Resep" subtitle="Upload resep dokter untuk diverifikasi apoteker." />
      <div className="glass-card max-w-2xl space-y-4 p-6">
        <input className="field" placeholder="Order ID" value={form.order_id} readOnly={Boolean(searchParams.get("order_id"))} onChange={(e) => setForm({ ...form, order_id: e.target.value })} />
        <UploadPreview label="Foto resep dokter" onChange={(file) => setForm({ ...form, file })} />
        <input className="field" placeholder="Nama dokter" value={form.doctor_name} onChange={(e) => setForm({ ...form, doctor_name: e.target.value })} />
        <input className="field" placeholder="Nomor resep" value={form.prescription_number} onChange={(e) => setForm({ ...form, prescription_number: e.target.value })} />
        <textarea className="field" rows="3" placeholder="Catatan" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <button className="btn-primary mt-6" onClick={submit} disabled={submitting}>{submitting ? "Mengirim..." : "Kirim Resep"}</button>
      </div>
    </>
  );
}

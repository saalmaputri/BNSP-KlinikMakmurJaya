import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiDownload, FiMinus, FiPlus, FiRefreshCw, FiShoppingCart, FiUpload } from "react-icons/fi";
import DataTable from "../components/DataTable";
import ModalForm from "../components/ModalForm";
import SearchBar from "../components/SearchBar";
import UploadPreview from "../components/UploadPreview";
import { Toast } from "../components/Toast";
import { medicineService } from "../services/medicineService";
import { orderService } from "../services/orderService";
import { prescriptionService } from "../services/prescriptionService";
import { stockService } from "../services/stockService";
import { cartService } from "../services/cartService";
import { categoryService } from "../services/categoryService";
import { customerService } from "../services/customerService";
import { supplierService } from "../services/supplierService";
import { normalizeList, rupiah } from "../utils/storage";
import PageHeader from "./PageHeader";

const simpleServices = {
  categories: categoryService,
  suppliers: supplierService,
  customers: customerService
};

export function MedicinesManagement() {
  const navigate = useNavigate();
  const dosageForms = ["Tablet", "Kaplet", "Kapsul", "Sirup", "Suspensi", "Drops", "Salep", "Krim", "Gel", "Injeksi", "Suppositoria", "Inhaler", "Serbuk"];
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const emptyForm = {
    id: "",
    sku: "",
    category_id: "",
    supplier_id: "",
    name: "",
    generic_name: "",
    description: "",
    dosage_form: "",
    strength: "",
    unit: "pcs",
    selling_price: "",
    requires_prescription: false,
    minimum_stock: 10,
    is_active: true,
    image: null,
    image_url: ""
  };
  const [form, setForm] = useState(emptyForm);
  const requiredFieldsComplete = Boolean(
    form.category_id &&
    form.supplier_id &&
    form.name.trim() &&
    form.generic_name.trim() &&
    form.description.trim() &&
    form.dosage_form &&
    form.strength.trim() &&
    form.unit.trim() &&
    form.selling_price !== "" &&
    Number(form.selling_price) > 0 &&
    form.minimum_stock !== "" &&
    Number(form.minimum_stock) >= 0 &&
    (form.image || form.image_url)
  );

  useEffect(() => {
    loadPageData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadMedicines(query);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const loadPageData = async () => {
    setLoading(true);
    try {
      const [medicineData, categoryData, supplierData] = await Promise.all([
        medicineService.list(),
        categoryService.list(),
        supplierService.list()
      ]);
      setRows(normalizeList(medicineData));
      setCategories(normalizeList(categoryData));
      setSuppliers(normalizeList(supplierData));
    } catch (error) {
      Toast.error(error?.response?.data?.detail || error?.response?.data?.message || "Gagal memuat data manajemen obat");
    } finally {
      setLoading(false);
    }
  };

  const loadMedicines = async (keyword = "") => {
    setLoading(true);
    try {
      const data = keyword.length > 1
        ? await medicineService.search({ keyword })
        : await medicineService.list();
      setRows(normalizeList(data));
    } catch (error) {
      Toast.error(error?.response?.data?.detail || error?.response?.data?.message || "Gagal memuat obat");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setForm({ ...emptyForm, category_id: categories[0]?.id || "" });
    setOpen(true);
  };
  const openEdit = (row) => {
    setForm({
      id: row.id,
      sku: row.sku || "",
      category_id: row.category_id || "",
      supplier_id: row.supplier_id || "",
      name: row.name || "",
      generic_name: row.generic_name || "",
      description: row.description || "",
      dosage_form: row.dosage_form || "",
      strength: row.strength || "",
      unit: row.unit || "pcs",
      selling_price: row.selling_price ?? "",
      requires_prescription: Boolean(row.requires_prescription),
      minimum_stock: row.minimum_stock ?? 10,
      is_active: row.is_active ?? true,
      image: null,
      image_url: row.image_url || ""
    });
    setOpen(true);
  };

  const saveMedicine = async () => {
    if (!requiredFieldsComplete) return Toast.warning("Semua field wajib dan foto obat harus diisi");

    setSaving(true);
    try {
      const payload = {
        category_id: form.category_id,
        supplier_id: form.supplier_id,
        name: form.name.trim(),
        generic_name: form.generic_name.trim(),
        description: form.description.trim(),
        dosage_form: form.dosage_form,
        strength: form.strength.trim(),
        unit: form.unit.trim(),
        selling_price: Number(form.selling_price),
        requires_prescription: Boolean(form.requires_prescription),
        minimum_stock: Number(form.minimum_stock),
        is_active: Boolean(form.is_active),
        image: form.image
      };
      const saved = form.id ? await medicineService.update(form.id, payload) : await medicineService.create(payload);
      if (form.id && form.image) await medicineService.uploadImage(saved.id || form.id, form.image);
      await loadMedicines(query);
      setOpen(false);
      Toast.success(form.id ? "Data obat diperbarui" : "Data obat tersimpan");
    } catch (error) {
      Toast.error(error?.response?.data?.detail || error?.response?.data?.message || error?.message || "Gagal menyimpan obat");
    } finally {
      setSaving(false);
    }
  };

  const deleteMedicine = async (row) => {
    if (!window.confirm(`Nonaktifkan obat ${row.name}?`)) return;
    try {
      await medicineService.remove(row.id);
      await loadMedicines(query);
      Toast.success("Obat dinonaktifkan");
    } catch (error) {
      Toast.error(error?.response?.data?.detail || error?.response?.data?.message || "Gagal menonaktifkan obat");
    }
  };

  const viewMedicine = (row) => {
    navigate(`/admin/medicines/${row.id}`);
  };

  const categoryName = (id) => categories.find((item) => String(item.id) === String(id))?.name || "-";
  const supplierName = (id) => suppliers.find((item) => String(item.id) === String(id))?.name || "-";

  const exportCsv = () => {
    const header = ["SKU", "Nama", "Generik", "Kategori", "Supplier", "Harga Jual", "Min Stok", "Resep", "Status"];
    const body = rows.map((row) => [
      row.sku,
      row.name,
      row.generic_name,
      categoryName(row.category_id),
      supplierName(row.supplier_id),
      row.selling_price,
      row.minimum_stock,
      row.requires_prescription ? "Ya" : "Tidak",
      row.is_active === false ? "Nonaktif" : "Aktif"
    ]);
    const csv = [header, ...body].map((line) => line.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "manajemen-obat.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const columns = [
    { key: "name", label: "Obat", render: (row) => <div><p className="font-extrabold text-primary">{row.name}</p><p className="text-xs text-muted">SKU: {row.sku}</p></div> },
    { key: "generic_name", label: "Generik", render: (row) => row.generic_name || "-" },
    { key: "category_id", label: "Kategori", render: (row) => categoryName(row.category_id) },
    { key: "selling_price", label: "Harga", render: (row) => rupiah(row.selling_price) },
    { key: "minimum_stock", label: "Min Stok", render: (row) => row.minimum_stock ?? 0 },
    { key: "requires_prescription", label: "Resep", render: (row) => row.requires_prescription ? "Wajib" : "Bebas" },
    { key: "is_active", label: "Status", render: (row) => row.is_active === false ? "Nonaktif" : "Aktif" },
    { key: "supplier_id", label: "Supplier", render: (row) => supplierName(row.supplier_id) }
  ];

  return (
    <>
      <PageHeader title="Manajemen Obat" subtitle="CRUD master obat terintegrasi endpoint backend /medicines." action={<div className="flex flex-wrap gap-3"><button className="btn-secondary" onClick={loadPageData} disabled={loading}><FiRefreshCw /> Refresh</button><button className="btn-secondary" onClick={exportCsv}><FiDownload /> Export CSV</button><Link className="btn-secondary" to="/admin/medicines/imports"><FiUpload /> Import CSV</Link><button className="btn-primary" onClick={openCreate}><FiPlus /> Tambah Obat</button></div>} />
      <div className="mb-6"><SearchBar value={query} onChange={setQuery} placeholder="Cari obat..." suggestions={rows.map((item) => item.name)} onSelect={setQuery} /></div>
      {loading && <p className="mb-4 text-sm font-bold text-muted">Memuat data backend...</p>}
      <DataTable columns={columns} rows={rows} onView={viewMedicine} onEdit={openEdit} onDelete={deleteMedicine} />
      <ModalForm open={open} title={form.id ? "Edit Obat" : "Tambah Obat Baru"} onClose={() => setOpen(false)} footer={<><button className="btn-secondary" onClick={() => setOpen(false)} disabled={saving}>Batal</button><button className="btn-primary" onClick={saveMedicine} disabled={saving || !requiredFieldsComplete}>{saving ? "Menyimpan..." : "Simpan Obat"}</button></>}>
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <RequiredField label="Kategori">
              <select className="field" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} required>
                <option value="">Pilih kategori</option>
                {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </RequiredField>
            <RequiredField label="Supplier">
              <select className="field" value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })} required>
                <option value="">Pilih supplier</option>
                {suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </RequiredField>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <RequiredField label="SKU">
              <div className="field bg-surface-high font-semibold text-muted">{form.id ? form.sku : "Dibuat otomatis setelah disimpan"}</div>
            </RequiredField>
            <RequiredField label="Nama obat">
              <input className="field" placeholder="Contoh: Paracetamol" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </RequiredField>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <RequiredField label="Nama generik">
              <input className="field" placeholder="Contoh: Acetaminophen" value={form.generic_name} onChange={(e) => setForm({ ...form, generic_name: e.target.value })} required />
            </RequiredField>
            <RequiredField label="Bentuk sediaan">
              <select className="field" value={form.dosage_form} onChange={(e) => setForm({ ...form, dosage_form: e.target.value })} required>
                <option value="">Pilih bentuk</option>
                {dosageForms.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </RequiredField>
            <RequiredField label="Kekuatan">
              <input className="field" placeholder="Contoh: 500 mg" value={form.strength} onChange={(e) => setForm({ ...form, strength: e.target.value })} required />
            </RequiredField>
          </div>
          <RequiredField label="Deskripsi obat">
            <textarea className="field" rows="3" placeholder="Deskripsi, kegunaan, dan informasi obat" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          </RequiredField>
          <div className="grid gap-4 md:grid-cols-3">
            <RequiredField label="Satuan">
              <input className="field" placeholder="Contoh: strip" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} required />
            </RequiredField>
            <RequiredField label="Harga jual">
              <input className="field" placeholder="Harga jual" type="number" min="1" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} required />
            </RequiredField>
            <RequiredField label="Minimum stok">
              <input className="field" placeholder="Minimum stok" type="number" min="0" value={form.minimum_stock} onChange={(e) => setForm({ ...form, minimum_stock: e.target.value })} required />
            </RequiredField>
          </div>
          <UploadPreview
            key={`${form.id || "new"}-${form.image_url}`}
            label={`Foto obat${form.id ? " (pilih jika ingin mengganti)" : " *"}`}
            initialPreview={form.image_url}
            onChange={(image) => setForm({ ...form, image })}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-xl bg-surface-low p-4 text-sm font-bold text-primary">
              <input type="checkbox" checked={form.requires_prescription} onChange={(e) => setForm({ ...form, requires_prescription: e.target.checked })} />
              Membutuhkan resep dokter
            </label>
            <label className="flex items-center gap-3 rounded-xl bg-surface-low p-4 text-sm font-bold text-primary">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Obat aktif
            </label>
          </div>
          <p className="text-xs font-semibold text-muted">Semua field bertanda * wajib diisi. SKU dibuat otomatis oleh sistem dan tidak dapat diedit.</p>
        </div>
      </ModalForm>
    </>
  );
}

function RequiredField({ label, children }) {
  return <label className="block text-sm font-bold text-muted">{label} *<div className="mt-2">{children}</div></label>;
}

export function SimpleManagement({ type, title, subtitle }) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    simpleServices[type]?.list().then((data) => setRows(normalizeList(data)));
  }, [type]);

  const createSimple = async () => {
    const name = window.prompt(`Nama ${title}`);
    if (!name) return;
    const created = await simpleServices[type]?.create?.({ name });
    if (created) setRows((current) => [created, ...current]);
    Toast.success("Data tersimpan ke backend");
  };

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} action={<button className="btn-primary" onClick={createSimple}><FiPlus /> Tambah Data</button>} />
      <DataTable columns={[{ key: "name", label: "Nama" }, { key: "description", label: "Deskripsi" }, { key: "phone", label: "Kontak" }, { key: "status", label: "Status", type: "badge" }]} rows={rows} />
    </>
  );
}

export function TransactionsManagement({ title = "Manajemen Transaksi", subtitle = "Kelola transaksi penjualan kasir dan online.", cashierMode = false }) {
  const [rows, setRows] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [selectedMedicine, setSelectedMedicine] = useState("");
  const [customerName, setCustomerName] = useState("Pelanggan Walk-in");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [checkingOut, setCheckingOut] = useState(false);
  useEffect(() => { orderService.transactions().then((data) => setRows(normalizeList(data))).catch((error) => Toast.error(error?.response?.data?.message || "Gagal memuat transaksi")); }, []);
  useEffect(() => {
    if (!cashierMode) return;
    Promise.all([medicineService.list(), stockService.list()])
      .then(([medicineData, stockData]) => {
        const stocks = normalizeList(stockData);
        setMedicines(normalizeList(medicineData).map((medicine) => ({
          ...medicine,
          current_stock: Number(stocks.find((stock) => String(stock.medicine_id) === String(medicine.id))?.current_stock || 0)
        })));
      })
      .catch((error) => {
        setMedicines([]);
        Toast.error(error?.response?.data?.detail || error?.message || "Gagal memuat stok obat kasir");
      });
  }, [cashierMode]);
  const addCashierItem = () => {
    const medicine = medicines.find((item) => String(item.id) === String(selectedMedicine));
    if (!medicine) return;
    setCartItems((current) => {
      const existing = current.find((item) => String(item.medicine_id) === String(medicine.id));
      if (existing) return current.map((item) => String(item.medicine_id) === String(medicine.id)
        ? { ...item, quantity: Math.min(item.current_stock, item.quantity + 1) }
        : item);
      return [...current, { medicine_id: medicine.id, medicine, current_stock: medicine.current_stock, quantity: 1 }];
    });
  };
  const updateCashierQty = (medicineId, delta) => {
    setCartItems((current) => current
      .map((item) => String(item.medicine_id) === String(medicineId)
        ? { ...item, quantity: Math.min(item.current_stock, Math.max(1, item.quantity + delta)) }
        : item)
      .filter((item) => item.quantity > 0));
  };
  const cashierTotal = cartItems.reduce((sum, item) => sum + Number(item.medicine?.selling_price || 0) * item.quantity, 0);
  const checkoutCashier = async () => {
    if (!cartItems.length) return Toast.warning("Keranjang kasir masih kosong");
    setCheckingOut(true);
    try {
      const order = await orderService.cashierCheckout({
        items: cartItems.map((item) => ({ medicine_id: item.medicine_id, quantity: item.quantity })),
        payment_method: paymentMethod,
        customer_name: customerName.trim() || "Pelanggan Walk-in"
      });
      setCartItems([]);
      const data = await orderService.transactions();
      setRows(normalizeList(data));
      Toast.success(`Checkout ${order.order_number || ""} berhasil`);
    } catch (error) {
      Toast.error(error?.response?.data?.detail || error?.response?.data?.message || error?.message || "Checkout kasir gagal");
    } finally {
      setCheckingOut(false);
    }
  };
  const printInvoice = (row) => {
    const html = `
      <html>
        <head><title>Invoice ${row.order_number || row.id}</title></head>
        <body style="font-family: Arial, sans-serif; padding: 32px;">
          <h1>Klinik Makmur Jaya</h1>
          <h2>Invoice ${row.order_number || row.id}</h2>
          <p>Pelanggan: ${row.customer_name_snapshot || row.patient_id || "-"}</p>
          <p>Status: ${row.status || "-"}</p>
          <p>Total: ${rupiah(row.total_amount)}</p>
          <p>Tanggal cetak: ${new Date().toLocaleString("id-ID")}</p>
        </body>
      </html>
    `;
    const win = window.open("", "_blank", "width=720,height=640");
    if (!win) return Toast.warning("Popup print diblokir browser");
    win.document.write(html);
    win.document.close();
    win.print();
  };
  const table = <DataTable rows={rows} columns={[{ key: "order_number", label: "ID" }, { key: "customer_name_snapshot", label: "Pelanggan", render: (row) => row.customer_name_snapshot || row.patient_id || "-" }, { key: "total_amount", label: "Total", render: (row) => rupiah(row.total_amount) }, { key: "status", label: "Status", type: "badge" }]} onView={printInvoice} />;
  if (!cashierMode) return <><PageHeader title={title} subtitle={subtitle} />{table}</>;
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">{table}</div>
        <aside className="glass-card sticky top-24 h-fit p-6">
          <h3 className="flex items-center gap-2 text-xl font-extrabold text-primary"><FiShoppingCart /> POS Kasir</h3>
          <div className="mt-5 space-y-3">
            <input className="field" placeholder="Nama pelanggan" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            <select className="field" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="CASH">Tunai</option>
              <option value="DEBIT_CARD">Kartu Debit</option>
              <option value="CREDIT_CARD">Kartu Kredit</option>
              <option value="QRIS">QRIS</option>
              <option value="BANK_TRANSFER">Transfer Bank</option>
            </select>
            <div className="flex gap-2">
              <select className="field" value={selectedMedicine} onChange={(e) => setSelectedMedicine(e.target.value)}>
                <option value="">Pilih obat</option>
                {medicines.map((item) => (
                  <option key={item.id} value={item.id} disabled={item.current_stock <= 0}>
                    {item.name} (stok: {item.current_stock})
                  </option>
                ))}
              </select>
              <button className="icon-btn h-auto w-14 bg-primary text-white" onClick={addCashierItem}><FiPlus /></button>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {cartItems.map((item) => (
              <div key={item.medicine_id} className="rounded-2xl bg-surface-low p-4">
                <p className="font-bold">{item.medicine?.name || item.medicine_id}</p>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-sm font-bold text-muted">{rupiah(Number(item.medicine?.selling_price || 0) * item.quantity)}</p>
                  <div className="flex items-center gap-2">
                    <button className="icon-btn h-8 w-8" onClick={() => updateCashierQty(item.medicine_id, -1)}><FiMinus /></button>
                    <span className="w-6 text-center font-extrabold">{item.quantity}</span>
                    <button className="icon-btn h-8 w-8" onClick={() => updateCashierQty(item.medicine_id, 1)}><FiPlus /></button>
                  </div>
                </div>
              </div>
            ))}
            {!cartItems.length && <p className="text-sm text-muted">Belum ada item di keranjang.</p>}
          </div>
          <div className="mt-6 flex justify-between text-lg font-extrabold"><span>Total</span><span>{rupiah(cashierTotal)}</span></div>
          <button className="btn-primary mt-6 w-full" onClick={checkoutCashier} disabled={checkingOut || !cartItems.length}>
            {checkingOut ? "Memproses..." : "Checkout Kasir"}
          </button>
        </aside>
      </div>
    </>
  );
}

export function PrescriptionsManagement() {
  const [rows, setRows] = useState([]);
  useEffect(() => { prescriptionService.pending().then((data) => setRows(normalizeList(data))).catch((error) => Toast.error(error?.response?.data?.message || "Gagal memuat resep")); }, []);
  return <><PageHeader title="Manajemen Resep" subtitle="Pantau resep masuk dan status validasi." /><DataTable rows={rows} columns={[{ key: "id", label: "ID Resep" }, { key: "patient_id", label: "Pasien" }, { key: "doctor_name", label: "Dokter" }, { key: "status", label: "Status", type: "badge" }]} /></>;
}

export function StockManagement({ mode = "all" }) {
  const [rows, setRows] = useState([]);
  const [batchOpen, setBatchOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [batchForm, setBatchForm] = useState({ medicine_id: "", supplier_id: "", batch_number: "", manufacture_date: "", expired_date: "", received_date: new Date().toISOString().slice(0, 10), initial_quantity: "", unit_cost: "" });
  const [adjustForm, setAdjustForm] = useState({ medicine_batch_id: "", quantity_delta: "", notes: "" });
  useEffect(() => {
    loadStocks();
  }, [mode]);
  const loadStocks = () => {
    const loader = mode === "critical" ? stockService.critical : mode === "expired" ? stockService.expiredSoon : stockService.list;
    return loader().then((data) => setRows(normalizeList(data))).catch((error) => Toast.error(error?.response?.data?.message || "Gagal memuat stok"));
  };
  const createBatch = async () => {
    await stockService.addBatch({
      ...batchForm,
      supplier_id: batchForm.supplier_id || null,
      manufacture_date: batchForm.manufacture_date || null,
      initial_quantity: Number(batchForm.initial_quantity || 0),
      unit_cost: batchForm.unit_cost ? Number(batchForm.unit_cost) : null
    });
    setBatchOpen(false);
    await loadStocks();
    Toast.success("Batch stok tersimpan ke backend");
  };
  const adjustStock = async () => {
    await stockService.adjustment({
      medicine_batch_id: adjustForm.medicine_batch_id,
      quantity_delta: Number(adjustForm.quantity_delta || 0),
      notes: adjustForm.notes
    });
    setAdjustOpen(false);
    await loadStocks();
    Toast.success("Adjustment stok tersimpan ke backend");
  };
  const title = mode === "critical" ? "Critical Stock Alert" : mode === "expired" ? "Expired Soon Alert" : "Stock Management";
  const columns = mode === "expired"
    ? [
        { key: "name", label: "Obat", render: (row) => <div><p className="font-extrabold text-primary">{row.name}</p><p className="text-xs text-muted">Batch: {row.batch_number || "-"}</p></div> },
        { key: "batch_stock", label: "Stok Batch", render: (row) => row.batch_stock ?? row.current_stock ?? 0 },
        { key: "total_stock", label: "Total Stok Obat", render: (row) => row.total_stock ?? row.current_stock ?? 0 },
        { key: "expired_date", label: "Kadaluarsa" },
        { key: "days_remaining", label: "Sisa Hari", render: (row) => row.days_remaining ?? "-" },
        { key: "status", label: "Status", type: "badge" }
      ]
    : [
        { key: "name", label: "Obat" },
        { key: "current_stock", label: "Stok" },
        { key: "minimum_stock", label: "Min" },
        { key: "expired_date", label: "Kadaluarsa" },
        { key: "status", label: "Status", type: "badge" }
      ];
  return (
    <>
      <PageHeader title={title} subtitle="Monitoring stok, batch, dan tanggal kadaluarsa obat." action={mode === "all" && <div className="flex flex-wrap gap-3"><button className="btn-secondary" onClick={() => setAdjustOpen(true)}>Adjustment</button><button className="btn-primary" onClick={() => setBatchOpen(true)}><FiPlus /> Tambah Batch</button></div>} />
      <DataTable rows={rows} columns={columns} />
      <ModalForm open={batchOpen} title="Tambah Batch Stok" onClose={() => setBatchOpen(false)} footer={<><button className="btn-secondary" onClick={() => setBatchOpen(false)}>Batal</button><button className="btn-primary" onClick={createBatch}>Simpan Batch</button></>}>
        <div className="grid gap-4 md:grid-cols-2">
          <select className="field" value={batchForm.medicine_id} onChange={(e) => setBatchForm({ ...batchForm, medicine_id: e.target.value })}>
            <option value="">Pilih obat</option>
            {rows.map((item) => <option key={item.id || item.medicine_id} value={item.id || item.medicine_id}>{item.name}</option>)}
          </select>
          <input className="field" placeholder="Nomor batch" value={batchForm.batch_number} onChange={(e) => setBatchForm({ ...batchForm, batch_number: e.target.value })} />
          <input className="field" type="date" value={batchForm.manufacture_date} onChange={(e) => setBatchForm({ ...batchForm, manufacture_date: e.target.value })} />
          <input className="field" type="date" value={batchForm.expired_date} onChange={(e) => setBatchForm({ ...batchForm, expired_date: e.target.value })} />
          <input className="field" type="date" value={batchForm.received_date} onChange={(e) => setBatchForm({ ...batchForm, received_date: e.target.value })} />
          <input className="field" type="number" placeholder="Jumlah awal" value={batchForm.initial_quantity} onChange={(e) => setBatchForm({ ...batchForm, initial_quantity: e.target.value })} />
          <input className="field" type="number" placeholder="Harga modal/unit" value={batchForm.unit_cost} onChange={(e) => setBatchForm({ ...batchForm, unit_cost: e.target.value })} />
        </div>
      </ModalForm>
      <ModalForm open={adjustOpen} title="Adjustment Stok" onClose={() => setAdjustOpen(false)} footer={<><button className="btn-secondary" onClick={() => setAdjustOpen(false)}>Batal</button><button className="btn-primary" onClick={adjustStock}>Simpan Adjustment</button></>}>
        <div className="space-y-4">
          <input className="field" placeholder="Medicine batch ID dari backend" value={adjustForm.medicine_batch_id} onChange={(e) => setAdjustForm({ ...adjustForm, medicine_batch_id: e.target.value })} />
          <input className="field" type="number" placeholder="Delta qty, contoh: -5 atau 20" value={adjustForm.quantity_delta} onChange={(e) => setAdjustForm({ ...adjustForm, quantity_delta: e.target.value })} />
          <textarea className="field" rows="3" placeholder="Catatan adjustment" value={adjustForm.notes} onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })} />
        </div>
      </ModalForm>
    </>
  );
}

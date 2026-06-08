import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiCheckCircle, FiDownload, FiMinus, FiPackage, FiPlus, FiRefreshCw, FiShoppingCart, FiTrash2, FiUpload } from "react-icons/fi";
import DataTable from "../components/DataTable";
import ConfirmDialog from "../components/ConfirmDialog";
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
import { paymentService } from "../services/paymentService";
import { supplierService } from "../services/supplierService";
import { userService } from "../services/userService";
import { normalizeList, rupiah } from "../utils/storage";
import PageHeader from "./PageHeader";

const simpleServices = {
  categories: categoryService,
  suppliers: supplierService,
  customers: customerService
};

const toMoneyNumber = (value) => Number(String(value ?? "").replace(/[^\d]/g, "")) || 0;
const formatMoneyInput = (value) => {
  const digits = String(value ?? "").replace(/[^\d]/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("id-ID").format(Number(digits));
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
  const [deleteTarget, setDeleteTarget] = useState(null);
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
    toMoneyNumber(form.selling_price) > 0 &&
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
      selling_price: formatMoneyInput(row.selling_price ?? ""),
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
        selling_price: toMoneyNumber(form.selling_price),
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

  const requestDeleteMedicine = (row) => {
    setDeleteTarget(row);
  };

  const confirmDeleteMedicine = async () => {
    if (!deleteTarget?.id) return;
    try {
      await medicineService.remove(deleteTarget.id);
      await loadMedicines(query);
      Toast.success("Obat dinonaktifkan");
      setDeleteTarget(null);
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
      <PageHeader title="Manajemen Obat" subtitle="CRUD master obat terintegrasi." action={<div className="flex flex-wrap gap-3"><button className="btn-secondary" onClick={loadPageData} disabled={loading}><FiRefreshCw /> Refresh</button><button className="btn-secondary" onClick={exportCsv}><FiDownload /> Export CSV</button><Link className="btn-secondary" to="/admin/medicines/imports"><FiUpload /> Import CSV</Link><button className="btn-primary" onClick={openCreate}><FiPlus /> Tambah Obat</button></div>} />
      <div className="mb-6"><SearchBar value={query} onChange={setQuery} placeholder="Cari obat..." suggestions={rows.map((item) => item.name)} onSelect={setQuery} /></div>
      {loading && <p className="mb-4 text-sm font-bold text-muted">Memuat data...</p>}
      <DataTable columns={columns} rows={rows} onView={viewMedicine} onEdit={openEdit} onDelete={requestDeleteMedicine} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Nonaktifkan Obat"
        message={deleteTarget ? `Nonaktifkan obat ${deleteTarget.name}? Obat tidak akan muncul lagi di katalog aktif.` : "Nonaktifkan obat ini?"}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteMedicine}
      />
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
              <input
                className="field"
                placeholder="Contoh: 25.000"
                inputMode="numeric"
                value={form.selling_price}
                onChange={(e) => setForm({ ...form, selling_price: formatMoneyInput(e.target.value) })}
                required
              />
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
      Toast.success("Data tersimpan");
  };

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} action={<button className="btn-primary" onClick={createSimple}><FiPlus /> Tambah Data</button>} />
      <DataTable columns={[{ key: "name", label: "Nama" }, { key: "description", label: "Deskripsi" }, { key: "phone", label: "Kontak" }, { key: "status", label: "Status", type: "badge" }]} rows={rows} />
    </>
  );
}

export function SupplierManagement() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ id: "", name: "", contact_person: "", phone: "", email: "", address: "", tax_number: "", is_active: true });

  const load = () => supplierService.list().then((data) => setRows(normalizeList(data))).catch((error) => Toast.error(error?.response?.data?.message || "Gagal memuat supplier"));
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ id: "", name: "", contact_person: "", phone: "", email: "", address: "", tax_number: "", is_active: true });
    setOpen(true);
  };

  const openEdit = (row) => {
    setForm({
      id: row.id,
      name: row.name || "",
      contact_person: row.contact_person || "",
      phone: row.phone || "",
      email: row.email || "",
      address: row.address || "",
      tax_number: row.tax_number || "",
      is_active: row.is_active ?? true
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return Toast.warning("Nama supplier wajib diisi");
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        contact_person: form.contact_person.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        tax_number: form.tax_number.trim() || null,
        is_active: Boolean(form.is_active)
      };
      if (form.id) {
        await supplierService.update(form.id, payload);
      } else {
        await supplierService.create(payload);
      }
      setOpen(false);
      await load();
      Toast.success(form.id ? "Supplier diperbarui" : "Supplier tersimpan");
    } catch (error) {
      Toast.error(error?.response?.data?.detail || error?.response?.data?.message || error?.message || "Gagal menyimpan supplier");
    } finally {
      setSaving(false);
    }
  };

  const requestRemove = (row) => {
    setDeleteTarget(row);
  };

  const confirmRemove = async () => {
    if (!deleteTarget?.id) return;
    try {
      await supplierService.remove(deleteTarget.id);
      await load();
      Toast.success("Supplier dinonaktifkan");
      setDeleteTarget(null);
    } catch (error) {
      Toast.error(error?.response?.data?.detail || error?.response?.data?.message || error?.message || "Gagal menonaktifkan supplier");
    }
  };

  const columns = [
    { key: "name", label: "Supplier", render: (row) => <div><p className="font-extrabold text-primary">{row.name}</p><p className="text-xs text-muted">{row.contact_person || "-"}</p></div> },
    { key: "phone", label: "Telepon", render: (row) => row.phone || "-" },
    { key: "email", label: "Email", render: (row) => row.email || "-" },
    { key: "tax_number", label: "NPWP", render: (row) => row.tax_number || "-" },
    { key: "is_active", label: "Status", render: (row) => row.is_active === false ? "Nonaktif" : "Aktif" }
  ];

  return (
    <>
      <PageHeader
        title="Manajemen Supplier"
        subtitle="Kelola supplier obat sesuai master data."
        action={<button type="button" className="btn-primary" onClick={openCreate}><FiPlus /> Tambah Supplier</button>}
      />
      <DataTable rows={rows} columns={columns} onEdit={openEdit} onDelete={requestRemove} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Nonaktifkan Supplier"
        message={deleteTarget ? `Nonaktifkan supplier ${deleteTarget.name}? Supplier tidak akan dipakai untuk data baru.` : "Nonaktifkan supplier ini?"}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmRemove}
      />
      <ModalForm
        open={open}
        title={form.id ? "Edit Supplier" : "Tambah Supplier"}
        onClose={() => setOpen(false)}
        footer={<><button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Batal</button><button type="button" className="btn-primary" onClick={save} disabled={saving}>{saving ? "Menyimpan..." : "Simpan Supplier"}</button></>}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-bold text-muted">
            Nama supplier *
            <input className="field mt-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="block text-sm font-bold text-muted">
            Contact person
            <input className="field mt-2" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
          </label>
          <label className="block text-sm font-bold text-muted">
            Telepon
            <input className="field mt-2" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label className="block text-sm font-bold text-muted">
            Email
            <input className="field mt-2" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="block text-sm font-bold text-muted md:col-span-2">
            Alamat
            <textarea className="field mt-2" rows="3" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </label>
          <label className="block text-sm font-bold text-muted">
            NPWP
            <input className="field mt-2" value={form.tax_number} onChange={(e) => setForm({ ...form, tax_number: e.target.value })} />
          </label>
          <label className="flex items-center gap-3 rounded-xl bg-surface-low p-4 text-sm font-bold text-primary">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            Supplier aktif
          </label>
        </div>
      </ModalForm>
    </>
  );
}

export function TransactionsManagement({ title = "Manajemen Transaksi", subtitle = "Kelola transaksi penjualan kasir dan online.", cashierMode = false, orderTypeFilter = null }) {
  const [rows, setRows] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [medicineQuery, setMedicineQuery] = useState("");
  const [transactionQuery, setTransactionQuery] = useState("");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState("ALL");
  const [selectedMedicine, setSelectedMedicine] = useState("");
  const [customerName, setCustomerName] = useState("Pelanggan Walk-in");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [checkingOut, setCheckingOut] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [receiptItems, setReceiptItems] = useState([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const loadTransactions = () => orderService.transactions().then((data) => setRows(normalizeList(data))).catch((error) => Toast.error(error?.response?.data?.message || "Gagal memuat transaksi"));
  useEffect(() => {
    if (!cashierMode) loadTransactions();
  }, [cashierMode]);
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
  const filteredMedicines = medicineQuery.trim()
    ? medicines.filter((item) => {
        const needle = medicineQuery.toLowerCase();
        return [
          item.name,
          item.sku,
          item.generic_name,
          item.category_name,
          item.supplier_name
        ].some((value) => String(value || "").toLowerCase().includes(needle));
      })
    : medicines;
  const filteredOrders = rows.filter((row) => {
    const matchesType = orderTypeFilter
      ? String(row?.order_type || "").toUpperCase() === String(orderTypeFilter).toUpperCase()
      : transactionTypeFilter === "ALL"
        ? true
        : String(row?.order_type || "").toUpperCase() === transactionTypeFilter;
    if (!matchesType) return false;
    if (!transactionQuery.trim()) return true;
    const needle = transactionQuery.toLowerCase();
    return [
      row.order_number,
      row.customer_name_snapshot,
      row.patient_id,
      row.status,
      row.order_type,
      row.payment_method,
      row.payment_status,
      row.payment_number
    ].some((value) => String(value || "").toLowerCase().includes(needle));
  });
  const exportTransactionsCsv = () => {
    const header = ["Order Number", "Type", "Pelanggan", "Status", "Payment Method", "Payment Status", "Total", "Checkout At"];
    const body = filteredOrders.map((row) => [
      row.order_number || "-",
      row.order_type || "-",
      row.customer_name_snapshot || row.patient_id || "-",
      row.status || "-",
      row.payment_method || "-",
      row.payment_status || "-",
      row.total_amount ?? 0,
      row.checkout_at ? new Date(row.checkout_at).toLocaleString("id-ID") : "-"
    ]);
    const csv = [header, ...body].map((line) => line.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `transaksi-${transactionTypeFilter.toLowerCase() === "all" ? "semua" : transactionTypeFilter.toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
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
  const addCashierMedicine = (medicine) => {
    if (!medicine?.id) return;
    setSelectedMedicine(String(medicine.id));
    setCartItems((current) => {
      const existing = current.find((item) => String(item.medicine_id) === String(medicine.id));
      if (existing) {
        return current.map((item) => String(item.medicine_id) === String(medicine.id)
          ? { ...item, quantity: Math.min(item.current_stock, item.quantity + 1) }
          : item);
      }
      return [...current, { medicine_id: medicine.id, medicine, current_stock: medicine.current_stock, quantity: 1 }];
    });
    Toast.success(`${medicine.name} ditambahkan ke keranjang`);
  };
  const updateCashierQty = (medicineId, delta) => {
    setCartItems((current) => current
      .map((item) => String(item.medicine_id) === String(medicineId)
        ? { ...item, quantity: Math.min(item.current_stock, Math.max(0, item.quantity + delta)) }
        : item)
      .filter((item) => item.quantity > 0));
  };
  const removeCashierItem = (medicineId) => {
    setCartItems((current) => current.filter((item) => String(item.medicine_id) !== String(medicineId)));
  };
  const cashierTotal = cartItems.reduce((sum, item) => sum + Number(item.medicine?.selling_price || 0) * item.quantity, 0);
  const checkoutCashier = async () => {
    if (!cartItems.length) return Toast.warning("Keranjang kasir masih kosong");
    setCheckingOut(true);
    try {
      const snapshotItems = cartItems.map((item) => ({ ...item }));
      const order = await orderService.cashierCheckout({
        items: cartItems.map((item) => ({ medicine_id: item.medicine_id, quantity: item.quantity })),
        payment_method: paymentMethod,
        customer_name: customerName.trim() || "Pelanggan Walk-in"
      });
      setCartItems([]);
      setReceiptOrder({
        ...order,
        payment_method: paymentMethod,
        customer_name_snapshot: customerName.trim() || "Pelanggan Walk-in"
      });
      setReceiptItems(snapshotItems);
      setReceiptOpen(true);
      const data = await orderService.transactions();
      setRows(normalizeList(data));
      Toast.success(`Checkout ${order.order_number || ""} berhasil`);
    } catch (error) {
      Toast.error(error?.response?.data?.detail || error?.response?.data?.message || error?.message || "Checkout kasir gagal");
    } finally {
      setCheckingOut(false);
    }
  };
  const updateOrderStatus = async (row, status) => {
    try {
      await orderService.updateStatus(row.id, status);
      await loadTransactions();
      Toast.success(`Status order diperbarui ke ${status.replaceAll("_", " ")}`);
    } catch (error) {
      Toast.error(error?.response?.data?.detail || error?.response?.data?.message || error?.message || "Gagal memperbarui status order");
    }
  };
  const openTransactionDetail = async (row) => {
    if (!row?.id) return;
    setDetailOpen(true);
    setDetailLoading(true);
    setSelectedTransaction(row);
    try {
      const detail = await orderService.detail(row.id);
      setSelectedTransaction(detail || row);
    } catch (error) {
      Toast.error(error?.response?.data?.detail || error?.response?.data?.message || error?.message || "Gagal memuat detail transaksi");
    } finally {
      setDetailLoading(false);
    }
  };
  const printInvoice = (row) => {
    const data = row || selectedTransaction || {};
    const html = `
      <html>
        <head><title>Invoice ${data.order_number || data.id || "-"}</title></head>
        <body style="font-family: Arial, sans-serif; padding: 32px;">
          <h1>Klinik Makmur Jaya</h1>
          <h2>Invoice ${data.order_number || data.id}</h2>
          <p>Pelanggan: ${data.customer_name_snapshot || data.patient_id || "-"}</p>
          <p>Status: ${data.status || "-"}</p>
          <p>Total: ${rupiah(data.total_amount)}</p>
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
  const renderOrderWorkflowActions = (row) => (
    <div className="flex flex-wrap gap-2">
      {row?.status === "PAID" && (
        <button className="btn-secondary px-3 py-2 text-xs" type="button" onClick={() => updateOrderStatus(row, "PROCESSING")}>
          <FiPackage /> Packaging
        </button>
      )}
      {row?.status === "PROCESSING" && (
        <button className="btn-secondary px-3 py-2 text-xs" type="button" onClick={() => updateOrderStatus(row, "READY_FOR_PICKUP")}>
          <FiCheckCircle /> Siap Diambil
        </button>
      )}
      {row?.status === "READY_FOR_PICKUP" && (
        <button className="btn-secondary px-3 py-2 text-xs" type="button" onClick={() => updateOrderStatus(row, "COMPLETED")}>
          <FiCheckCircle /> Selesai
        </button>
      )}
      {!["PAID", "PROCESSING", "READY_FOR_PICKUP"].includes(row?.status) && <span className="text-xs text-muted">-</span>}
    </div>
  );
  const table = (
    <>
      {!cashierMode && (
        <div className="mb-6 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <SearchBar
            value={transactionQuery}
            onChange={setTransactionQuery}
            placeholder="Cari order, pelanggan, payment, atau status..."
            suggestions={rows.map((item) => item.order_number)}
            onSelect={setTransactionQuery}
          />
          <select className="field h-12" value={transactionTypeFilter} onChange={(event) => setTransactionTypeFilter(event.target.value)}>
            <option value="ALL">Semua Transaksi</option>
            <option value="ONLINE">Online</option>
            <option value="OFFLINE">Offline</option>
          </select>
          <button type="button" className="btn-secondary h-12" onClick={exportTransactionsCsv}>
            <FiDownload /> Download CSV
          </button>
        </div>
      )}
      <DataTable
        rows={filteredOrders}
        columns={[
          { key: "order_number", label: "ID" },
          { key: "customer_name_snapshot", label: "Pelanggan", render: (row) => row.customer_name_snapshot || row.patient_id || "-" },
          { key: "total_amount", label: "Total", render: (row) => rupiah(row.total_amount) },
          { key: "status", label: "Status", type: "badge" },
          {
            key: "workflow",
            label: "Alur",
            render: (row) => renderOrderWorkflowActions(row)
          }
        ]}
        onView={openTransactionDetail}
      />
      <ModalForm
        open={detailOpen}
        title={selectedTransaction ? `Detail ${selectedTransaction.order_number || selectedTransaction.id}` : "Detail Transaksi"}
        onClose={() => {
          setDetailOpen(false);
          setSelectedTransaction(null);
        }}
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => printInvoice(selectedTransaction)}
              disabled={!selectedTransaction}
            >
              <FiDownload /> Print Invoice
            </button>
            <button type="button" className="btn-secondary" onClick={() => {
              setDetailOpen(false);
              setSelectedTransaction(null);
            }}>
              Tutup
            </button>
          </>
        }
      >
        {detailLoading ? (
          <p className="text-sm font-bold text-muted">Memuat detail transaksi...</p>
        ) : selectedTransaction ? (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <InfoRow label="Nomor Order" value={selectedTransaction.order_number || selectedTransaction.id || "-"} />
              <InfoRow label="Pelanggan" value={selectedTransaction.customer_name_snapshot || selectedTransaction.patient_id || "-"} />
              <InfoRow label="Status" value={selectedTransaction.status || "-"} />
              <InfoRow label="Metode Pembayaran" value={selectedTransaction.payment_method || "-"} />
              <InfoRow label="Status Pembayaran" value={selectedTransaction.payment_status || "-"} />
              <InfoRow label="Total" value={rupiah(selectedTransaction.total_amount)} />
            </div>
            <div className="rounded-2xl border border-outline/60 bg-surface-low p-4">
              <p className="text-sm font-bold text-primary">Aksi Status</p>
              <div className="mt-3">
                {renderOrderWorkflowActions(selectedTransaction)}
              </div>
            </div>
            <div className="rounded-2xl border border-outline/60 bg-surface-low p-4">
              <p className="text-sm font-bold text-primary">Item Transaksi</p>
              <div className="mt-3 space-y-3">
                {(selectedTransaction.items || []).map((item) => (
                  <div key={item.id || `${item.medicine_id}-${item.batch_number_snapshot || ""}`} className="flex items-start justify-between gap-4 rounded-2xl bg-white p-4">
                    <div>
                      <p className="font-bold text-primary">{item.medicine_name_snapshot || "-"}</p>
                      <p className="text-xs text-muted">
                        Batch: {item.batch_number_snapshot || "-"}
                        {item.expired_date_snapshot ? ` | Expired: ${new Date(item.expired_date_snapshot).toLocaleDateString("id-ID")}` : ""}
                      </p>
                    </div>
                    <div className="text-right text-sm font-bold text-primary">
                      <p>{item.quantity || 0} pcs</p>
                      <p>{rupiah(item.line_total || 0)}</p>
                    </div>
                  </div>
                ))}
                {!selectedTransaction.items?.length && <p className="text-sm text-muted">Rincian item belum tersedia.</p>}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <InfoRow label="Nomor Pembayaran" value={selectedTransaction.payment_number || "-"} />
              <InfoRow label="Bukti Pembayaran" value={selectedTransaction.proof_file_url ? "Tersedia" : "-"} />
              <InfoRow label="Dikirim" value={selectedTransaction.proof_uploaded_at ? new Date(selectedTransaction.proof_uploaded_at).toLocaleString("id-ID") : "-"} />
              <InfoRow label="Diverifikasi" value={selectedTransaction.verified_at ? new Date(selectedTransaction.verified_at).toLocaleString("id-ID") : "-"} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">Detail transaksi tidak tersedia.</p>
        )}
      </ModalForm>
    </>
  );
  if (!cashierMode) return <><PageHeader title={title} subtitle={subtitle} />{table}</>;
  const cashierCatalog = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-xl font-extrabold text-primary">Menu Obat Kasir</h3>
          <p className="text-sm text-muted">Tambah obat langsung ke keranjang tanpa buka detail.</p>
        </div>
        <span className="rounded-full bg-surface-low px-4 py-2 text-sm font-bold text-primary">{filteredMedicines.length} obat</span>
      </div>
      <SearchBar
        value={medicineQuery}
        onChange={setMedicineQuery}
        placeholder="Cari obat, SKU, kategori, atau supplier..."
        suggestions={medicines.map((item) => item.name)}
        onSelect={setMedicineQuery}
      />
      <DataTable
        rows={filteredMedicines}
        columns={[
          { key: "name", label: "Obat", render: (row) => <div className="flex items-center gap-3"><img src={row.image_url || "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=200&q=80"} alt={row.name} className="h-12 w-12 rounded-xl object-cover" /><div><p className="font-extrabold text-primary">{row.name}</p><p className="text-xs text-muted">SKU: {row.sku}</p></div></div> },
          { key: "selling_price", label: "Harga", render: (row) => rupiah(row.selling_price) },
          { key: "current_stock", label: "Stok", render: (row) => row.current_stock ?? 0 },
          { key: "requires_prescription", label: "Resep", render: (row) => row.requires_prescription ? "Wajib" : "Bebas" },
          {
            key: "action",
            label: "Aksi",
            render: (row) => (
              <button
                type="button"
                className="btn-secondary px-3 py-2 text-xs"
                onClick={() => addCashierMedicine(row)}
                disabled={Number(row.current_stock || 0) <= 0}
              >
                <FiPlus /> Tambah ke Keranjang
              </button>
            )
          }
        ]}
      />
    </div>
  );
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">{cashierCatalog}</div>
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
          </div>
          <div className="mt-5 space-y-3">
            {cartItems.map((item) => (
              <div key={item.medicine_id} className="rounded-2xl bg-surface-low p-4">
                <p className="font-bold">{item.medicine?.name || item.medicine_id}</p>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-sm font-bold text-muted">{rupiah(Number(item.medicine?.selling_price || 0) * item.quantity)}</p>
                  <div className="flex items-center gap-2">
                    <button type="button" className="icon-btn h-8 w-8" onClick={() => updateCashierQty(item.medicine_id, -1)}><FiMinus /></button>
                    <span className="w-6 text-center font-extrabold">{item.quantity}</span>
                    <button type="button" className="icon-btn h-8 w-8" onClick={() => updateCashierQty(item.medicine_id, 1)}><FiPlus /></button>
                    <button type="button" className="icon-btn h-8 w-8 text-danger" onClick={() => removeCashierItem(item.medicine_id)}><FiTrash2 /></button>
                  </div>
                </div>
              </div>
            ))}
            {!cartItems.length && <p className="text-sm text-muted">Belum ada item di keranjang.</p>}
          </div>
          <div className="mt-6 flex justify-between text-lg font-extrabold"><span>Total</span><span>{rupiah(cashierTotal)}</span></div>
          <button type="button" className="btn-primary mt-6 w-full" onClick={checkoutCashier} disabled={checkingOut || !cartItems.length}>
            {checkingOut ? "Memproses..." : "Checkout Kasir"}
          </button>
        </aside>
      </div>
      <ModalForm
        open={receiptOpen}
        title="Struk Checkout"
        onClose={() => {
          setReceiptOpen(false);
          setReceiptOrder(null);
          setReceiptItems([]);
          setCustomerName("Pelanggan Walk-in");
          setPaymentMethod("CASH");
        }}
        footer={
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setReceiptOpen(false);
              setReceiptOrder(null);
              setReceiptItems([]);
              setCustomerName("Pelanggan Walk-in");
              setPaymentMethod("CASH");
            }}
          >
            Kembali ke POS Kasir
          </button>
        }
      >
        <div className="space-y-5">
          <div className="rounded-2xl bg-surface-low p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <InfoRow label="Nomor Order" value={receiptOrder?.order_number || "-"} />
              <InfoRow label="Pelanggan" value={receiptOrder?.customer_name_snapshot || customerName || "-"} />
              <InfoRow label="Metode Bayar" value={receiptOrder?.payment_method || paymentMethod || "-"} />
              <InfoRow label="Total" value={rupiah(receiptOrder?.total_amount || cashierTotal)} />
            </div>
          </div>
          <div className="rounded-2xl border border-outline/60 bg-white p-4">
            <p className="text-sm font-bold text-primary">Item yang dibayar</p>
            <div className="mt-3 space-y-3">
              {receiptItems.map((item) => (
                <div key={item.medicine_id} className="flex items-center justify-between rounded-2xl bg-surface-low px-4 py-3">
                  <div>
                    <p className="font-bold text-primary">{item.medicine?.name || item.medicine_id}</p>
                    <p className="text-xs text-muted">{item.quantity} x {rupiah(item.medicine?.selling_price || 0)}</p>
                  </div>
                  <p className="font-bold text-primary">{rupiah(Number(item.medicine?.selling_price || 0) * item.quantity)}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-sm text-muted">Struk sudah dibuat. Klik kembali ke POS untuk melayani transaksi berikutnya.</p>
        </div>
      </ModalForm>
    </>
  );
}

export function PaymentVerificationManagement() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [notes, setNotes] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      setRows(normalizeList(await paymentService.reviewList()));
    } catch (error) {
      Toast.error(error?.response?.data?.detail || error?.response?.data?.message || "Gagal memuat verifikasi pembayaran");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openDetail = (row) => {
    setSelected(row);
    setNotes(row?.rejection_reason || "");
    setOpen(true);
  };

  const closeDetail = () => {
    setOpen(false);
    setSelected(null);
    setNotes("");
    setPreviewOpen(false);
    setRejectConfirmOpen(false);
  };

  const openPreview = () => {
    if (!selected?.proof_file_url) return;
    setPreviewOpen(true);
  };

  const verifyPayment = async (status) => {
    if (!selected?.id) return;
    if (status === "REJECTED" && !notes.trim()) {
      Toast.warning("Isi alasan penolakan terlebih dahulu");
      return;
    }
    setSaving(true);
    try {
      await paymentService.verify(selected.id, { status, notes: notes.trim() || null });
      Toast.success(status === "VERIFIED" ? "Pembayaran diverifikasi" : "Pembayaran ditolak");
      closeDetail();
      await load();
    } catch (error) {
      Toast.error(error?.response?.data?.detail || error?.response?.data?.message || error?.message || "Gagal memproses verifikasi pembayaran");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: "payment_number", label: "No. Pembayaran" },
    { key: "order_number", label: "Order", render: (row) => row.order_number || "-" },
    { key: "patient_name", label: "Pasien", render: (row) => row.patient_name || "-" },
    { key: "method", label: "Metode" },
    { key: "amount", label: "Jumlah", render: (row) => rupiah(row.amount) },
    { key: "proof_uploaded_at", label: "Dikirim", render: (row) => row.proof_uploaded_at ? new Date(row.proof_uploaded_at).toLocaleString("id-ID") : "-" },
    { key: "status", label: "Status", type: "badge" }
  ];

  return (
    <>
      <PageHeader
        title="Verifikasi Pembayaran"
        subtitle="Periksa bukti pembayaran yang masuk, lalu setujui atau tolak dari sini."
        action={<button type="button" className="btn-secondary" onClick={load} disabled={loading}><FiRefreshCw /> Refresh</button>}
      />
      {loading && <p className="mb-4 text-sm font-bold text-muted">Memuat bukti pembayaran...</p>}
      <DataTable rows={rows} columns={columns} onView={openDetail} />
      <ModalForm
        open={open}
        title={selected ? `Verifikasi ${selected.payment_number}` : "Verifikasi Pembayaran"}
        onClose={closeDetail}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={closeDetail}>Batal</button>
            <button type="button" className="btn-secondary" onClick={() => setRejectConfirmOpen(true)} disabled={saving}>Tolak</button>
            <button type="button" className="btn-primary" onClick={() => verifyPayment("VERIFIED")} disabled={saving}>Setujui</button>
          </>
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <PaymentInfoRow label="Order" value={selected.order_number || "-"} />
              <PaymentInfoRow label="Pasien" value={selected.patient_name || "-"} />
              <PaymentInfoRow label="Metode" value={selected.method || "-"} />
              <PaymentInfoRow label="Jumlah" value={rupiah(selected.amount)} />
              <PaymentInfoRow label="Status" value={selected.status || "-"} />
              <PaymentInfoRow label="Dikirim" value={selected.proof_uploaded_at ? new Date(selected.proof_uploaded_at).toLocaleString("id-ID") : "-"} />
            </div>
            <div className="rounded-2xl border border-outline/60 bg-surface-low p-4">
              <p className="text-sm font-bold text-primary">Bukti Pembayaran</p>
              {selected.proof_file_url ? (
                <button
                  type="button"
                  onClick={openPreview}
                  className="mt-3 block w-full overflow-hidden rounded-2xl border border-outline/60 bg-white text-left"
                >
                  <img src={selected.proof_file_url} alt="Bukti pembayaran" className="max-h-64 w-full object-contain" />
                  <div className="border-t border-outline/40 px-4 py-3 text-xs font-bold text-primary">Klik untuk buka detail bukti pembayaran</div>
                </button>
              ) : (
                <p className="mt-3 text-sm text-muted">Bukti pembayaran belum tersedia.</p>
              )}
            </div>
            <label className="block text-sm font-bold text-muted">
              Catatan penolakan
              <textarea
                className="field mt-2"
                rows="3"
                placeholder="Isi jika bukti pembayaran ditolak"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>
          </div>
        )}
      </ModalForm>
      <ConfirmDialog
        open={rejectConfirmOpen}
        title="Tolak Pembayaran"
        message={selected ? `Tolak bukti pembayaran ${selected.payment_number || "-"}? Pastikan alasan penolakan sudah diisi.` : "Tolak bukti pembayaran ini?"}
        onCancel={() => setRejectConfirmOpen(false)}
        onConfirm={async () => {
          setRejectConfirmOpen(false);
          await verifyPayment("REJECTED");
        }}
      />
      <ModalForm
        open={previewOpen}
        title={selected ? `Preview Bukti ${selected.payment_number}` : "Preview Bukti Pembayaran"}
        onClose={() => setPreviewOpen(false)}
        footer={<button type="button" className="btn-secondary" onClick={() => setPreviewOpen(false)}>Tutup</button>}
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <PaymentInfoRow label="Order" value={selected.order_number || "-"} />
              <PaymentInfoRow label="Pasien" value={selected.patient_name || "-"} />
              <PaymentInfoRow label="Metode" value={selected.method || "-"} />
              <PaymentInfoRow label="Jumlah" value={rupiah(selected.amount)} />
            </div>
            {selected.proof_file_url ? (
              <div className="overflow-hidden rounded-2xl border border-outline/60 bg-surface-low">
                <img src={selected.proof_file_url} alt="Preview bukti pembayaran" className="max-h-[70vh] w-full object-contain" />
              </div>
            ) : (
              <p className="text-sm text-muted">Bukti pembayaran belum tersedia.</p>
            )}
          </div>
        )}
      </ModalForm>
    </>
  );
}

function PaymentInfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-right text-sm font-bold text-primary">{value}</span>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-right text-sm font-bold text-primary">{value}</span>
    </div>
  );
}

export function PrescriptionsManagement() {
  const [pendingRows, setPendingRows] = useState([]);
  const [historyRows, setHistoryRows] = useState([]);
  useEffect(() => {
    Promise.all([prescriptionService.pending(), prescriptionService.history()])
      .then(([pendingData, historyData]) => {
        setPendingRows(normalizeList(pendingData));
        setHistoryRows(normalizeList(historyData));
      })
      .catch((error) => Toast.error(error?.response?.data?.message || "Gagal memuat resep"));
  }, []);
  const columns = [
    { key: "id", label: "ID Resep" },
    { key: "order_id", label: "Order" },
    { key: "patient_id", label: "Pasien" },
    { key: "doctor_name", label: "Dokter" },
    { key: "prescription_number", label: "Nomor Resep" },
    { key: "status", label: "Status", type: "badge" },
    { key: "uploaded_at", label: "Dikirim", render: (row) => row.uploaded_at ? new Date(row.uploaded_at).toLocaleString("id-ID") : "-" }
  ];
  return (
    <>
      <PageHeader title="Manajemen Resep" subtitle="Pantau antrean verifikasi dan riwayat resep yang pernah dikirim." />
      <div className="space-y-8">
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h3 className="text-xl font-extrabold text-primary">Antrean Resep Pending</h3>
              <p className="text-sm text-muted">Resep yang masih menunggu verifikasi apoteker.</p>
            </div>
            <span className="rounded-full bg-warning-soft px-4 py-2 text-sm font-bold text-warning">{pendingRows.length} antrean</span>
          </div>
          <DataTable rows={pendingRows} columns={columns} />
        </section>
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h3 className="text-xl font-extrabold text-primary">Riwayat Resep</h3>
              <p className="text-sm text-muted">Semua resep yang pernah dikirim, termasuk yang sudah disetujui atau ditolak.</p>
            </div>
            <span className="rounded-full bg-surface-low px-4 py-2 text-sm font-bold text-primary">{historyRows.length} catatan</span>
          </div>
          <DataTable rows={historyRows} columns={columns} />
        </section>
      </div>
    </>
  );
}

export function StockManagement({ mode = "all" }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [batchOpen, setBatchOpen] = useState(false);
  const [showManufactureDate, setShowManufactureDate] = useState(false);
  const [batchNumberHint, setBatchNumberHint] = useState("");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [discardTarget, setDiscardTarget] = useState(null);
  const [discarding, setDiscarding] = useState(false);
  const [batchForm, setBatchForm] = useState({ medicine_id: "", supplier_id: "", batch_number: "", manufacture_date: "", expired_date: "", received_date: new Date().toISOString().slice(0, 10), initial_quantity: "", unit_cost: "" });
  const [adjustForm, setAdjustForm] = useState({ medicine_batch_id: "", quantity_delta: "", notes: "" });
  useEffect(() => {
    loadStocks();
  }, [mode]);
  const openBatchModal = () => {
    setBatchForm({ medicine_id: "", supplier_id: "", batch_number: "", manufacture_date: "", expired_date: "", received_date: new Date().toISOString().slice(0, 10), initial_quantity: "", unit_cost: "" });
    setBatchNumberHint("");
    setShowManufactureDate(false);
    setBatchOpen(true);
  };
  const loadStocks = () => {
    const loader = mode === "critical" ? stockService.critical : mode === "expired" ? stockService.batches : stockService.list;
    return loader().then((data) => setRows(normalizeList(data))).catch((error) => Toast.error(error?.response?.data?.message || "Gagal memuat stok"));
  };
  const isExpiredBatch = (row) => {
    const daysRemaining = Number(row?.days_remaining);
    if (Number.isFinite(daysRemaining) && daysRemaining <= 0) return true;
    return String(row?.status || "").trim().toLowerCase() === "expired";
  };
  const deriveNextBatchNumber = (batchNumbers = []) => {
    const normalized = batchNumbers
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
    const lastBatch = normalized.at(-1);
    if (!lastBatch) return "BTH-001";
    const match = lastBatch.match(/^(.*?)(\d+)$/);
    if (!match) return `${lastBatch}-001`;
    const prefix = match[1];
    const digits = match[2];
    const nextNumber = String(Number(digits) + 1).padStart(digits.length, "0");
    return `${prefix}${nextNumber}`;
  };
  useEffect(() => {
    if (!batchForm.medicine_id) {
      setBatchNumberHint("");
      return;
    }
    medicineService.batches(batchForm.medicine_id)
      .then((data) => {
        const batches = normalizeList(data);
        const nextBatchNumber = deriveNextBatchNumber(batches.map((item) => item.batch_number));
        setBatchNumberHint(nextBatchNumber);
        setBatchForm((current) => ({
          ...current,
          batch_number: current.batch_number?.trim() ? current.batch_number : nextBatchNumber
        }));
      })
      .catch(() => {
        const fallback = "BTH-001";
        setBatchNumberHint(fallback);
        setBatchForm((current) => ({
          ...current,
          batch_number: current.batch_number?.trim() ? current.batch_number : fallback
        }));
      });
  }, [batchForm.medicine_id]);
  const createBatch = async () => {
    const effectiveBatchNumber = batchForm.batch_number || batchNumberHint;
    if (!batchForm.medicine_id || !effectiveBatchNumber || !batchForm.expired_date || !batchForm.received_date || !batchForm.initial_quantity) {
      Toast.warning("Obat, tanggal masuk gudang, tanggal kadaluarsa, dan jumlah awal wajib diisi");
      return;
    }
    if (batchForm.expired_date < batchForm.received_date) {
      Toast.warning("Tanggal kadaluarsa tidak boleh lebih awal dari tanggal masuk gudang");
      return;
    }
    try {
      await stockService.addBatch({
        ...batchForm,
        batch_number: effectiveBatchNumber,
        supplier_id: batchForm.supplier_id || null,
        manufacture_date: batchForm.manufacture_date || null,
        initial_quantity: Number(batchForm.initial_quantity || 0),
        unit_cost: batchForm.unit_cost ? Number(batchForm.unit_cost) : null
      });
      setBatchOpen(false);
      setShowManufactureDate(false);
      await loadStocks();
      Toast.success("Batch stok tersimpan");
    } catch (error) {
      Toast.error(error?.response?.data?.detail || error?.response?.data?.message || error?.message || "Gagal menyimpan batch stok");
    }
  };
  const adjustStock = async () => {
    await stockService.adjustment({
      medicine_batch_id: adjustForm.medicine_batch_id,
      quantity_delta: Number(adjustForm.quantity_delta || 0),
      notes: adjustForm.notes
    });
    setAdjustOpen(false);
    await loadStocks();
    Toast.success("Adjustment stok tersimpan");
  };
  const requestDiscard = (row) => {
    if (!isExpiredBatch(row)) return;
    setDiscardTarget(row);
  };
  const confirmDiscard = async () => {
    const batchId = discardTarget?.medicine_batch_id || discardTarget?.id;
    if (!batchId) return;
    setDiscarding(true);
    try {
      await stockService.discardBatch(batchId);
      setDiscardTarget(null);
      await loadStocks();
      Toast.success("Batch expired dibuang dan stok berkurang");
    } catch (error) {
      Toast.error(error?.response?.data?.detail || error?.response?.data?.message || error?.message || "Gagal membuang batch expired");
    } finally {
      setDiscarding(false);
    }
  };
  const openDetail = (row) => {
    const targetId = row?.medicine_id || row?.id;
    if (!targetId) return;
    navigate(`/apoteker/stocks/${targetId}`);
  };
  const title = mode === "critical" ? "Critical Stock Alert" : mode === "expired" ? "Batch Kadaluarsa" : "Stock Management";
  const subtitle = mode === "expired"
    ? "Semua batch tampil di sini, dengan status untuk menandai yang masih aman, menipis, atau sudah expired."
    : "Monitoring stok, batch, dan tanggal kadaluarsa obat.";
  const filteredRows = query.trim()
    ? rows.filter((row) => {
        const needle = query.toLowerCase();
        return [
          row.name,
          row.batch_number,
          row.expired_date,
          row.status,
          row.medicine_name,
          row.sku
        ].some((value) => String(value || "").toLowerCase().includes(needle));
      })
    : rows;
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
      <PageHeader title={title} subtitle={subtitle} action={mode === "all" && <div className="flex flex-wrap gap-3"><button type="button" className="btn-secondary" onClick={() => setAdjustOpen(true)}>Adjustment</button><button type="button" className="btn-primary" onClick={openBatchModal}><FiPlus /> Tambah Batch</button></div>} />
      <div className="mb-6">
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder={mode === "expired" ? "Cari batch, obat, atau status..." : "Cari obat, batch, atau status stok..."}
          suggestions={[...new Set(rows.map((item) => item.name).filter(Boolean))]}
          onSelect={setQuery}
        />
      </div>
      <DataTable
        rows={filteredRows}
        columns={columns}
        onView={openDetail}
        renderActions={mode === "expired" ? (row) => (
          isExpiredBatch(row) ? (
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-danger/30 bg-danger-soft px-3 py-2 text-xs font-bold text-danger transition hover:bg-danger hover:text-white"
              onClick={() => requestDiscard(row)}
            >
              <FiTrash2 /> Buang
            </button>
          ) : (
            <span className="px-3 py-2 text-xs font-semibold text-muted">-</span>
          )
        ) : null}
      />
      <ModalForm open={batchOpen} title="Tambah Batch Stok" onClose={() => setBatchOpen(false)} footer={<><button type="button" className="btn-secondary" onClick={() => setBatchOpen(false)}>Batal</button><button type="button" className="btn-primary" onClick={createBatch}>Simpan Batch</button></>}>
        <div className="space-y-4">
          <p className="rounded-2xl bg-surface-low p-4 text-sm text-muted">
            Tanggal masuk gudang = kapan batch diterima. Tanggal produksi = opsional. Tanggal kadaluarsa = batas pakai batch.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-bold text-muted">
              Obat *
              <select className="field mt-2" value={batchForm.medicine_id} onChange={(e) => setBatchForm({ ...batchForm, medicine_id: e.target.value, batch_number: "" })}>
                <option value="">Pilih obat</option>
                {rows.map((item) => <option key={item.id || item.medicine_id} value={item.id || item.medicine_id}>{item.name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-bold text-muted">
              Nomor batch *
              <input className="field mt-2 bg-surface-high font-semibold text-muted" placeholder="Otomatis mengikuti batch terakhir" value={batchForm.batch_number || batchNumberHint} readOnly />
              <span className="mt-1 block text-xs font-medium text-muted">Batch akan dibuat otomatis, misalnya berikutnya menjadi {batchNumberHint || "BTH-001"}.</span>
            </label>
            {showManufactureDate && (
              <label className="block text-sm font-bold text-muted">
                Tanggal produksi
                <input className="field mt-2" type="date" value={batchForm.manufacture_date} onChange={(e) => setBatchForm({ ...batchForm, manufacture_date: e.target.value })} />
                <span className="mt-1 block text-xs font-medium text-muted">Opsional, dipakai jika di label ada tanggal produksi.</span>
              </label>
            )}
            <label className="block text-sm font-bold text-muted">
              Tanggal kadaluarsa *
              <input className="field mt-2" type="date" value={batchForm.expired_date} onChange={(e) => setBatchForm({ ...batchForm, expired_date: e.target.value })} />
              <span className="mt-1 block text-xs font-medium text-muted">Tanggal terakhir batch ini boleh dipakai.</span>
            </label>
            <label className="block text-sm font-bold text-muted">
              Tanggal masuk gudang *
              <input className="field mt-2" type="date" value={batchForm.received_date} onChange={(e) => setBatchForm({ ...batchForm, received_date: e.target.value })} />
              <span className="mt-1 block text-xs font-medium text-muted">Tanggal batch diterima dan dicatat di stok.</span>
            </label>
            <label className="block text-sm font-bold text-muted">
              Jumlah awal *
              <input className="field mt-2" type="number" placeholder="Jumlah awal" value={batchForm.initial_quantity} onChange={(e) => setBatchForm({ ...batchForm, initial_quantity: e.target.value })} />
            </label>
            <label className="block text-sm font-bold text-muted">
              Harga modal/unit
              <input className="field mt-2" type="number" placeholder="Harga modal/unit" value={batchForm.unit_cost} onChange={(e) => setBatchForm({ ...batchForm, unit_cost: e.target.value })} />
            </label>
          </div>
          {!showManufactureDate && (
            <button type="button" className="btn-secondary" onClick={() => setShowManufactureDate(true)}>
              Tambahkan tanggal produksi
            </button>
          )}
        </div>
      </ModalForm>
      <ModalForm open={adjustOpen} title="Adjustment Stok" onClose={() => setAdjustOpen(false)} footer={<><button className="btn-secondary" onClick={() => setAdjustOpen(false)}>Batal</button><button className="btn-primary" onClick={adjustStock}>Simpan Adjustment</button></>}>
        <div className="space-y-4">
          <input className="field" placeholder="Medicine batch ID" value={adjustForm.medicine_batch_id} onChange={(e) => setAdjustForm({ ...adjustForm, medicine_batch_id: e.target.value })} />
          <input className="field" type="number" placeholder="Delta qty, contoh: -5 atau 20" value={adjustForm.quantity_delta} onChange={(e) => setAdjustForm({ ...adjustForm, quantity_delta: e.target.value })} />
          <textarea className="field" rows="3" placeholder="Catatan adjustment" value={adjustForm.notes} onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })} />
        </div>
      </ModalForm>
      <ConfirmDialog
        open={Boolean(discardTarget)}
        title="Buang Batch Expired"
        message={discardTarget ? `Buang batch ${discardTarget.batch_number || discardTarget.name}? Stok batch ini akan dihapus dari stok aktif dan total stok obat berkurang.` : "Buang batch expired ini?"}
        onCancel={() => setDiscardTarget(null)}
        onConfirm={confirmDiscard}
      />
    </>
  );
}

export function UserManagement() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  const load = () => {
    setLoading(true);
    return userService.list()
      .then((data) => setRows(normalizeList(data)))
      .catch((error) => Toast.error(error?.response?.data?.detail || error?.response?.data?.message || "Gagal memuat daftar user"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filteredRows = rows.filter((row) => {
    const matchesRole = roleFilter === "ALL" || String(row.role_code || "").toUpperCase() === roleFilter;
    if (!matchesRole) return false;
    if (!query.trim()) return true;
    const needle = query.toLowerCase();
    return [
      row.full_name,
      row.email,
      row.phone,
      row.role_code,
      row.status,
      row.gender
    ].some((value) => String(value || "").toLowerCase().includes(needle));
  });

  const columns = [
    { key: "full_name", label: "Nama", render: (row) => <div><p className="font-extrabold text-primary">{row.full_name || "-"}</p><p className="text-xs text-muted">ID: {row.id || "-"}</p></div> },
    { key: "email", label: "Email" },
    { key: "phone", label: "Telepon", render: (row) => row.phone || "-" },
    { key: "role_code", label: "Role", render: (row) => row.role_code || "-" },
    { key: "status", label: "Status", type: "badge" },
    { key: "gender", label: "Gender", render: (row) => row.gender || "-" }
  ];

  return (
    <>
      <PageHeader
        title="Daftar User"
        subtitle="Lihat data pengguna terdaftar berdasarkan role, status, dan kontak."
        action={<button type="button" className="btn-secondary" onClick={load} disabled={loading}><FiRefreshCw /> Refresh</button>}
      />
      <div className="mb-6 grid gap-3 lg:grid-cols-[1fr_auto]">
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Cari nama, email, telepon, atau role..."
          suggestions={rows.map((item) => item.full_name)}
          onSelect={setQuery}
        />
        <select className="field h-12" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="ALL">Semua Role</option>
          <option value="ADMIN">Admin</option>
          <option value="APOTEKER">Apoteker</option>
          <option value="KASIR">Kasir</option>
          <option value="PASIEN">Pasien</option>
        </select>
      </div>
      {loading && <p className="mb-4 text-sm font-bold text-muted">Memuat daftar user...</p>}
      <DataTable rows={filteredRows} columns={columns} />
    </>
  );
}

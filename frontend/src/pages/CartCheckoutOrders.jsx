import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiClipboard,
  FiCreditCard,
  FiMapPin,
  FiPackage,
  FiShoppingBag
} from "react-icons/fi";
import CartItem from "../components/CartItem";
import DataTable from "../components/DataTable";
import EmptyState from "../components/EmptyState";
import StatusBadge from "../components/StatusBadge";
import UploadPreview from "../components/UploadPreview";
import { Toast } from "../components/Toast";
import { cartService } from "../services/cartService";
import { orderService } from "../services/orderService";
import { normalizeList, rupiah } from "../utils/storage";
import PageHeader from "./PageHeader";

const errorMessage = (error, fallback) => error?.response?.data?.detail || error?.response?.data?.message || error?.message || fallback;
const itemPrice = (item) => Number(item.medicine?.selling_price || item.unit_price_snapshot || item.unit_price || 0);
const orderIdOf = (order) => order?.id || order?.order_id;
const isOnlinePayment = (method) => ["BANK_TRANSFER", "EWALLET"].includes(method);

export function CartPage({ title = "Keranjang", subtitle = "Periksa jumlah obat sebelum melanjutkan checkout." }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setItems(normalizeList(await cartService.get()));
    } catch (error) {
      setItems([]);
      Toast.error(errorMessage(error, "Gagal memuat keranjang"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + itemPrice(item) * (item.quantity || 1), 0),
    [items]
  );

  const updateQty = async (item, nextQuantity) => {
    if (nextQuantity < 1) return;
    try {
      await cartService.update(item.id, { quantity: nextQuantity });
      await load();
    } catch (error) {
      Toast.error(errorMessage(error, "Jumlah item gagal diperbarui"));
    }
  };

  const removeItem = async (item) => {
    try {
      await cartService.remove(item.id);
      await load();
      Toast.success("Item dihapus dari keranjang");
    } catch (error) {
      Toast.error(errorMessage(error, "Item gagal dihapus"));
    }
  };

  if (!loading && !items.length) {
    return (
      <>
        <PageHeader title={title} subtitle={subtitle} />
        <EmptyState title="Keranjang masih kosong" description="Tambahkan obat dari katalog sebelum melanjutkan checkout." />
        <div className="mt-5 flex justify-center">
          <Link className="btn-primary" to="/pasien/catalog"><FiShoppingBag /> Belanja Obat</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {loading && <div className="glass-card p-6 text-sm font-semibold text-muted">Memuat keranjang...</div>}
          {items.map((item) => (
            <CartItem
              key={item.id}
              item={item}
              onInc={() => updateQty(item, (item.quantity || 1) + 1)}
              onDec={() => updateQty(item, (item.quantity || 1) - 1)}
              onRemove={() => removeItem(item)}
            />
          ))}
        </div>
        <aside className="glass-card h-fit p-6">
          <h3 className="text-xl font-extrabold text-primary">Ringkasan Belanja</h3>
          <div className="my-5 flex justify-between text-sm font-semibold text-muted">
            <span>{items.length} jenis obat</span>
            <span>{items.reduce((sum, item) => sum + Number(item.quantity || 1), 0)} item</span>
          </div>
          <div className="mb-6 flex justify-between border-t border-outline pt-4 text-lg font-extrabold">
            <span>Subtotal</span><span>{rupiah(total)}</span>
          </div>
          <Link className="btn-primary w-full" to="/pasien/checkout">Lanjut ke Checkout</Link>
          <Link className="btn-secondary mt-3 w-full" to="/pasien/catalog">Tambah Produk</Link>
        </aside>
      </div>
    </>
  );
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const [method, setMethod] = useState("DELIVERY");
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [shippingAddress, setShippingAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    cartService.get()
      .then((data) => setItems(normalizeList(data)))
      .catch((error) => Toast.error(errorMessage(error, "Gagal memuat keranjang")))
      .finally(() => setLoading(false));
  }, []);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + itemPrice(item) * (item.quantity || 1), 0),
    [items]
  );
  const shippingCost = method === "DELIVERY" ? 10000 : 0;
  const total = subtotal + shippingCost;

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!items.length) nextErrors.cart = "Keranjang kosong. Tambahkan produk terlebih dahulu.";
    if (method === "DELIVERY" && !shippingAddress.trim()) nextErrors.shippingAddress = "Alamat pengiriman wajib diisi.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      const order = await cartService.checkout({
        fulfillment_method: method,
        payment_method: paymentMethod,
        shipping_address: method === "DELIVERY" ? shippingAddress.trim() : null,
        notes: notes.trim() || null
      });
      Toast.success("Pesanan berhasil dibuat");
      navigate(`/pasien/checkout/success/${orderIdOf(order)}`, {
        replace: true,
        state: { order: { ...order, payment_method: paymentMethod } }
      });
    } catch (error) {
      Toast.error(errorMessage(error, "Checkout gagal"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!loading && !items.length) {
    return (
      <>
        <PageHeader title="Checkout" subtitle="Lengkapi pengiriman dan pembayaran." />
        <EmptyState title="Tidak ada item untuk checkout" description="Keranjang kosong atau pesanan sebelumnya sudah selesai dibuat." />
        <div className="mt-5 flex justify-center"><Link className="btn-primary" to="/pasien/catalog">Kembali ke Katalog</Link></div>
      </>
    );
  }

  return (
    <form onSubmit={submit}>
      <PageHeader
        title="Checkout"
        subtitle="Lengkapi metode penerimaan dan pembayaran pesanan."
        action={<Link className="btn-secondary" to="/pasien/cart"><FiArrowLeft /> Kembali ke Keranjang</Link>}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="glass-card p-6">
            <h3 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-primary"><FiMapPin /> Penerimaan Pesanan</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" className={method === "DELIVERY" ? "btn-primary" : "btn-secondary"} onClick={() => setMethod("DELIVERY")}>Antar ke Alamat</button>
              <button type="button" className={method === "PICKUP" ? "btn-primary" : "btn-secondary"} onClick={() => setMethod("PICKUP")}>Ambil di Klinik</button>
            </div>
            {method === "DELIVERY" && (
              <label className="mt-5 block text-sm font-bold text-muted">
                Alamat lengkap
                <textarea
                  className="field mt-2"
                  rows="4"
                  placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, dan patokan"
                  value={shippingAddress}
                  onChange={(event) => {
                    setShippingAddress(event.target.value);
                    setErrors((current) => ({ ...current, shippingAddress: "" }));
                  }}
                />
                {errors.shippingAddress && <span className="mt-1 block text-xs text-danger">{errors.shippingAddress}</span>}
              </label>
            )}
            {method === "PICKUP" && (
              <div className="mt-5 rounded-2xl bg-primary-soft p-4 text-sm text-primary">
                Pesanan diambil di Klinik Makmur Jaya setelah statusnya siap diambil.
              </div>
            )}
            <label className="mt-5 block text-sm font-bold text-muted">
              Catatan pesanan (opsional)
              <textarea className="field mt-2" rows="3" placeholder="Catatan untuk petugas klinik" value={notes} onChange={(event) => setNotes(event.target.value)} />
            </label>
          </section>

          <section className="glass-card p-6">
            <h3 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-primary"><FiCreditCard /> Metode Pembayaran</h3>
            <div className="grid gap-3">
              {[
                ["BANK_TRANSFER", "Transfer Bank", "Upload bukti transfer setelah pesanan dibuat."],
                ["EWALLET", "E-Wallet", "Upload bukti pembayaran setelah pesanan dibuat."],
                ["CASH", "Bayar di Klinik", "Tersedia untuk pengambilan langsung di klinik."]
              ].map(([value, label, description]) => (
                <label key={value} className={`flex cursor-pointer gap-3 rounded-2xl border p-4 ${paymentMethod === value ? "border-primary bg-primary-soft" : "border-outline bg-white"}`}>
                  <input type="radio" name="payment" value={value} checked={paymentMethod === value} onChange={() => setPaymentMethod(value)} />
                  <span><b className="block text-primary">{label}</b><span className="text-sm text-muted">{description}</span></span>
                </label>
              ))}
            </div>
          </section>
        </div>

        <aside className="glass-card h-fit p-6">
          <h3 className="text-xl font-extrabold text-primary">Ringkasan Pesanan</h3>
          <div className="my-5 max-h-72 space-y-3 overflow-y-auto">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between gap-4 text-sm">
                <span className="font-semibold">{item.medicine?.name || item.medicine_name_snapshot || item.medicine_id} x{item.quantity}</span>
                <span className="whitespace-nowrap font-bold">{rupiah(itemPrice(item) * (item.quantity || 1))}</span>
              </div>
            ))}
          </div>
          <div className="space-y-3 border-t border-outline pt-4 text-sm">
            <div className="flex justify-between"><span className="text-muted">Subtotal</span><b>{rupiah(subtotal)}</b></div>
            <div className="flex justify-between"><span className="text-muted">Ongkos kirim</span><b>{rupiah(shippingCost)}</b></div>
            <div className="flex justify-between text-lg font-extrabold text-primary"><span>Total</span><span>{rupiah(total)}</span></div>
          </div>
          {errors.cart && <p className="mt-4 text-sm font-semibold text-danger">{errors.cart}</p>}
          <button className="btn-primary mt-6 w-full" type="submit" disabled={submitting || loading}>
            {submitting ? "Memproses Pesanan..." : "Konfirmasi Pesanan"}
          </button>
        </aside>
      </div>
    </form>
  );
}

export function CheckoutSuccessPage() {
  const { id } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(location.state?.order || null);

  useEffect(() => {
    if (!order && id) {
      orderService.detail(id).then(setOrder).catch((error) => Toast.error(errorMessage(error, "Gagal memuat pesanan")));
    }
  }, [id, order]);

  const paymentMethod = order?.payment_method || order?.payments?.[0]?.method;
  const needsPrescription = order?.status === "WAITING_PRESCRIPTION";

  return (
    <div className="mx-auto max-w-3xl">
      <section className="glass-card p-8 text-center md:p-12">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-secondary-soft text-secondary"><FiCheckCircle size={42} /></div>
        <h1 className="mt-6 text-3xl font-extrabold text-primary">Pesanan Berhasil Dibuat</h1>
        <p className="mt-2 text-muted">Nomor pesanan Anda <b>{order?.order_number || id}</b>.</p>
        <div className="mx-auto mt-8 grid max-w-xl gap-3 rounded-2xl bg-surface-low p-5 text-left sm:grid-cols-2">
          <div><p className="text-xs font-bold uppercase text-muted">Total</p><p className="mt-1 text-xl font-extrabold text-primary">{rupiah(order?.total_amount)}</p></div>
          <div><p className="text-xs font-bold uppercase text-muted">Status</p><div className="mt-2"><StatusBadge status={order?.status} /></div></div>
        </div>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {needsPrescription && <Link className="btn-primary" to={`/pasien/prescriptions/upload?order_id=${id}`}><FiClipboard /> Upload Resep</Link>}
          {!needsPrescription && isOnlinePayment(paymentMethod) && <Link className="btn-primary" to={`/pasien/orders/${id}/payment`}><FiCreditCard /> Lanjut Pembayaran</Link>}
          <Link className="btn-secondary" to={`/pasien/orders/${id}`}><FiPackage /> Lihat Detail Pesanan</Link>
        </div>
      </section>
    </div>
  );
}

export function PaymentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    orderService.detail(id).then(setOrder).catch((error) => Toast.error(errorMessage(error, "Gagal memuat pembayaran")));
  }, [id]);

  const payment = order?.payments?.[0];
  const uploadProof = async (event) => {
    event.preventDefault();
    if (!proofFile) return Toast.warning("Pilih gambar bukti pembayaran");
    setSubmitting(true);
    try {
      await cartService.uploadProof(id, proofFile);
      Toast.success("Bukti pembayaran berhasil dikirim");
      navigate(`/pasien/orders/${id}`, { replace: true });
    } catch (error) {
      Toast.error(errorMessage(error, "Bukti pembayaran gagal dikirim"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader title="Pembayaran Pesanan" subtitle={`Selesaikan pembayaran untuk ${order?.order_number || id}.`} action={<Link className="btn-secondary" to={`/pasien/orders/${id}`}><FiArrowLeft /> Detail Pesanan</Link>} />
      <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-2">
        <section className="glass-card p-6">
          <h3 className="text-xl font-extrabold text-primary">Informasi Pembayaran</h3>
          <div className="mt-5 space-y-4">
            <InfoRow label="Metode" value={payment?.method || "-"} />
            <InfoRow label="Nomor pembayaran" value={payment?.payment_number || "-"} />
            <InfoRow label="Jumlah" value={rupiah(payment?.amount || order?.total_amount)} />
            <InfoRow label="Status" value={<StatusBadge status={payment?.status} />} />
          </div>
          <div className="mt-6 rounded-2xl bg-primary-soft p-4 text-sm text-primary">
            Lakukan pembayaran sesuai metode yang dipilih, lalu upload gambar bukti pembayaran pada formulir.
          </div>
        </section>
        <form className="glass-card p-6" onSubmit={uploadProof}>
          <h3 className="text-xl font-extrabold text-primary">Upload Bukti Pembayaran</h3>
          <div className="mt-5"><UploadPreview label="Gambar bukti pembayaran" onChange={setProofFile} /></div>
          <button className="btn-primary mt-5 w-full" type="submit" disabled={submitting}>{submitting ? "Mengirim..." : "Kirim Bukti Pembayaran"}</button>
        </form>
      </div>
    </>
  );
}

export function OrdersPage({ title = "Pesanan Saya", subtitle = "Lacak dan kelola pesanan obat serta layanan kesehatan Anda." }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  useEffect(() => {
    orderService.myOrders()
      .then(setRows)
      .catch((error) => Toast.error(errorMessage(error, "Gagal memuat pesanan")));
  }, []);

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <DataTable
        rows={rows}
        onView={(row) => navigate(`/pasien/orders/${row.id}`)}
        columns={[
          { key: "order_number", label: "Nomor Pesanan" },
          { key: "checkout_at", label: "Tanggal", render: (row) => row.checkout_at ? new Date(row.checkout_at).toLocaleDateString("id-ID") : "-" },
          { key: "fulfillment_method", label: "Penerimaan", render: (row) => row.fulfillment_method === "DELIVERY" ? "Diantar" : "Ambil di Klinik" },
          { key: "total_amount", label: "Total", render: (row) => rupiah(row.total_amount) },
          { key: "status", label: "Status", type: "badge" }
        ]}
      />
    </>
  );
}

export function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  useEffect(() => {
    orderService.detail(id).then(setOrder).catch((error) => Toast.error(errorMessage(error, "Gagal memuat detail pesanan")));
  }, [id]);

  if (!order) return <div className="glass-card p-6 text-sm font-semibold text-muted">Memuat detail pesanan...</div>;

  const payment = order.payments?.[0];
  const canUploadPayment = isOnlinePayment(payment?.method) && ["PENDING", "REJECTED"].includes(payment?.status);

  return (
    <>
      <PageHeader title="Detail Pesanan" subtitle={`Informasi lengkap pesanan ${order.order_number || id}.`} action={<Link className="btn-secondary" to="/pasien/orders"><FiArrowLeft /> Pesanan Saya</Link>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="glass-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-2xl font-extrabold text-primary">#{order.order_number}</h3>
              <StatusBadge status={order.status} />
            </div>
            <div className="mt-6 space-y-4">
              {(order.items || []).map((item) => (
                <div key={item.id} className="flex justify-between gap-4 border-b border-outline pb-4 last:border-0 last:pb-0">
                  <div><p className="font-bold text-primary">{item.medicine_name_snapshot}</p><p className="text-sm text-muted">{item.quantity} x {rupiah(item.unit_price)}</p></div>
                  <b>{rupiah(item.line_total)}</b>
                </div>
              ))}
              {!order.items?.length && <p className="text-sm text-muted">Rincian item belum tersedia.</p>}
            </div>
          </section>

          <section className="glass-card p-6">
            <h3 className="text-xl font-extrabold text-primary">Penerimaan Pesanan</h3>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <InfoRow label="Metode" value={order.fulfillment_method === "DELIVERY" ? "Diantar ke alamat" : "Ambil di klinik"} />
              <InfoRow label="Tanggal checkout" value={order.checkout_at ? new Date(order.checkout_at).toLocaleString("id-ID") : "-"} />
            </div>
            {order.shipping_address_snapshot && <div className="mt-4"><InfoRow label="Alamat" value={order.shipping_address_snapshot} /></div>}
            {order.notes && <div className="mt-4"><InfoRow label="Catatan" value={order.notes} /></div>}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="glass-card p-6">
            <h3 className="text-xl font-extrabold text-primary">Total Pesanan</h3>
            <div className="mt-5 space-y-3 text-sm">
              <InfoRow label="Subtotal" value={rupiah(order.subtotal)} />
              <InfoRow label="Ongkos kirim" value={rupiah(order.shipping_cost)} />
              <div className="flex justify-between border-t border-outline pt-4 text-lg font-extrabold text-primary"><span>Total</span><span>{rupiah(order.total_amount)}</span></div>
            </div>
          </section>
          <section className="glass-card p-6">
            <h3 className="text-xl font-extrabold text-primary">Pembayaran</h3>
            <div className="mt-5 space-y-4">
              <InfoRow label="Metode" value={payment?.method || "-"} />
              <InfoRow label="Status" value={<StatusBadge status={payment?.status} />} />
            </div>
            {canUploadPayment && <Link className="btn-primary mt-5 w-full" to={`/pasien/orders/${id}/payment`}><FiCreditCard /> Upload Bukti</Link>}
            {order.status === "WAITING_PRESCRIPTION" && <Link className="btn-secondary mt-3 w-full" to={`/pasien/prescriptions/upload?order_id=${id}`}><FiClipboard /> Upload Resep</Link>}
          </section>
        </aside>
      </div>
    </>
  );
}

function InfoRow({ label, value }) {
  return <div className="flex items-start justify-between gap-4"><span className="text-sm text-muted">{label}</span><span className="text-right text-sm font-bold text-primary">{value}</span></div>;
}

import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiClipboard,
  FiCreditCard,
  FiPackage,
  FiShoppingBag
} from "react-icons/fi";
import CartItem from "../components/CartItem";
import EmptyState from "../components/EmptyState";
import StatusBadge from "../components/StatusBadge";
import UploadPreview from "../components/UploadPreview";
import { Toast } from "../components/Toast";
import { cartService } from "../services/cartService";
import { orderService } from "../services/orderService";
import { prescriptionService } from "../services/prescriptionService";
import { authStorage, normalizeList, rupiah } from "../utils/storage";
import PageHeader from "./PageHeader";

const errorMessage = (error, fallback) => error?.response?.data?.detail || error?.response?.data?.message || error?.message || fallback;
const itemPrice = (item) => Number(item.medicine?.selling_price || item.unit_price_snapshot || item.unit_price || 0);
const orderIdOf = (order) => order?.id || order?.order_id;
const isOnlinePayment = (method) => ["BANK_TRANSFER", "EWALLET", "E_WALLET", "QRIS"].includes(method);
const requiresPrescription = (order) => ["WAITING_PRESCRIPTION", "PRESCRIPTION_REVIEW"].includes(order?.status);
const hasPrescriptionItem = (items = []) => items.some((item) => Boolean(item?.medicine?.requires_prescription || item?.medicine_requires_prescription || item?.requires_prescription));
const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
};
const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(date);
};
const getOrderPhase = (order = {}, prescription = null, payment = null) => {
  const needsRx = requiresPrescription(order);
  const needsUpload = needsRx && !prescription?.file_url;
  const rxResolved = prescription?.status === "APPROVED" || ["PENDING_PAYMENT", "PAID", "PROCESSING", "READY_FOR_PICKUP", "COMPLETED"].includes(order.status);
  const paymentReady = order.status === "PENDING_PAYMENT";
  const paymentWaiting = payment?.status === "WAITING_VERIFICATION";
  const paymentVerified = payment?.status === "VERIFIED";
  const paymentDone = ["PAID", "PROCESSING", "READY_FOR_PICKUP", "COMPLETED"].includes(order.status) || payment?.status === "VERIFIED";
  const packagingDone = ["READY_FOR_PICKUP", "COMPLETED"].includes(order.status);
  const pickupDone = ["READY_FOR_PICKUP", "COMPLETED"].includes(order.status);

  return [
    {
      key: "checkout",
      label: "Checkout",
      detail: `Dilakukan pada ${formatDateTime(order.checkout_at)}`,
      state: order.checkout_at ? "done" : "active"
    },
    {
      key: "upload_prescription",
      label: needsRx ? "Upload Resep" : "Resep",
      detail: needsRx
        ? prescription?.file_url
          ? `Resep sudah diunggah${prescription?.uploaded_at ? ` • ${formatDateTime(prescription.uploaded_at)}` : ""}`
          : "Unggah resep dokter setelah pesanan dibuat"
        : "Tidak diperlukan",
      state: needsRx ? (prescription?.file_url ? "done" : "active") : "done"
    },
    {
      key: "prescription",
      label: needsRx ? "Verifikasi Resep" : "Resep",
      detail: needsRx
        ? prescription?.status === "APPROVED"
          ? `Disetujui${prescription?.uploaded_at ? ` • diunggah ${formatDateTime(prescription.uploaded_at)}` : ""}`
          : prescription?.status === "USED"
            ? "Sudah dipakai untuk satu transaksi"
          : prescription?.status === "REJECTED"
            ? `Ditolak${prescription?.uploaded_at ? ` • diunggah ${formatDateTime(prescription.uploaded_at)}` : ""}`
            : needsUpload
              ? "Menunggu upload resep"
              : "Menunggu verifikasi apoteker"
        : "Tidak diperlukan",
      state: needsRx ? (prescription?.status === "REJECTED" ? "error" : rxResolved ? "done" : prescription?.file_url ? "active" : "idle") : "done"
    },
    {
      key: "payment",
      label: "Pembayaran",
      detail: payment?.status === "VERIFIED"
        ? `Terverifikasi${payment?.verified_at ? ` • ${formatDateTime(payment.verified_at)}` : ""}`
        : paymentWaiting
          ? `Bukti pembayaran sudah dikirim${payment?.proof_uploaded_at ? ` • ${formatDateTime(payment.proof_uploaded_at)}` : ""}`
        : paymentReady
          ? "Menunggu pembayaran"
          : paymentDone
            ? "Selesai"
            : "Belum dibuka",
      state: paymentVerified || paymentDone ? "done" : paymentWaiting || paymentReady ? "active" : "idle"
    },
    {
      key: "packaging",
      label: "Packaging",
      detail: "Menunggu proses pengemasan oleh apoteker/admin",
      state: packagingDone ? "done" : ["PAID", "PROCESSING"].includes(order.status) ? "active" : "idle"
    },
    {
      key: "pickup",
      label: "Siap Diambil",
      detail: pickupDone ? "Pesanan sudah siap diambil di klinik" : "Menunggu disiapkan oleh apoteker/admin",
      state: pickupDone ? "done" : packagingDone ? "active" : "idle"
    },
    {
      key: "complete",
      label: "Selesai",
      detail: order.status === "COMPLETED" ? "Pesanan diterima dan selesai" : "Belum selesai",
      state: order.status === "COMPLETED" ? "done" : "idle"
    }
  ];
};

function OrderStepper({ order, prescription, payment }) {
  const steps = getOrderPhase(order, prescription, payment);
  return (
    <div className="rounded-3xl border border-outline/60 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-muted">Alur Pesanan</p>
          <h3 className="text-xl font-extrabold text-primary">Tracking dari checkout sampai selesai</h3>
        </div>
        <StatusBadge status={order?.status} />
      </div>
      <div className="space-y-4">
        {steps.map((step, index) => {
          const isDone = step.state === "done";
          const isActive = step.state === "active";
          const isError = step.state === "error";
          return (
            <div key={step.key} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className={`grid h-10 w-10 place-items-center rounded-full text-sm font-extrabold ${isDone ? "bg-secondary text-white" : isError ? "bg-danger text-white" : isActive ? "bg-primary text-white" : "bg-surface-high text-muted"}`}>
                  {index + 1}
                </span>
                {index < steps.length - 1 && <span className={`mt-2 h-full w-0.5 flex-1 ${isDone ? "bg-secondary/60" : "bg-outline/60"}`} />}
              </div>
              <div className="pb-4">
                <p className={`font-extrabold ${isDone ? "text-secondary" : isError ? "text-danger" : "text-primary"}`}>{step.label}</p>
                <p className="mt-1 text-sm text-muted">{step.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CartPage({ title = "Keranjang", subtitle = "Periksa jumlah obat sebelum melanjutkan checkout." }) {
  const [items, setItems] = useState([]);
  const [hasApprovedPrescription, setHasApprovedPrescription] = useState(false);
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

  useEffect(() => {
    const user = authStorage.getUser();
    if (user?.role === "pasien") {
      prescriptionService.mine()
        .then((data) => setHasApprovedPrescription(Array.isArray(data) && data.some((item) => item.status === "APPROVED")))
        .catch(() => setHasApprovedPrescription(false));
    }
    load();
  }, []);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + itemPrice(item) * (item.quantity || 1), 0),
    [items]
  );
  const needsPrescriptionFlow = useMemo(() => items.some((item) => Boolean(item?.medicine?.requires_prescription || item?.medicine_requires_prescription || item?.requires_prescription)) && !hasApprovedPrescription, [items, hasApprovedPrescription]);

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
          {needsPrescriptionFlow && (
            <div className="mt-4 rounded-2xl border border-primary/20 bg-primary-soft p-4 text-sm text-primary">
              Ada obat yang butuh resep. Setelah checkout, pesanan akan menunggu upload resep dan verifikasi apoteker sebelum pembayaran dibuka.
            </div>
          )}
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
  const [method, setMethod] = useState("PICKUP");
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([]);
  const [hasApprovedPrescription, setHasApprovedPrescription] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    let active = true;
    const syncPrescriptionStatus = () => {
      const user = authStorage.getUser();
      if (user?.role !== "pasien") {
        if (active) setHasApprovedPrescription(true);
        return Promise.resolve();
      }
      return prescriptionService.mine()
        .then((data) => {
          if (!active) return;
          setHasApprovedPrescription(Array.isArray(data) && data.some((item) => item.status === "APPROVED"));
        })
        .catch(() => {
          if (active) setHasApprovedPrescription(false);
        });
    };

    syncPrescriptionStatus();
    cartService.get()
      .then((data) => setItems(normalizeList(data)))
      .catch((error) => Toast.error(errorMessage(error, "Gagal memuat keranjang")))
      .finally(() => setLoading(false));

    const timer = window.setInterval(syncPrescriptionStatus, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + itemPrice(item) * (item.quantity || 1), 0),
    [items]
  );
  const prescriptionItems = useMemo(() => items.filter((item) => Boolean(item?.medicine?.requires_prescription || item?.medicine_requires_prescription || item?.requires_prescription)), [items]);
  const needsPrescriptionFlow = prescriptionItems.length > 0 && !hasApprovedPrescription;
  const shippingCost = 0;
  const total = subtotal + shippingCost;

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!items.length) nextErrors.cart = "Keranjang kosong. Tambahkan produk terlebih dahulu.";
    if (prescriptionItems.length && !hasApprovedPrescription) nextErrors.prescription = "Resep wajib diverifikasi apoteker sebelum checkout.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      const order = await cartService.checkout({
        fulfillment_method: method,
        payment_method: paymentMethod,
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
        <PageHeader title="Checkout" subtitle="Lengkapi penerimaan pesanan dan pembayaran." />
        <EmptyState title="Tidak ada item untuk checkout" description="Keranjang kosong atau pesanan sebelumnya sudah selesai dibuat." />
        <div className="mt-5 flex justify-center"><Link className="btn-primary" to="/pasien/catalog">Kembali ke Katalog</Link></div>
      </>
    );
  }

  return (
    <form onSubmit={submit}>
      <PageHeader
        title="Checkout"
        subtitle={needsPrescriptionFlow ? "Pesanan obat resep akan masuk ke alur upload dan verifikasi resep terlebih dahulu." : "Pesanan hanya diproses untuk ambil di klinik."}
        action={<Link className="btn-secondary" to="/pasien/cart"><FiArrowLeft /> Kembali ke Keranjang</Link>}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="glass-card p-6">
            <h3 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-primary"><FiPackage /> Penerimaan Pesanan</h3>
            <div className="rounded-2xl bg-primary-soft p-4 text-sm text-primary">
              {needsPrescriptionFlow
                ? "Pesanan obat resep akan dibuat dulu, lalu statusnya menunggu upload resep dan verifikasi apoteker sebelum pembayaran."
                : "Pesanan diambil di Klinik Makmur Jaya setelah statusnya Siap Diambil."}
            </div>
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
                ["QRIS", "QRIS", "Upload bukti pembayaran setelah pesanan dibuat."]
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
            <div className="flex justify-between"><span className="text-muted">Biaya layanan klinik</span><b>{rupiah(shippingCost)}</b></div>
            <div className="flex justify-between text-lg font-extrabold text-primary"><span>Total</span><span>{rupiah(total)}</span></div>
          </div>
          {errors.cart && <p className="mt-4 text-sm font-semibold text-danger">{errors.cart}</p>}
          {errors.prescription && <p className="mt-2 text-sm font-semibold text-danger">{errors.prescription}</p>}
          <button className="btn-primary mt-6 w-full" type="submit" disabled={submitting || loading}>
            {submitting ? "Memproses Pesanan..." : needsPrescriptionFlow ? "Ajukan Resep" : "Konfirmasi Pesanan"}
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
  const [prescription, setPrescription] = useState(null);
  const [syncing, setSyncing] = useState(true);

  useEffect(() => {
    if (!id) return undefined;

    let active = true;
    const load = async () => {
      try {
        const nextOrder = await orderService.detail(id);
        if (!active) return;
        setOrder(nextOrder);
        try {
          const nextPrescription = await prescriptionService.byOrder(id);
          if (!active) return;
          setPrescription(nextPrescription);
        } catch (error) {
          if (!active) return;
          if (error?.response?.status === 404) {
            setPrescription(null);
          } else {
            throw error;
          }
        }
      } catch (error) {
        if (!active) return;
        Toast.error(errorMessage(error, "Gagal memuat status pesanan"));
      } finally {
        if (active) setSyncing(false);
      }
    };

    load();
    const timer = window.setInterval(load, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [id]);

  const paymentMethod = order?.payment_method;
  const paymentStatus = order?.payment_status;
  const payment = order ? {
    method: order.payment_method,
    status: order.payment_status,
    payment_number: order.payment_number,
    amount: order.paid_amount || order.total_amount,
    proof_file_url: order.proof_file_url,
    proof_uploaded_at: order.proof_uploaded_at,
    verified_at: order.verified_at,
    rejection_reason: order.rejection_reason
  } : null;
  const needsPrescription = requiresPrescription(order);
  const canPay = order?.status === "PENDING_PAYMENT" && isOnlinePayment(paymentMethod) && ["PENDING", "REJECTED"].includes(paymentStatus);
  const prescriptionStatus = prescription?.status || order?.status || "PENDING";
  const prescriptionMessage = prescription?.status === "APPROVED"
    ? "Resep sudah diverifikasi apoteker. Silakan lanjut ke pembayaran."
    : prescription?.status === "USED"
      ? "Resep ini sudah dipakai untuk satu transaksi. Untuk pembelian berikutnya, upload resep baru."
    : prescription?.status === "REJECTED"
      ? "Resep ditolak. Upload resep baru untuk melanjutkan checkout."
      : needsPrescription
        ? "Upload resep dokter terlebih dahulu. Status akan otomatis diperbarui setelah apoteker memverifikasi."
        : "Tidak ada resep yang diperlukan untuk pesanan ini.";

  return (
    <div className="mx-auto max-w-3xl">
      <section className="glass-card p-8 text-center md:p-12">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-secondary-soft text-secondary"><FiCheckCircle size={42} /></div>
        <h1 className="mt-6 text-3xl font-extrabold text-primary">Pesanan Berhasil Dibuat</h1>
        <p className="mt-2 text-muted">Nomor pesanan Anda <b>{order?.order_number || id}</b>.</p>
        <p className="mt-2 text-sm text-muted">Tanggal checkout: <b>{formatDateTime(order?.checkout_at)}</b></p>
        <div className="mx-auto mt-6 inline-flex rounded-full bg-surface-low px-4 py-2 text-sm font-bold text-primary">
          {syncing ? "Memuat status terbaru..." : "Status diperbarui otomatis"}
        </div>
        <div className="mx-auto mt-8 grid max-w-xl gap-3 rounded-2xl bg-surface-low p-5 text-left sm:grid-cols-2">
          <div><p className="text-xs font-bold uppercase text-muted">Total</p><p className="mt-1 text-xl font-extrabold text-primary">{rupiah(order?.total_amount)}</p></div>
          <div><p className="text-xs font-bold uppercase text-muted">Status</p><div className="mt-2"><StatusBadge status={order?.status} /></div></div>
        </div>
        <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-outline/60 bg-white p-5 text-left">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-muted">Status Resep</p>
              <p className="mt-1 text-lg font-extrabold text-primary">{String(prescriptionStatus).replaceAll("_", " ")}</p>
            </div>
            <StatusBadge status={prescriptionStatus} />
          </div>
          <p className="mt-3 text-sm text-muted">{prescriptionMessage}</p>
          {prescription?.notes && <p className="mt-3 rounded-xl bg-warning-soft px-4 py-3 text-sm font-semibold text-warning">{prescription.notes}</p>}
        </div>
        <div className="mx-auto mt-6 max-w-3xl text-left">
          <OrderStepper order={order} prescription={prescription} payment={payment} />
        </div>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {needsPrescription && (!prescription || prescription?.status === "REJECTED") && <Link className="btn-primary" to={`/pasien/prescriptions/upload?order_id=${id}`}><FiClipboard /> Upload Resep</Link>}
          {needsPrescription && prescription?.file_url && prescription?.status !== "APPROVED" && <Link className="btn-primary" to={`/pasien/checkout/success/${id}`}><FiClipboard /> Lihat Verifikasi</Link>}
          {paymentStatus === "WAITING_VERIFICATION" && <span className="inline-flex items-center justify-center rounded-full bg-warning-soft px-4 py-3 text-sm font-bold text-warning">Menunggu verifikasi pembayaran admin</span>}
          {canPay && <Link className="btn-primary" to={`/pasien/orders/${id}/payment`}><FiCreditCard /> Lanjut Pembayaran</Link>}
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
    if (!id) return undefined;
    let active = true;
    const load = () => orderService.detail(id)
      .then((data) => {
        if (active) setOrder(data);
      })
      .catch((error) => {
        if (active) Toast.error(errorMessage(error, "Gagal memuat pembayaran"));
      });

    load();
    const timer = window.setInterval(load, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [id]);

  const payment = order ? {
    method: order.payment_method,
    status: order.payment_status,
    payment_number: order.payment_number,
    amount: order.paid_amount || order.total_amount,
    proof_file_url: order.proof_file_url,
    proof_uploaded_at: order.proof_uploaded_at,
    verified_at: order.verified_at,
    rejection_reason: order.rejection_reason
  } : null;
  const uploadProof = async (event) => {
    event.preventDefault();
    if (!proofFile) return Toast.warning("Pilih gambar bukti pembayaran");
    setSubmitting(true);
    try {
      await cartService.uploadProof(id, proofFile);
      Toast.success("Bukti pembayaran berhasil dikirim");
      navigate(`/pasien/checkout/success/${id}`, { replace: true });
    } catch (error) {
      Toast.error(errorMessage(error, "Bukti pembayaran gagal dikirim"));
    } finally {
      setSubmitting(false);
    }
  };

  if (order && order.status !== "PENDING_PAYMENT") {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Pembayaran Belum Dibuka" subtitle={`Pesanan ${order?.order_number || id} masih menunggu verifikasi pembayaran.`} action={<Link className="btn-secondary" to={`/pasien/orders/${id}`}><FiArrowLeft /> Detail Pesanan</Link>} />
        <section className="glass-card p-8 text-center">
          <StatusBadge status={order.status} />
          <h2 className="mt-6 text-2xl font-extrabold text-primary">Pembayaran menunggu verifikasi admin</h2>
          <p className="mt-3 text-muted">Halaman ini akan terbuka otomatis setelah pesanan masuk ke status <b>PENDING_PAYMENT</b> dan bukti pembayaran siap diverifikasi.</p>
          <Link className="btn-primary mt-6" to={`/pasien/checkout/success/${id}`}>Lihat Status Checkout</Link>
        </section>
      </div>
    );
  }

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
      {!rows.length ? (
        <EmptyState title="Belum ada pesanan" description="Pesanan Anda akan tampil setelah checkout berhasil dibuat." />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {rows.map((order) => {
            const orderSteps = getOrderPhase(order);
            const activeStep = orderSteps.find((step) => step.state === "active") || orderSteps.find((step) => step.state === "done") || orderSteps[0];
            return (
              <article key={order.id} className="glass-card overflow-hidden border border-outline/60 p-6 shadow-sm transition hover:-translate-y-0.5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase text-muted">Nomor Pesanan</p>
                    <h3 className="mt-1 text-2xl font-extrabold text-primary">{order.order_number}</h3>
                    <p className="mt-2 text-sm text-muted">{formatDate(order.checkout_at)} • Ambil di klinik</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={order.status} />
                    <p className="mt-3 text-xl font-extrabold text-primary">{rupiah(order.total_amount)}</p>
                  </div>
                </div>
                <div className="mt-5 rounded-2xl bg-surface-low p-4">
                  <p className="text-xs font-bold uppercase text-muted">Tahap saat ini</p>
                  <p className="mt-1 text-lg font-extrabold text-primary">{activeStep.label}</p>
                  <p className="mt-1 text-sm text-muted">{activeStep.detail}</p>
                </div>
                <div className="mt-5 space-y-3">
                  {orderSteps.slice(0, 4).map((step) => (
                    <div key={step.key} className="flex items-center justify-between gap-4 rounded-2xl border border-outline/50 px-4 py-3">
                      <div>
                        <p className="font-bold text-primary">{step.label}</p>
                        <p className="text-xs text-muted">{step.detail}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${step.state === "done" ? "bg-secondary-soft text-secondary" : step.state === "active" ? "bg-primary-soft text-primary" : "bg-surface-high text-muted"}`}>
                        {step.state === "done" ? "Selesai" : step.state === "active" ? "Berjalan" : "Menunggu"}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button className="btn-primary" type="button" onClick={() => navigate(`/pasien/orders/${order.id}`)}>Lihat Detail</button>
                  {requiresPrescription(order) && <Link className="btn-secondary" to={`/pasien/prescriptions/upload?order_id=${order.id}`}>Upload Resep</Link>}
                  {order.status === "PENDING_PAYMENT" && <Link className="btn-secondary" to={`/pasien/orders/${order.id}/payment`}>Bayar</Link>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

export function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [prescription, setPrescription] = useState(null);
  useEffect(() => {
    if (!id) return undefined;
    let active = true;
    const load = async () => {
      try {
        const nextOrder = await orderService.detail(id);
        if (!active) return;
        setOrder(nextOrder);
        try {
          const nextPrescription = await prescriptionService.byOrder(id);
          if (!active) return;
          setPrescription(nextPrescription);
        } catch (error) {
          if (!active) return;
          if (error?.response?.status === 404) {
            setPrescription(null);
          } else {
            throw error;
          }
        }
      } catch (error) {
        if (active) Toast.error(errorMessage(error, "Gagal memuat detail pesanan"));
      }
    };

    load();
    const timer = window.setInterval(load, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [id]);

  if (!order) return <div className="glass-card p-6 text-sm font-semibold text-muted">Memuat detail pesanan...</div>;

  const payment = order ? {
    method: order.payment_method,
    status: order.payment_status,
    payment_number: order.payment_number,
    amount: order.paid_amount || order.total_amount,
    proof_file_url: order.proof_file_url,
    proof_uploaded_at: order.proof_uploaded_at,
    verified_at: order.verified_at,
    rejection_reason: order.rejection_reason
  } : null;
  const canUploadPayment = order.status === "PENDING_PAYMENT" && isOnlinePayment(payment?.method) && ["PENDING", "REJECTED"].includes(payment?.status);
  const canUploadPrescription = requiresPrescription(order) || prescription?.status === "REJECTED";

  return (
    <>
      <PageHeader title="Detail Pesanan" subtitle={`Informasi lengkap pesanan ${order.order_number || id}.`} action={<Link className="btn-secondary" to="/pasien/orders"><FiArrowLeft /> Pesanan Saya</Link>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <OrderStepper order={order} prescription={prescription} payment={payment} />
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
              <InfoRow label="Metode" value="Ambil di klinik" />
              <InfoRow label="Tanggal checkout" value={order.checkout_at ? new Date(order.checkout_at).toLocaleString("id-ID") : "-"} />
            </div>
            {order.notes && <div className="mt-4"><InfoRow label="Catatan" value={order.notes} /></div>}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="glass-card p-6">
            <h3 className="text-xl font-extrabold text-primary">Total Pesanan</h3>
            <div className="mt-5 space-y-3 text-sm">
              <InfoRow label="Subtotal" value={rupiah(order.subtotal)} />
              <InfoRow label="Biaya layanan klinik" value={rupiah(order.shipping_cost)} />
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
            {canUploadPrescription && <Link className="btn-secondary mt-3 w-full" to={`/pasien/prescriptions/upload?order_id=${id}`}><FiClipboard /> Upload Resep</Link>}
          </section>
          <section className="glass-card p-6">
            <h3 className="text-xl font-extrabold text-primary">Status Resep</h3>
            <div className="mt-5 space-y-4">
              <InfoRow label="Status" value={<StatusBadge status={prescription?.status || order.status} />} />
              <InfoRow label="Dokter" value={prescription?.doctor_name || "-"} />
              <InfoRow label="Nomor Resep" value={prescription?.prescription_number || "-"} />
            </div>
            <p className="mt-4 text-sm text-muted">
              {prescription?.status === "APPROVED"
                ? "Resep sudah disetujui. Pembayaran bisa dilanjutkan."
                : prescription?.status === "USED"
                  ? "Resep sudah dipakai untuk satu transaksi dan tidak bisa digunakan lagi."
                : prescription?.status === "REJECTED"
                  ? "Resep ditolak. Upload resep baru untuk melanjutkan proses."
                  : requiresPrescription(order)
                    ? "Resep sedang menunggu verifikasi apoteker."
                    : "Pesanan ini tidak membutuhkan resep."}
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}

function InfoRow({ label, value }) {
  return <div className="flex items-start justify-between gap-4"><span className="text-sm text-muted">{label}</span><span className="text-right text-sm font-bold text-primary">{value}</span></div>;
}


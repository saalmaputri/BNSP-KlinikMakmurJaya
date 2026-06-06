import { useEffect, useMemo, useState } from "react";
import { FiBell } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { notificationService } from "../services/notificationService";
import { normalizeList } from "../utils/storage";

const dashboardByRole = {
  admin: "/admin/dashboard",
  apoteker: "/apoteker/dashboard",
  kasir: "/kasir/dashboard",
  pasien: "/pasien/dashboard"
};

const notificationPath = (item, role) => {
  const entity = String(item.entity_name || "").toUpperCase();
  const id = item.entity_id;

  if (role === "pasien" && entity === "ORDER" && id) return `/pasien/orders/${id}`;
  if (role === "admin" && entity === "PRESCRIPTION") return `/admin/prescriptions/verify${id ? `?prescription_id=${id}` : ""}`;
  if (role === "apoteker" && entity === "PRESCRIPTION") return `/apoteker/prescriptions${id ? `?prescription_id=${id}` : ""}`;
  if (role === "admin" && ["ORDER", "PAYMENT"].includes(entity)) return "/admin/transactions";
  if (role === "apoteker" && entity === "STOCK") return "/apoteker/stocks";
  if (role === "kasir" && ["ORDER", "PAYMENT"].includes(entity)) return "/kasir/history";
  return dashboardByRole[role] || "/";
};

const formatTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
};

export default function NotificationBell({ role }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const unreadCount = useMemo(() => items.filter((item) => !item.read_at).length, [items]);

  const load = () => notificationService.list()
    .then((data) => setItems(normalizeList(data)))
    .catch(() => setItems([]));

  useEffect(() => {
    load();
    const interval = window.setInterval(load, 30000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const openNotification = async (item) => {
    if (!item.read_at) {
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read_at: new Date().toISOString() } : entry));
      try {
        await notificationService.markRead(item.id);
      } catch {
        await load();
        return;
      }
    }
    setOpen(false);
    navigate(notificationPath(item, role));
  };

  return (
    <div className="relative">
      <button className="icon-btn relative" aria-label="Buka notifikasi" onClick={() => setOpen((value) => !value)}>
        <FiBell />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid h-6 min-w-6 place-items-center rounded-full bg-danger px-1 text-[10px] font-extrabold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-3 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-outline bg-white shadow-soft">
          <div className="flex items-center justify-between border-b border-outline/60 px-4 py-3">
            <span className="font-extrabold text-primary">Notifikasi</span>
            <span className="text-xs font-bold text-muted">{unreadCount} belum dibaca</span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.slice(0, 10).map((item) => (
              <button
                key={item.id}
                className={`block w-full border-b border-outline/40 px-4 py-3 text-left transition last:border-0 hover:bg-primary/5 ${item.read_at ? "bg-white" : "bg-primary-soft/50"}`}
                onClick={() => openNotification(item)}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${item.read_at ? "bg-outline" : "bg-danger"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-primary">{item.title}</span>
                    <span className="mt-1 block text-sm text-muted">{item.message}</span>
                    <span className="mt-2 block text-xs font-semibold text-primary">{formatTime(item.created_at)}</span>
                  </span>
                </div>
              </button>
            ))}
            {!items.length && <p className="px-5 py-10 text-center text-sm text-muted">Belum ada notifikasi.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

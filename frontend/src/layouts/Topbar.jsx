import { FiMenu, FiSearch, FiSettings } from "react-icons/fi";
import NotificationBell from "../components/NotificationBell";
import { authStorage } from "../utils/storage";

export default function Topbar({ role, onMenu, collapsed = false }) {
  const user = authStorage.getUser() || { name: "Demo User", role: "admin" };
  return (
    <header className={`sticky top-0 z-30 flex h-20 items-center justify-between border-b border-outline/40 bg-background/85 px-4 backdrop-blur-xl transition-all lg:px-10 ${collapsed ? "lg:ml-20" : "lg:ml-72"}`}>
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <button className="icon-btn lg:hidden" onClick={onMenu}><FiMenu /></button>
        <div className="relative hidden w-full max-w-md md:block">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input className="field pl-11" placeholder={role === "pasien" ? "Cari obat, pesanan, bantuan..." : "Cari obat, pasien, pesanan..."} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <NotificationBell role={role} />
        <button className="icon-btn"><FiSettings /></button>
        <div className="flex items-center gap-3 rounded-full bg-white px-3 py-2 shadow-sm">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-sm font-extrabold text-white">{user.name?.[0] || "U"}</div>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-extrabold text-primary">{user.name}</p>
            <p className="text-xs font-bold capitalize text-muted">{user.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

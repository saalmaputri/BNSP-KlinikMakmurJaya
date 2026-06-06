import { NavLink, useNavigate } from "react-router-dom";
import { FiChevronLeft, FiChevronRight, FiLogOut, FiPlusCircle, FiX } from "react-icons/fi";
import { authService } from "../services/authService";

export default function Sidebar({ role, collapsed = false, menuItems = [], open, onClose, onToggleCollapse }) {
  const navigate = useNavigate();

  const logout = async () => {
    await authService.logout();
    navigate("/login");
  };

  return (
    <aside className={`fixed left-0 top-0 z-40 flex h-screen flex-col bg-white py-2 shadow-soft transition-all lg:translate-x-0 ${collapsed ? "lg:w-20" : "lg:w-72"} ${open ? "w-72 translate-x-0" : "w-72 -translate-x-full"}`}>
      <div className={`flex items-start justify-between py-8 ${collapsed ? "lg:px-4" : "px-7"}`}>
        <div className="min-w-0">
          <h1 className={`text-2xl font-extrabold text-primary ${collapsed ? "lg:text-center lg:text-xl" : ""}`}>{collapsed ? "KMJ" : "Klinik Makmur Jaya"}</h1>
          <p className={`text-sm font-bold text-muted ${collapsed ? "lg:hidden" : ""}`}>Medical System</p>
        </div>
        <button className="icon-btn hidden lg:inline-flex" onClick={onToggleCollapse} title={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}>
          {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
        </button>
        <button className="icon-btn lg:hidden" onClick={onClose}><FiX /></button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
        {menuItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={`${label}-${path}`}
            to={path}
            onClick={onClose}
            className={({ isActive }) =>
              `mx-2 flex items-center gap-3 rounded-full px-4 py-3 text-sm font-bold transition hover:bg-surface-high ${collapsed ? "lg:justify-center lg:px-3" : "hover:translate-x-1"} ${
                isActive ? "bg-secondary-soft text-secondary" : "text-muted"
              }`
            }
            title={label}
          >
            <Icon size={20} />
            <span className={`truncate ${collapsed ? "lg:hidden" : ""}`}>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-outline/50 p-4">
        <button className={`btn-primary mb-3 w-full ${collapsed ? "lg:px-0" : ""}`} onClick={() => navigate(role === "pasien" ? "/pasien/catalog" : role === "kasir" ? "/kasir/transactions" : role === "admin" ? "/admin/prescriptions/verify" : "/apoteker/prescriptions")} title="Aksi utama">
          <FiPlusCircle /> <span className={collapsed ? "lg:hidden" : ""}>{role === "pasien" ? "Cari Obat" : role === "kasir" ? "Transaksi Baru" : "Resep Baru"}</span>
        </button>
        <button className={`flex w-full items-center gap-3 rounded-full px-4 py-3 text-sm font-bold text-danger hover:bg-danger-soft ${collapsed ? "lg:justify-center lg:px-0" : ""}`} onClick={logout} title="Logout">
          <FiLogOut /> <span className={collapsed ? "lg:hidden" : ""}>Logout</span>
        </button>
      </div>
    </aside>
  );
}

import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { authStorage } from "../utils/storage";
import { getRoleMenu } from "../config/roleMenus";
import FloatingPatientCart from "../components/FloatingPatientCart";

export default function DashboardLayout() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const user = authStorage.getUser() || { role: "admin" };
  const role = user.role || "admin";
  const menuItems = getRoleMenu(role);

  return (
    <div className="min-h-screen">
      <Sidebar role={role} menuItems={menuItems} open={open} onClose={() => setOpen(false)} collapsed={collapsed} onToggleCollapse={() => setCollapsed((value) => !value)} />
      {open && <button aria-label="Tutup sidebar" className="fixed inset-0 z-30 bg-ink/30 lg:hidden" onClick={() => setOpen(false)} />}
      <Topbar role={role} onMenu={() => setOpen(true)} collapsed={collapsed} />
      <main className={`px-4 py-8 transition-all lg:px-10 ${collapsed ? "lg:ml-20" : "lg:ml-72"}`}>
        <div className="mx-auto max-w-[1440px]">
          <Outlet />
        </div>
      </main>
      {role === "pasien" && <FloatingPatientCart />}
    </div>
  );
}

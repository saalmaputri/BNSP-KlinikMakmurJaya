import { Navigate, Outlet, useLocation } from "react-router-dom";
import { authStorage } from "../utils/storage";
import { roleDashboards, roleRoutes } from "../config/roleMenus";

const legacyRouteMap = {
  admin: {
    "/management/medicines": "/admin/medicines",
    "/management/transactions": "/admin/transactions",
    "/management/prescriptions": "/admin/prescriptions",
    "/reports/sales": "/admin/reports",
    "/reports": "/admin/reports",
    "/system": "/admin/system",
    "/imports": "/admin/medicines/imports"
  },
  apoteker: {
    "/prescriptions/verify": "/apoteker/prescriptions",
    "/prescriptions": "/apoteker/prescriptions",
    "/stock": "/apoteker/stocks",
    "/alerts/expired-soon": "/apoteker/expired",
    "/alerts": "/apoteker/expired"
  },
  kasir: {
    "/cashier/transactions": "/kasir/transactions",
    "/cashier/cart": "/kasir/transactions",
    "/cashier/history": "/kasir/history"
  },
  pasien: {
    "/catalog": "/pasien/catalog",
    "/cart": "/pasien/cart",
    "/checkout": "/pasien/checkout",
    "/orders": "/pasien/orders",
    "/purchase-history": "/pasien/history"
  }
};

const resolveLegacyRoute = (role, pathname) => {
  const mappings = legacyRouteMap[role] || {};
  const match = Object.entries(mappings)
    .sort(([left], [right]) => right.length - left.length)
    .find(([legacyPath]) => pathname === legacyPath || pathname.startsWith(`${legacyPath}/`));

  if (!match) return null;
  const [legacyPath, currentPath] = match;
  return `${currentPath}${pathname.slice(legacyPath.length)}`;
};

export default function ProtectedRoute({ allowedRoles = [] }) {
  const location = useLocation();
  const user = authStorage.getUser();
  if (!user || !authStorage.getToken()) return <Navigate to="/login" replace />;
  if (allowedRoles.length && !allowedRoles.includes(user.role)) return <Navigate to={roleDashboards[user.role] || "/login"} replace />;
  const legacyRoute = resolveLegacyRoute(user.role, location.pathname);
  if (legacyRoute) return <Navigate to={legacyRoute} replace />;
  const allowedPrefixes = roleRoutes[user.role] || [];
  if (allowedPrefixes.length && !allowedPrefixes.some((prefix) => location.pathname.startsWith(prefix))) {
    return <Navigate to={roleDashboards[user.role] || "/login"} replace />;
  }
  return <Outlet />;
}

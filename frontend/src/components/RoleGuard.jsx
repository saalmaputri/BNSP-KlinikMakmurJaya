import { Navigate } from "react-router-dom";
import { authStorage } from "../utils/storage";

export default function RoleGuard({ allowed = [], children }) {
  const user = authStorage.getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (allowed.length && !allowed.includes(user.role)) return <Navigate to={`/dashboard/${user.role}`} replace />;
  return children;
}

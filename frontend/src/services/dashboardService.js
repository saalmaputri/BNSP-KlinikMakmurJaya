import api, { dataOf } from "./api";
import { normalizeRole } from "../utils/storage";

const endpointByRole = {
  admin: "/dashboard/admin",
  apoteker: "/dashboard/pharmacist",
  kasir: "/dashboard/cashier",
  pasien: "/dashboard/customer"
};

const normalizeDashboard = (payload, role = "admin") => {
  const data = payload || {};
  const normalizedRole = normalizeRole(role);
  const latest = data.latest_orders || data.latest_transactions || data.orders || data.transactions || [];
  const transactions = (Array.isArray(latest) ? latest : []).map((order) => ({
    ...order,
    order_number: order.order_number || order.id,
    patient_id: order.patient_id ?? order.customer_name_snapshot ?? order.customer ?? "-",
    total_amount: order.total_amount ?? order.total ?? order.paid_amount ?? 0
  }));

  return {
    ...data,
    revenue: data.revenue ?? data.total_sales_today ?? data.sales_today ?? 0,
    transaction_count: data.transaction_count ?? data.transactions_count ?? data.total_orders_today ?? data.order_count ?? transactions.length ?? 0,
    critical_stock: data.critical_stock ?? 0,
    new_orders: data.new_orders ?? data.pending_prescriptions ?? 0,
    chart: Array.isArray(data.sales_chart) ? data.sales_chart : Array.isArray(data.chart) ? data.chart : [],
    latest_transactions: transactions,
    role: normalizedRole
  };
};

export const dashboardService = {
  get: async (role = "admin") => normalizeDashboard(
    await dataOf(() => api.get(endpointByRole[normalizeRole(role)] || endpointByRole.admin)),
    role
  )
};

import api, { dataOf } from "./api";

const normalizeOrder = (order = {}) => ({
  ...order,
  id: order.id || order.order_number,
  order_number: order.order_number || order.id,
  patient_id: order.patient_id ?? null,
  customer_name_snapshot: order.customer_name_snapshot ?? null,
  payment_method: order.payment_method ?? null,
  payment_status: order.payment_status ?? null,
  payment_number: order.payment_number ?? null,
  proof_file_url: order.proof_file_url ?? null,
  proof_uploaded_at: order.proof_uploaded_at ?? null,
  verified_at: order.verified_at ?? null,
  rejection_reason: order.rejection_reason ?? null,
  total_amount: order.total_amount ?? order.total ?? order.paid_amount ?? 0
});

const normalizeOrders = (payload) => {
  const items = Array.isArray(payload) ? payload : payload?.data || payload?.items || payload?.results || [];
  return items.map(normalizeOrder);
};

export const orderService = {
  myOrders: async () => normalizeOrders(await dataOf(() => api.get("/orders/my"))),
  detail: async (id) => normalizeOrder(await dataOf(() => api.get(`/orders/${id}`))),
  updateStatus: (id, status) => dataOf(() => api.patch(`/orders/${id}/status`, { status })),
  transactions: async () => normalizeOrders(await dataOf(() => api.get("/cashier/transactions"))),
  cashierCheckout: (payload) => dataOf(() => api.post("/cashier/checkout", payload))
};

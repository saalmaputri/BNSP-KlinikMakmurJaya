import api, { dataOf } from "./api";

const normalizeOrder = (order = {}) => ({
  ...order,
  id: order.id || order.order_number,
  order_number: order.order_number || order.id,
  patient_id: order.patient_id ?? order.customer ?? order.customer_name ?? order.patient_name ?? "-",
  customer_name_snapshot: order.customer_name_snapshot ?? order.customer_name ?? order.customer ?? null,
  total_amount: order.total_amount ?? order.total ?? order.paid_amount ?? 0
});

const normalizeOrders = (payload) => {
  const items = Array.isArray(payload) ? payload : payload?.data || payload?.items || payload?.results || [];
  return items.map(normalizeOrder);
};

export const orderService = {
  myOrders: async () => normalizeOrders(await dataOf(() => api.get("/orders/my"))),
  detail: async (id) => normalizeOrder(await dataOf(() => api.get(`/orders/${id}`))),
  transactions: async () => normalizeOrders(await dataOf(() => api.get("/cashier/transactions"))),
  cashierCheckout: (payload) => dataOf(() => api.post("/cashier/checkout", payload))
};

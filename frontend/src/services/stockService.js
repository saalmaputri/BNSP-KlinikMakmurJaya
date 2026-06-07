import api, { dataOf } from "./api";
import { normalizeMedicine } from "./medicineService";

const normalizeStockList = (payload) => {
  const items = Array.isArray(payload) ? payload : payload?.data || payload?.items || payload?.results || [];
  return items.map(normalizeMedicine);
};

const normalizeExpiredStockList = (payload) => {
  const items = Array.isArray(payload) ? payload : payload?.data || payload?.items || payload?.results || [];
  return items.map((item = {}) => ({
    ...item,
    id: item.medicine_batch_id || item.id,
    name: item.medicine_name || item.name || item.medicine_name_snapshot || item.medicine_id || "-",
    batch_number: item.batch_number || "-",
    batch_stock: item.batch_stock ?? item.current_stock ?? item.available_quantity ?? item.stock ?? 0,
    current_stock: item.batch_stock ?? item.current_stock ?? item.available_quantity ?? item.stock ?? 0,
    total_stock: item.total_stock ?? item.medicine_total_stock ?? item.overall_stock ?? item.current_stock ?? item.available_quantity ?? item.stock ?? 0,
    minimum_stock: item.minimum_stock ?? item.min_stock ?? 0,
    expired_date: item.expired_date ?? item.expires_at ?? "-",
    days_remaining: item.days_remaining ?? item.remaining_days ?? null,
    status: item.status ?? ((item.days_remaining ?? 0) <= 30 ? "menipis" : "monitoring")
  }));
};

export const stockService = {
  list: async () => normalizeStockList(await dataOf(() => api.get("/stocks"))),
  critical: async () => normalizeStockList(await dataOf(() => api.get("/stocks/critical"))),
  expiredSoon: async () => normalizeExpiredStockList(await dataOf(() => api.get("/stocks/expired-soon"))),
  batches: async () => normalizeExpiredStockList(await dataOf(() => api.get("/stocks/batches"))),
  addBatch: (payload) => dataOf(() => api.post("/stocks/batches", payload)),
  adjustment: (payload) => dataOf(() => api.post("/stocks/adjustment", payload))
};

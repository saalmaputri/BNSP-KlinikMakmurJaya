import api, { dataOf } from "./api";
import { dashboardService } from "./dashboardService";

const defaultRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  return {
    start_date: start.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10)
  };
};

export const reportService = {
  dashboard: (role = "admin") => dashboardService.get(role),
  sales: async (params = defaultRange()) => {
    const rows = await dataOf(() => api.get("/reports/sales", { params }));
    return Array.isArray(rows) ? rows : rows?.items || rows?.data || [];
  },
  bestSelling: () => dataOf(() => api.get("/reports/best-selling")),
  revenue: async (params = defaultRange()) => {
    const rows = await dataOf(() => api.get("/reports/revenue", { params }));
    return Array.isArray(rows) ? rows : rows?.items || rows?.data || [];
  },
  generatePdf: (params = defaultRange()) => dataOf(() => api.post("/reports/generate-pdf", null, { params })),
  job: (id) => dataOf(() => api.get(`/reports/jobs/${id}`))
};

import api, { dataOf } from "./api";

const normalizeErrorLog = (item = {}) => ({
  ...item,
  level: item.level || item.severity || "ERROR",
  path: item.path || item.service || "-",
  status: item.status || "UNRESOLVED"
});

const normalizeErrorLogs = (payload) => {
  const items = Array.isArray(payload) ? payload : payload?.data || payload?.items || payload?.results || [];
  return items.map(normalizeErrorLog);
};

export const errorLogService = {
  list: async () => normalizeErrorLogs(await dataOf(() => api.get("/error-logs"))),
  create: (payload) => dataOf(() => api.post("/error-logs", payload)),
  resolve: (id) => dataOf(() => api.put(`/error-logs/${id}/resolve`))
};

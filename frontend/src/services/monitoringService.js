import api, { dataOf } from "./api";

export const monitoringService = {
  health: () => dataOf(() => api.get("/monitoring/health")),
  resources: () => dataOf(() => api.get("/monitoring/resources")),
  database: () => dataOf(() => api.get("/monitoring/database")),
  redis: () => dataOf(() => api.get("/monitoring/redis")),
  raw: (path) => dataOf(() => api.get(path))
};

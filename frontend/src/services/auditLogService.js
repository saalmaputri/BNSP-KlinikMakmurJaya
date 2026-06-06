import api, { dataOf } from "./api";

export const auditLogService = {
  list: () => dataOf(() => api.get("/audit-logs"))
};

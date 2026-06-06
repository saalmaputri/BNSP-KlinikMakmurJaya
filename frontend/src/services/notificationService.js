import api, { dataOf } from "./api";

export const notificationService = {
  list: () => dataOf(() => api.get("/notifications")),
  markRead: (notificationId) => dataOf(() => api.post("/notifications/mark-read", null, { params: { notification_id: notificationId } })),
  stockAlerts: () => dataOf(() => api.get("/alerts/stock")),
  expiredAlerts: () => dataOf(() => api.get("/alerts/expired"))
};

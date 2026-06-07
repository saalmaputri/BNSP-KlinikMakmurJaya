import api, { dataOf } from "./api";
import { paymentService } from "./paymentService";

const normalizeCart = (payload) => Array.isArray(payload) ? payload : payload?.items || [];

export const cartService = {
  get: async () => normalizeCart(await dataOf(() => api.get("/cart"))),
  add: (payload) => dataOf(() => api.post("/cart/items", payload)),
  update: (id, payload) => dataOf(() => api.put(`/cart/items/${id}`, payload)),
  remove: (id) => dataOf(() => api.delete(`/cart/items/${id}`)),
  checkout: (payload) => dataOf(() => api.post("/checkout", {
    fulfillment_method: "PICKUP",
    payment_method: payload.payment_method || "BANK_TRANSFER",
    notes: payload.notes
  })),
  uploadProof: (orderId, file) => paymentService.uploadProof(orderId, file)
};

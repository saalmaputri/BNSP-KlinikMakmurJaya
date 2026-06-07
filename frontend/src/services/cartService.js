import api, { dataOf } from "./api";
import { paymentService } from "./paymentService";

const normalizeCart = (payload) => Array.isArray(payload) ? payload : payload?.items || [];
const notifyCartChanged = () => window.dispatchEvent(new Event("cart:changed"));

export const cartService = {
  get: async () => normalizeCart(await dataOf(() => api.get("/cart"))),
  add: async (payload) => {
    const response = await dataOf(() => api.post("/cart/items", payload));
    notifyCartChanged();
    return response;
  },
  update: async (id, payload) => {
    const response = await dataOf(() => api.put(`/cart/items/${id}`, payload));
    notifyCartChanged();
    return response;
  },
  remove: async (id) => {
    const response = await dataOf(() => api.delete(`/cart/items/${id}`));
    notifyCartChanged();
    return response;
  },
  checkout: async (payload) => {
    const response = await dataOf(() => api.post("/checkout", {
      fulfillment_method: "PICKUP",
      payment_method: payload.payment_method || "BANK_TRANSFER",
      notes: payload.notes
    }));
    notifyCartChanged();
    return response;
  },
  uploadProof: (orderId, file) => paymentService.uploadProof(orderId, file)
};

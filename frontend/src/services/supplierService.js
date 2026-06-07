import api, { dataOf } from "./api";

export const supplierService = {
  list: () => dataOf(() => api.get("/suppliers")),
  create: (payload) => dataOf(() => api.post("/suppliers", payload)),
  update: (id, payload) => dataOf(() => api.put(`/suppliers/${id}`, payload)),
  remove: (id) => dataOf(() => api.delete(`/suppliers/${id}`))
};

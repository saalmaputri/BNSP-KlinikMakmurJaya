import api, { dataOf } from "./api";

export const supplierService = {
  list: () => dataOf(() => api.get("/suppliers")),
  create: (payload) => dataOf(() => api.post("/suppliers", payload))
};

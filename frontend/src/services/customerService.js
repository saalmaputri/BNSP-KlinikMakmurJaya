import api, { dataOf } from "./api";

export const customerService = {
  list: () => dataOf(() => api.get("/customers"))
};

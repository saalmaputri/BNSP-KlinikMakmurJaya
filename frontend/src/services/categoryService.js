import api, { dataOf } from "./api";

export const categoryService = {
  list: () => dataOf(() => api.get("/categories")),
  create: (payload) => dataOf(() => api.post("/categories", { ...payload, slug: payload.slug || payload.name?.toLowerCase().replace(/\s+/g, "-") }))
};

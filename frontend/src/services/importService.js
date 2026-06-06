import api, { dataOf } from "./api";

export const importService = {
  medicines: (payload) => dataOf(() => api.post("/imports/medicines", payload)),
  job: (id) => dataOf(() => api.get(`/imports/jobs/${id}`))
};

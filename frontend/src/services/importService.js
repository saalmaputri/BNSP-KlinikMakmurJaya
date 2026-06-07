import api, { dataOf } from "./api";

export const importService = {
  medicines: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return dataOf(() => api.post("/imports/medicines", formData, { headers: { "Content-Type": "multipart/form-data" } }));
  },
  job: (id) => dataOf(() => api.get(`/imports/jobs/${id}`))
};

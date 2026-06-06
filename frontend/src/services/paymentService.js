import api, { dataOf } from "./api";

export const paymentService = {
  uploadProof: (orderId, file) => {
    const formData = new FormData();
    formData.append("proof", file);
    return dataOf(() => api.post(`/payments/${orderId}/upload-proof`, formData));
  }
};

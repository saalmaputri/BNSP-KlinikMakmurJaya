import api, { assetUrl, dataOf } from "./api";

const normalizePayment = (payment = {}) => ({
  ...payment,
  id: payment.id || payment.payment_id,
  proof_file_url: assetUrl(payment.proof_file_url),
  order_number: payment.order_number || payment.order_id,
  patient_name: payment.patient_name || "-"
});

const normalizePayments = (payload) => {
  const items = Array.isArray(payload) ? payload : payload?.data || payload?.items || payload?.results || [];
  return items.map(normalizePayment);
};

export const paymentService = {
  uploadProof: (orderId, file) => {
    const formData = new FormData();
    formData.append("proof", file);
    return dataOf(() => api.post(`/payments/${orderId}/upload-proof`, formData));
  },
  reviewList: async () => normalizePayments(await dataOf(() => api.get("/payments/review"))),
  verify: (paymentId, payload) => dataOf(() => api.post(`/payments/${paymentId}/verify`, payload))
};

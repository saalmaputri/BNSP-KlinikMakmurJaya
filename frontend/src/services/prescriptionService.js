import api, { assetUrl, dataOf } from "./api";

const normalizePrescription = (item = {}) => ({
  ...item,
  patient_id: item.patient_id || item.patient || item.customer || "-",
  patient_name: item.patient_name || "Pasien",
  doctor_name: item.doctor_name || item.doctor || null,
  file_url: assetUrl(item.file_url || item.image_url),
  created_at: item.created_at || item.uploaded_at || item.date
});

const normalizePrescriptions = (payload) => {
  const items = Array.isArray(payload) ? payload : payload?.data || payload?.items || payload?.results || [];
  return items.map(normalizePrescription);
};

export const prescriptionService = {
  request: () => dataOf(() => api.post("/prescriptions/request")),
  upload: (payload) => {
    const formData = new FormData();
    formData.append("order_id", payload.order_id);
    formData.append("prescription_image", payload.file);
    if (payload.doctor_name) formData.append("doctor_name", payload.doctor_name);
    if (payload.prescription_number) formData.append("prescription_number", payload.prescription_number);
    if (payload.notes) formData.append("notes", payload.notes);
    return dataOf(() => api.post("/prescriptions/upload", formData));
  },
  mine: async () => normalizePrescriptions(await dataOf(() => api.get("/prescriptions/my"))),
  pending: async () => normalizePrescriptions(await dataOf(() => api.get("/prescriptions/pending"))),
  history: async () => normalizePrescriptions(await dataOf(() => api.get("/prescriptions/history"))),
  byOrder: async (orderId) => normalizePrescription(await dataOf(() => api.get(`/prescriptions/by-order/${orderId}`))),
  approve: (id, payload) => dataOf(() => api.post(`/prescriptions/${id}/approve`, { notes: payload?.notes || payload?.note })),
  reject: (id, payload) => dataOf(() => api.post(`/prescriptions/${id}/reject`, { notes: payload?.notes || payload?.note }))
};

import api, { assetUrl, dataOf } from "./api";

export const normalizeMedicine = (item = {}) => ({
  ...item,
  name: item.name || item.medicine_name || item.medicine_name_snapshot || item.medicine_id || "-",
  selling_price: item.selling_price ?? item.price ?? 0,
  current_stock: item.current_stock ?? item.available_quantity ?? item.stock ?? 0,
  minimum_stock: item.minimum_stock ?? item.min_stock ?? 0,
  category_id: item.category_id ?? item.category?.id ?? item.category ?? null,
  category_name: item.category_name ?? item.category?.name ?? item.category ?? "Obat",
  supplier_id: item.supplier_id ?? item.supplier?.id ?? null,
  supplier_name: item.supplier_name ?? item.supplier?.name ?? item.supplier ?? "-",
  expired_date: item.expired_date ?? item.expires_at ?? item.nearest_expired_date ?? "-",
  description: item.description || item.generic_name || "Informasi produk akan mengikuti data dari backend Klinik Makmur Jaya.",
  strength: item.strength || item.generic_name || item.sku || "-",
  status: item.status ?? ((item.current_stock ?? item.available_quantity ?? item.stock ?? 0) <= (item.minimum_stock ?? item.min_stock ?? 0) ? "kritis" : "aman"),
  image_url: assetUrl(item.image_url) || ""
});

const normalizeMedicineList = (payload) => {
  const items = Array.isArray(payload) ? payload : payload?.data || payload?.items || payload?.results || [];
  return items.map(normalizeMedicine);
};

export const medicineService = {
  list: async (params) => normalizeMedicineList(await dataOf(() => api.get("/medicines", { params }))),
  search: async (params) => normalizeMedicineList(await dataOf(() => api.get("/medicines/search", { params }))),
  autocomplete: (keyword) => dataOf(() => api.get("/medicines/autocomplete", { params: { keyword } })),
  detail: async (id) => normalizeMedicine(await dataOf(() => api.get(`/medicines/${id}`))),
  batches: async (id) => dataOf(() => api.get(`/medicines/${id}/batches`)),
  create: async (payload) => {
    const formData = new FormData();
    [
      "category_id",
      "supplier_id",
      "name",
      "generic_name",
      "description",
      "dosage_form",
      "strength",
      "unit",
      "selling_price",
      "requires_prescription",
      "minimum_stock"
    ].forEach((key) => formData.append(key, payload[key]));
    formData.append("image", payload.image);
    return normalizeMedicine(await dataOf(() => api.post("/medicines", formData)));
  },
  update: async (id, payload) => normalizeMedicine(await dataOf(() => api.put(`/medicines/${id}`, {
    category_id: payload.category_id,
    supplier_id: payload.supplier_id,
    name: payload.name,
    generic_name: payload.generic_name,
    description: payload.description,
    dosage_form: payload.dosage_form,
    strength: payload.strength,
    unit: payload.unit,
    selling_price: payload.selling_price ?? payload.price,
    requires_prescription: payload.requires_prescription,
    minimum_stock: payload.minimum_stock ?? payload.min_stock,
    is_active: payload.is_active
  }))),
  remove: (id) => dataOf(() => api.delete(`/medicines/${id}`)),
  uploadImage: (id, file) => {
    const formData = new FormData();
    formData.append("image", file);
    return dataOf(() => api.post(`/medicines/${id}/images`, formData));
  }
};

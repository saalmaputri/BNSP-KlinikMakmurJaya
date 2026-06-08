import api, { dataOf } from "./api";

const normalizeUser = (item = {}) => ({
  ...item,
  id: item.id || item.user_id,
  full_name: item.full_name || item.name || item.email || "-",
  email: item.email || "-",
  phone: item.phone || "-",
  role_code: item.role_code || item.role || "-",
  status: item.status || "-",
  gender: item.gender || "-",
  created_at: item.created_at || item.registered_at || item.updated_at || null
});

const normalizeUsers = (payload) => {
  const items = Array.isArray(payload) ? payload : payload?.data || payload?.items || payload?.results || [];
  return items.map(normalizeUser);
};

export const userService = {
  list: async () => normalizeUsers(await dataOf(() => api.get("/auth/users")))
};

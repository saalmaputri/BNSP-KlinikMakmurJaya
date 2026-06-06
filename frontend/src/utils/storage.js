export const normalizeRole = (role) => {
  const value = String(role || "").toLowerCase();
  const map = {
    admin: "admin",
    apoteker: "apoteker",
    pharmacist: "apoteker",
    kasir: "kasir",
    cashier: "kasir",
    pasien: "pasien",
    customer: "pasien"
  };
  return map[value] || value || "admin";
};

export const normalizeUser = (user) => {
  if (!user) return null;
  const role = normalizeRole(user.role || user.role_code);
  return {
    ...user,
    role,
    name: user.name || user.full_name || user.email || "User"
  };
};

export const authStorage = {
  getToken: () => localStorage.getItem("kmj_token"),
  setToken: (token) => localStorage.setItem("kmj_token", token),
  getRefreshToken: () => localStorage.getItem("kmj_refresh_token"),
  setRefreshToken: (token) => localStorage.setItem("kmj_refresh_token", token),
  clear: () => {
    localStorage.removeItem("kmj_token");
    localStorage.removeItem("kmj_refresh_token");
    localStorage.removeItem("kmj_user");
  },
  getUser: () => {
    try {
      return normalizeUser(JSON.parse(localStorage.getItem("kmj_user"))) || null;
    } catch {
      return null;
    }
  },
  setUser: (user) => localStorage.setItem("kmj_user", JSON.stringify(normalizeUser(user)))
};

export const rupiah = (value = 0) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));

export const normalizeList = (payload, fallback = []) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return fallback;
};

import api, { dataOf } from "./api";
import { authStorage, normalizeRole, normalizeUser } from "../utils/storage";

const normalizeAuthUser = (user, fallbackRole = "admin") => {
  const role = normalizeRole(user?.role || user?.role_code || fallbackRole);
  return normalizeUser({
    ...user,
    name: user?.name || user?.full_name || user?.email,
    role
  });
};

export const authService = {
  login: async (payload) => {
    const fallbackRole = payload.role || payload.email?.split("@")[0] || "admin";
    const data = await dataOf(() => api.post("/auth/login", { email: payload.email, password: payload.password }));
    const token = data.access_token || data.token;
    const refreshToken = data.refresh_token;
    if (token) authStorage.setToken(token);
    if (refreshToken) authStorage.setRefreshToken(refreshToken);
    const profile = data.user || data.data?.user || await dataOf(() => api.get("/auth/me"));
    const user = normalizeAuthUser(profile, fallbackRole);
    authStorage.setUser(user);
    return { token, user };
  },
  register: (payload) => dataOf(() => api.post("/auth/register", {
    full_name: payload.full_name || payload.name,
    email: payload.email,
    password: payload.password,
    phone: payload.phone,
    date_of_birth: payload.date_of_birth || payload.birth_date || null,
    gender: payload.gender || null,
    address: payload.address
  })),
  verifyEmail: (payload) => dataOf(() => api.post("/auth/verify-email", { token: payload.token || payload.code })),
  refresh: () => dataOf(() => api.post("/auth/refresh", { refresh_token: authStorage.getRefreshToken() })),
  me: async () => normalizeAuthUser(await dataOf(() => api.get("/auth/me"))),
  logout: async () => {
    await dataOf(() => api.post("/auth/logout"));
    authStorage.clear();
  }
};

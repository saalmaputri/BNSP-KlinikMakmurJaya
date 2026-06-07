import axios from "axios";
import { authStorage } from "../utils/storage";

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const apiBaseUrl = (() => {
  if (typeof window === "undefined") return configuredBaseUrl;

  try {
    const url = new URL(configuredBaseUrl);
    const browserHost = window.location.hostname;
    const apiUsesLocalhost = ["localhost", "127.0.0.1"].includes(url.hostname);
    const browserIsRemote = !["localhost", "127.0.0.1"].includes(browserHost);
    if (apiUsesLocalhost && browserIsRemote) url.hostname = browserHost;
    return url.toString().replace(/\/$/, "");
  } catch {
    return configuredBaseUrl;
  }
})();

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30000
});

let refreshRequest = null;

if (typeof window !== "undefined") {
  window.__KMJ_API_BASE_URL__ = api.defaults.baseURL;
}

api.interceptors.request.use((config) => {
  const token = authStorage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;
    const isUnauthorized = error?.response?.status === 401;
    const isRefreshRequest = originalRequest?.url?.includes("/auth/refresh");
    const refreshToken = authStorage.getRefreshToken();

    if (isUnauthorized && refreshToken && originalRequest && !originalRequest._retry && !isRefreshRequest) {
      originalRequest._retry = true;

      try {
        refreshRequest = refreshRequest || axios.post(`${api.defaults.baseURL || ""}/auth/refresh`, { refresh_token: refreshToken });
        const response = await refreshRequest;
        refreshRequest = null;

        const token = response.data?.access_token || response.data?.token;
        const nextRefreshToken = response.data?.refresh_token;
        if (token) authStorage.setToken(token);
        if (nextRefreshToken) authStorage.setRefreshToken(nextRefreshToken);

        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) {
        refreshRequest = null;
      }
    }

    if (isUnauthorized) {
      authStorage.clear();
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  }
);

export const dataOf = async (request) => {
  const response = await request();
  return response.data;
};

export const assetUrl = (path) => {
  if (typeof path !== "string" || !path) return path;
  if (/^https?:\/\//i.test(path) || path.startsWith("blob:")) return path;
  const baseUrl = api.defaults.baseURL || "";
  return `${baseUrl.replace(/\/$/, "")}/${String(path).replace(/^\//, "")}`;
};

export default api;

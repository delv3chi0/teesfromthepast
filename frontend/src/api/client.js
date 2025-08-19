// frontend/src/api/client.js
import axios from "axios";

// Vite: VITE_API_BASE=https://teesfromthepast.onrender.com
const RAW_BASE = import.meta.env.VITE_API_BASE || "";
const API_BASE = RAW_BASE.replace(/\/+$/, "");

export const client = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api` : "/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: false, // <-- critical: no cookies
});

// ---- Auth header helpers ----
export function setAuthHeader(token) {
  if (token) client.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete client.defaults.headers.common.Authorization;
}
export const clearAuthHeader = () => setAuthHeader(null);

// No-op; kept for compatibility
export async function initApi() { return; }

// Optional: central error logging
client.interceptors.response.use(
  (r) => r,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) console.warn("[API] 401 Unauthorized");
    return Promise.reject(error);
  }
);

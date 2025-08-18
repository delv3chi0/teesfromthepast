// frontend/src/api/client.js
import axios from "axios";

// Base URL (no trailing slash). In Vite, set VITE_API_BASE=https://teesfromthepast.onrender.com
const RAW_BASE = import.meta.env.VITE_API_BASE || "";
const API_BASE = RAW_BASE.replace(/\/+$/, "");
if (!API_BASE) {
  // eslint-disable-next-line no-console
  console.warn("[client] VITE_API_BASE is not set; requests will be relative.");
}

export const client = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api` : "/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: false, // IMPORTANT: we're not using cookies for auth
});

// ---- Auth header helpers ----
export function setAuthHeader(token) {
  if (token) {
    client.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete client.defaults.headers.common.Authorization;
  }
}
export const clearAuthHeader = () => setAuthHeader(null);

// No-op now, kept so imports don't break
export async function initApi() {
  // nothing needed; left for backward compatibility with main.jsx
  return;
}

// Optional: central error logging
client.interceptors.response.use(
  (r) => r,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      // eslint-disable-next-line no-console
      console.warn("[API] 401 Unauthorized");
    }
    return Promise.reject(error);
  }
);

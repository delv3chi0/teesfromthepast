// frontend/src/api/client.js
import axios from "axios";

const RAW_BASE = import.meta.env.VITE_API_BASE || "";
const API_BASE = RAW_BASE.replace(/\/+$/, "");

export const client = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api` : "/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

export function setAuthHeader(token) {
  if (token) client.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete client.defaults.headers.common.Authorization;
}
export function setSessionIdHeader(sessionId) {
  if (sessionId) client.defaults.headers.common["X-Session-Id"] = sessionId;
  else delete client.defaults.headers.common["X-Session-Id"];
}
export const clearAuthHeader = () => setAuthHeader(null);

// initialize headers from storage on app boot
export async function initApi() {
  try {
    const token = localStorage.getItem("tftp_token") || localStorage.getItem("token");
    const sessionId = localStorage.getItem("tftp_session");
    if (token) setAuthHeader(token);
    if (sessionId) setSessionIdHeader(sessionId);
  } catch {}
}

client.interceptors.response.use(
  (r) => r,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      try {
        localStorage.removeItem("tftp_token");
        localStorage.removeItem("token");
        localStorage.removeItem("tftp_session");
      } catch {}
      delete client.defaults.headers.common.Authorization;
      delete client.defaults.headers.common["X-Session-Id"];
      const redirect = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.assign(`/login?redirect=${redirect}`);
    }
    return Promise.reject(error);
  }
);

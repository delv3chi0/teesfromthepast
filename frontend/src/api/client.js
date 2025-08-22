// frontend/src/api/client.js
import axios from "axios";

const RAW_BASE = import.meta.env.VITE_API_BASE || "";
const API_BASE = RAW_BASE.replace(/\/+$/, "");

export const client = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api` : "/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

// ---- Auth header helpers ----
export function setAuthHeader(token) {
  if (token) client.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete client.defaults.headers.common.Authorization;
}
export const clearAuthHeader = () => setAuthHeader(null);

// ---- Session header helper ----
export function setSessionId(jti) {
  if (jti) {
    localStorage.setItem("tftp_session_jti", jti);
    client.defaults.headers.common["X-Session-Id"] = jti;
  } else {
    localStorage.removeItem("tftp_session_jti");
    delete client.defaults.headers.common["X-Session-Id"];
  }
}

// ---- Client hints on every request ----
client.interceptors.request.use((config) => {
  try {
    const jti = localStorage.getItem("tftp_session_jti");
    if (jti) config.headers["X-Session-Id"] = jti;

    const d = window?.document;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const lang = navigator.language || "";
    const viewport = `${window.innerWidth}x${window.innerHeight}`;
    const platform = navigator.platform || "";
    const ua = navigator.userAgent || "";
    const localTime = new Date().toISOString();
    const deviceMemory = navigator.deviceMemory || "";
    const cpuCores = navigator.hardwareConcurrency || "";

    config.headers["X-Client-Timezone"] = tz;
    config.headers["X-Client-Lang"] = lang;
    config.headers["X-Client-Viewport"] = viewport;
    config.headers["X-Client-Platform"] = platform;
    config.headers["X-Client-UA"] = ua;
    config.headers["X-Client-LocalTime"] = localTime;
    config.headers["X-Client-DeviceMemory"] = deviceMemory;
    config.headers["X-Client-CPUCores"] = cpuCores;
  } catch {}
  return config;
});

// ---- Unauthorized redirect ----
client.interceptors.response.use(
  (r) => r,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      try {
        localStorage.removeItem("tftp_token");
        localStorage.removeItem("token");
        localStorage.removeItem("tftp_session_jti");
      } catch {}
      clearAuthHeader();
      setSessionId(null);
      const redirect = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.assign(`/login?redirect=${redirect}`);
    }
    return Promise.reject(error);
  }
);

// init from localStorage on first import
(() => {
  try {
    const token = localStorage.getItem("tftp_token") || localStorage.getItem("token");
    const jti = localStorage.getItem("tftp_session_jti");
    if (token) setAuthHeader(token);
    if (jti) setSessionId(jti);
  } catch {}
})();

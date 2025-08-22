// frontend/src/api/client.js
import axios from "axios";

const RAW_BASE = import.meta.env.VITE_API_BASE || "";
const API_BASE = RAW_BASE.replace(/\/+$/, "");

export const client = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api` : "/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: false, // no cross-site cookies needed
});

export function setAuthHeader(token) {
  if (token) client.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete client.defaults.headers.common.Authorization;
}
export const clearAuthHeader = () => setAuthHeader(null);

// Collect client hints for richer auditing (header-based, cheap to attach)
function computeClientHeaders() {
  if (typeof window === "undefined") return {};
  const d = window.document;
  // viewport might change; we recompute on each boot
  const viewport = `${window.innerWidth || 0}x${window.innerHeight || 0}`;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const langs = Array.isArray(navigator.languages) ? navigator.languages.join(",") : (navigator.language || "");
  const platform = navigator.platform || "";
  const ua = navigator.userAgent || "";
  const localTime = new Date().toISOString();
  const deviceMemory = typeof navigator.deviceMemory !== "undefined" ? String(navigator.deviceMemory) : "";
  const cpuCores = typeof navigator.hardwareConcurrency !== "undefined" ? String(navigator.hardwareConcurrency) : "";

  return {
    "X-Client-Viewport": viewport,
    "X-Client-Timezone": tz,
    "X-Client-Lang": langs,
    "X-Client-Platform": platform,
    "X-Client-UA": ua,
    "X-Client-LocalTime": localTime,
    "X-Client-DeviceMemory": deviceMemory,
    "X-Client-CPUCores": cpuCores,
  };
}

// set once on load; also refresh on focus (viewport may change)
function applyClientHeaders() {
  const h = computeClientHeaders();
  Object.entries(h).forEach(([k, v]) => {
    if (v) client.defaults.headers.common[k] = v;
  });
}
applyClientHeaders();
if (typeof window !== "undefined") {
  window.addEventListener("focus", applyClientHeaders);
}

export async function initApi() {
  // no-op; headers are already set at module init
  return;
}

// Store X-Session-ID header when we get it from /auth login/register responses
export function setSessionHeader(jti) {
  if (jti) client.defaults.headers.common["X-Session-ID"] = jti;
  else delete client.defaults.headers.common["X-Session-ID"];
}

// Global 401/403 handler
client.interceptors.response.use(
  (r) => r,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      try {
        localStorage.removeItem("tftp_token");
        localStorage.removeItem("token");
      } catch {}
      delete client.defaults.headers.common.Authorization;
      delete client.defaults.headers.common["X-Session-ID"];
      const redirect = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.assign(`/login?redirect=${redirect}`);
    }
    return Promise.reject(error);
  }
);

// frontend/src/api/client.js
import axios from "axios";

/** Normalize and pick API base */
function resolveApiBase() {
  let base =
    import.meta.env.VITE_API_BASE ||
    import.meta.env.VITE_API_BASE_URL ||
    "";

  if (typeof base !== "string") base = "";

  // If empty, choose a sensible default based on host
  if (!/^https?:\/\//i.test(base)) {
    const host = typeof window !== "undefined" ? window.location.host : "";
    const onVercel = host.endsWith(".vercel.app") || host.includes("vercel");
    if (onVercel) {
      base = "https://teesfromthepast.onrender.com"; // hard fallback in prod
    } else {
      base = ""; // dev: relative (use Vite proxy if you want)
    }
  }

  // Trim trailing slashes
  base = base.replace(/\/+$/, "");
  // If user provided ".../api", strip it so we don't end up with /api/api
  if (base.toLowerCase().endsWith("/api")) {
    base = base.slice(0, -4);
  }
  return base;
}

const API_BASE = resolveApiBase();

/** Axios instance */
export const client = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api` : "/api",
  withCredentials: true,
});

/** Auth header helpers */
export function setAuthHeader(token) {
  if (!token) {
    delete client.defaults.headers.common.Authorization;
    return;
  }
  client.defaults.headers.common.Authorization = `Bearer ${token}`;
}
export function clearAuthHeader() {
  delete client.defaults.headers.common.Authorization;
}

/** CSRF: read cookie set by backend (/api/csrf) and mirror on unsafe methods */
function getCsrfFromCookie() {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

client.interceptors.request.use((config) => {
  const method = (config.method || "get").toLowerCase();
  if (["post", "put", "patch", "delete"].includes(method)) {
    const token = getCsrfFromCookie();
    if (token) config.headers["X-CSRF-Token"] = token;
  }
  return config;
});

client.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 403) {
      console.warn(
        "[API] 403 Forbidden — possible CSRF/token issue:",
        err?.response?.data || err?.message
      );
    }
    return Promise.reject(err);
  }
);

/** Pre-warm CSRF cookie once at app start */
export async function initApi() {
  try {
    await axios.get(`${API_BASE || ""}/api/csrf`, { withCredentials: true });
    console.log("[client] CSRF initialized");
  } catch (e) {
    console.warn("[client] CSRF init failed (will retry on demand)", e?.message || e);
  }
}

// frontend/src/api/client.js
import axios from "axios";

// ---------- Base URL ----------
// Prefer VITE_API_BASE if you set it (e.g. https://teesfromthepast.onrender.com)
// We'll append /api if it's missing.
const RAW_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE?.trim()) ||
  (typeof window !== "undefined" && window.location?.hostname?.includes("localhost")
    ? "http://localhost:5000"
    : "https://teesfromthepast.onrender.com");

const API_BASE = RAW_BASE.endsWith("/api") ? RAW_BASE : `${RAW_BASE}/api`;

// One axios instance for the whole app
export const client = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // send cookies (needed for CSRF cookie)
  timeout: 30000,
});

// Axios XSRF conventions (helps in some setups)
client.defaults.xsrfCookieName = "XSRF-TOKEN";
client.defaults.xsrfHeaderName = "X-CSRF-Token";

// Keep a local copy of the csrf token (optional but handy)
let csrfTokenCache = "";

// Normalize any accidental leading "/api" in paths when you already have baseURL=/api
function normalizePath(url) {
  if (!url) return url;
  // If someone calls client.get('/api/auth/login'), strip the duplicate prefix
  return url.replace(/^\/api(\/|$)/, "/");
}

// ----- Request interceptor: normalize path & attach CSRF for unsafe methods -----
client.interceptors.request.use((config) => {
  config.url = normalizePath(config.url || "");

  const method = (config.method || "get").toLowerCase();
  const needsCsrf = method === "post" || method === "put" || method === "patch" || method === "delete";

  if (needsCsrf) {
    // Attach cached token if we have it
    if (csrfTokenCache && !config.headers?.["X-CSRF-Token"]) {
      config.headers = { ...(config.headers || {}), "X-CSRF-Token": csrfTokenCache };
    }
  }
  return config;
});

// ----- Response interceptor: if CSRF fails, refresh once and retry -----
client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error || {};
    const status = response?.status;

    // Retry once on 403 CSRF failures
    const isCsrfFailure =
      status === 403 &&
      (response?.data?.message?.toLowerCase?.().includes("csrf") ||
        response?.data?.error?.toLowerCase?.().includes("csrf"));

    if (isCsrfFailure && config && !config.__retriedCsrf) {
      try {
        await initApi(); // refresh CSRF token
        config.__retriedCsrf = true;
        return client(config); // retry original request
      } catch {
        // fall through to reject
      }
    }

    return Promise.reject(error);
  }
);

// ---------- Public helpers ----------
export function setAuthHeader(token) {
  if (token) {
    client.defaults.headers.common.Authorization = `Bearer ${token}`;
  }
}

export function clearAuthHeader() {
  delete client.defaults.headers.common.Authorization;
}

// Call this once at app start (we call it from main.jsx)
export async function initApi() {
  try {
    // IMPORTANT: use '/csrf' (NOT '/api/csrf') because baseURL already includes /api
    const { data } = await client.get("/csrf");
    csrfTokenCache = data?.csrfToken || "";

    // Also place on axios defaults so future requests have it even without manual header
    client.defaults.headers.common["X-CSRF-Token"] = csrfTokenCache;
  } catch (e) {
    // Not fatal — first unsafe request will trigger the interceptor refresh path
    // console.warn('[initApi] CSRF pre-warm failed', e);
  }
}

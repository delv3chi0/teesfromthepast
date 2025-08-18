// frontend/src/api/client.js
import axios from "axios";

// IMPORTANT: VITE_API_BASE_URL must NOT end with /api
//   e.g. https://teesfromthepast.onrender.com  (no trailing /api)
const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") || "";

// Single axios instance for your app
export const client = axios.create({
  baseURL: `${API_BASE}/api`,   // add /api exactly once
  withCredentials: true,        // allow cookies across origins
});

/**
 * --- Authorization header helpers (used by AuthProvider) ---
 */
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

/**
 * --- CSRF helpers ---
 * We keep a double-submit cookie "csrfToken" that the backend sets via /api/csrf.
 * For unsafe methods, mirror that cookie into the X-CSRF-Token header.
 */
function getCsrfFromCookie() {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

// Attach CSRF header on unsafe methods
client.interceptors.request.use((config) => {
  const method = (config.method || "get").toLowerCase();
  if (["post", "put", "patch", "delete"].includes(method)) {
    const token = getCsrfFromCookie();
    if (token) config.headers["X-CSRF-Token"] = token;
  }
  return config;
});

// Log helpful info on CSRF issues
client.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 403) {
      // eslint-disable-next-line no-console
      console.warn(
        "[API] 403 Forbidden — possible CSRF/token issue:",
        err?.response?.data || err?.message
      );
    }
    return Promise.reject(err);
  }
);

/**
 * Pre-warm CSRF by calling /api/csrf once at app start.
 * Safe to call multiple times; backend will reuse the existing cookie.
 */
export async function initApi() {
  try {
    await axios.get(`${API_BASE}/api/csrf`, { withCredentials: true });
    // eslint-disable-next-line no-console
    console.log("[client] CSRF initialized");
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[client] CSRF init failed (will retry on demand)", e?.message || e);
  }
}

// frontend/src/api/client.js
import axios from "axios";

// --- Base URL ---
// Prefer an env var at build time; fallback to same-origin
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== "undefined" ? `${window.location.origin}` : "");

// Create an axios instance pointed at your backend domain
export const client = axios.create({
  baseURL: API_BASE.replace(/\/$/, ""), // no trailing slash
  withCredentials: true,                // send/receive cookies (CSRF, session, etc.)
  headers: {
    "Content-Type": "application/json",
  },
});

// Track whether we have a token set
let csrfReady = false;
let csrfInFlight = null;

// Fetch a fresh CSRF token and set the default header
async function primeCsrf() {
  if (csrfReady) return true;
  if (csrfInFlight) {
    await csrfInFlight;
    return csrfReady;
  }
  csrfInFlight = (async () => {
    try {
      // IMPORTANT: hit the backend path (it’s mounted at /api/csrf on the backend)
      const { data } = await client.get("/api/csrf");
      const token = data?.csrfToken || "";
      if (token) {
        client.defaults.headers.common["X-CSRF-Token"] = token;
        csrfReady = true;
      } else {
        csrfReady = false;
      }
    } catch {
      csrfReady = false;
    } finally {
      csrfInFlight = null;
    }
  })();
  await csrfInFlight;
  return csrfReady;
}

// Helper to decide if a request is "unsafe"
function isUnsafe(method) {
  const m = (method || "GET").toUpperCase();
  return m === "POST" || m === "PUT" || m === "PATCH" || m === "DELETE";
}

// Request interceptor: for unsafe requests, ensure we have a token first
client.interceptors.request.use(
  async (config) => {
    if (isUnsafe(config.method) && !csrfReady) {
      await primeCsrf();
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: if CSRF fails once, re-prime and retry **once**
client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error?.config;
    const status = error?.response?.status;
    const msg = error?.response?.data?.message;

    const isCsrfError = status === 403 && /csrf/i.test(String(msg || ""));
    const notRetriedYet = !original?._retry;

    if (isCsrfError && notRetriedYet) {
      original._retry = true;
      csrfReady = false; // force refresh
      await primeCsrf();
      return client(original);
    }

    return Promise.reject(error);
  }
);

// Optional helpers if you also carry a Bearer token after login
export const setAuthHeader = (token) => {
  if (token) {
    client.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete client.defaults.headers.common.Authorization;
  }
};
export const clearAuthHeader = () => {
  delete client.defaults.headers.common.Authorization;
};

// Export a manual init called by your app root if you want to prime early (not required)
export async function initApi() {
  await primeCsrf();
}

// frontend/src/api/client.js
import axios from "axios";

// ---------- API base ----------
const envBase = (import.meta?.env?.VITE_API_BASE || "").trim().replace(/\/$/, "");
const DEFAULT_PROD = "https://teesfromthepast.onrender.com/api";
const DEFAULT_DEV  = "http://localhost:5000/api";

const API_BASE =
  envBase ||
  (typeof window !== "undefined" && window.location.hostname.includes("localhost")
    ? DEFAULT_DEV
    : DEFAULT_PROD);

// ---------- Axios instance ----------
export const client = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // allow cookies (for CSRF cookie)
});

// ---------- Auth helpers ----------
export const setAuthHeader = (token) => {
  if (token) {
    const v = `Bearer ${token}`;
    axios.defaults.headers.common.Authorization = v;
    client.defaults.headers.common.Authorization = v;
  } else {
    delete axios.defaults.headers.common.Authorization;
    delete client.defaults.headers.common.Authorization;
  }
};
export const clearAuthHeader = () => {
  delete axios.defaults.headers.common.Authorization;
  delete client.defaults.headers.common.Authorization;
};

// ---------- CSRF Auto-Prime ----------
let csrfToken = "";
let priming = null;

async function primeCsrf() {
  if (csrfToken) return csrfToken;
  if (priming) return priming;

  priming = (async () => {
    try {
      const { data } = await client.get("/csrf"); // -> /api/csrf
      csrfToken = data?.csrfToken || "";
      if (csrfToken) {
        axios.defaults.headers.common["X-CSRF-Token"] = csrfToken;
        client.defaults.headers.common["X-CSRF-Token"] = csrfToken;
      }
      return csrfToken;
    } catch {
      // If CSRF endpoint is unavailable, continue without blocking — requests may still succeed
      return "";
    } finally {
      priming = null;
    }
  })();

  return priming;
}

// Interceptor: ensure CSRF for unsafe methods
client.interceptors.request.use(async (config) => {
  const m = (config.method || "get").toLowerCase();
  if (m === "post" || m === "put" || m === "patch" || m === "delete") {
    if (!csrfToken || !config.headers?.["X-CSRF-Token"]) {
      await primeCsrf();
      if (csrfToken) {
        config.headers = config.headers || {};
        config.headers["X-CSRF-Token"] = csrfToken;
      }
    }
  }
  return config;
});

// Optional: simple pass-through response interceptor
client.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
);

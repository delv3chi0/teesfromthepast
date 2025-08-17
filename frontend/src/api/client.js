// frontend/src/api/client.js
import axios from "axios";

/**
 * In production, set VITE_API_BASE_URL to your backend origin (no trailing slash), e.g.:
 *   VITE_API_BASE_URL=https://teesfromthepast.onrender.com
 * We append '/api' here, so callers can use relative paths like '/auth/login'.
 */
const ORIGIN =
  import.meta.env.VITE_API_BASE_URL ||
  "https://teesfromthepast.onrender.com"; // sensible prod default

export const client = axios.create({
  baseURL: `${ORIGIN.replace(/\/$/, "")}/api`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// ---------- CSRF support ----------
let csrfReady = false;
let csrfInFlight = null;

async function primeCsrf() {
  if (csrfReady) return true;
  if (csrfInFlight) { await csrfInFlight; return csrfReady; }
  csrfInFlight = (async () => {
    try {
      const { data } = await client.get("/csrf");
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

function isUnsafe(m) {
  const mm = String(m || "GET").toUpperCase();
  return mm === "POST" || mm === "PUT" || mm === "PATCH" || mm === "DELETE";
}

client.interceptors.request.use(
  async (config) => {
    if (isUnsafe(config.method) && !csrfReady) {
      await primeCsrf();
    }
    return config;
  },
  (e) => Promise.reject(e)
);

client.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error?.config;
    const status = error?.response?.status;
    const msg = error?.response?.data?.message;
    const isCsrf = status === 403 && /csrf/i.test(String(msg || ""));
    if (isCsrf && original && !original._retry) {
      original._retry = true;
      csrfReady = false;
      await primeCsrf();
      return client(original);
    }
    return Promise.reject(error);
  }
);

// Optional helpers for Bearer auth after login
export const setAuthHeader = (token) => {
  if (token) client.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete client.defaults.headers.common.Authorization;
};
export const clearAuthHeader = () => {
  delete client.defaults.headers.common.Authorization;
};

export async function initApi() {
  await primeCsrf(); // optional eager prime
}

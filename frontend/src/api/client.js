// frontend/src/api/client.js
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || ""; // e.g. "https://teesfromthepast.onrender.com"
// We'll call endpoints like "/auth/login" and axios will hit `${API_BASE}/api/auth/login`

export const client = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true, // send/receive cookies (CSRF secret, auth cookie if you use one)
});

// ---- Auth header helpers (frontend stores JWT in memory/localStorage) ----
export const setAuthHeader = (token) => {
  if (token) client.defaults.headers.common.Authorization = `Bearer ${token}`;
};
export const clearAuthHeader = () => {
  delete client.defaults.headers.common.Authorization;
};

// ---- CSRF bootstrap (lazy, no top-level await) ----
let csrfReady = null;

async function fetchCsrf() {
  // GET /api/csrf returns { csrfToken }
  const { data } = await client.get("/csrf");
  const token = data?.csrfToken || "";
  client.defaults.headers.common["X-CSRF-Token"] = token;
  return token;
}

function ensureCsrf() {
  if (!csrfReady) csrfReady = fetchCsrf().catch((e) => { csrfReady = null; throw e; });
  return csrfReady;
}

function isUnsafe(method) {
  const m = String(method || "GET").toUpperCase();
  return m !== "GET" && m !== "HEAD" && m !== "OPTIONS";
}

client.interceptors.request.use(async (config) => {
  // If this is an unsafe method and we don't yet have a token header, fetch one (once)
  if (isUnsafe(config.method) && !client.defaults.headers.common["X-CSRF-Token"]) {
    await ensureCsrf();
  }
  return config;
});

// Optional: handle 403 Invalid CSRF token by refreshing once
client.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err?.response?.status;
    const original = err?.config;
    if (status === 403 && original && !original.__retriedCsrf) {
      try {
        await fetchCsrf();
        original.__retriedCsrf = true;
        return client.request(original);
      } catch (_e) {
        // fall through to rejection
      }
    }
    return Promise.reject(err);
  }
);

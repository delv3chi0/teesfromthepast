// frontend/src/api/client.js
import axios from "axios";

/* ----------------------- base URL resolution ----------------------- */
function resolveApiBase() {
  let base =
    import.meta.env.VITE_API_BASE ||
    import.meta.env.VITE_API_BASE_URL ||
    "";

  if (typeof base !== "string") base = "";

  if (!/^https?:\/\//i.test(base)) {
    // default for prod (Vercel SPA -> Render API). In local dev, use a proxy and leave blank.
    const host = typeof window !== "undefined" ? window.location.host : "";
    const onVercel = host.endsWith(".vercel.app") || host.includes("vercel");
    base = onVercel ? "https://teesfromthepast.onrender.com" : "";
  }

  base = base.replace(/\/+$/, "");
  if (base.toLowerCase().endsWith("/api")) base = base.slice(0, -4);
  return base;
}

const API_BASE = resolveApiBase();

/* ----------------------- axios instance ----------------------- */
export const client = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api` : "/api",
  withCredentials: true, // send/receive cookies cross-site
});

/* ----------------------- auth header helpers ----------------------- */
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

/* ----------------------- CSRF management ----------------------- */
/** In-memory CSRF token (can’t rely on document.cookie across domains). */
let CSRF_TOKEN = null;
/** One-shot in-flight fetch to avoid thundering herd */
let csrfFetchPromise = null;

async function fetchCsrf() {
  if (!csrfFetchPromise) {
    csrfFetchPromise = axios
      .get(`${API_BASE || ""}/api/csrf`, { withCredentials: true })
      .then((res) => {
        CSRF_TOKEN = res?.data?.csrfToken || null;
        return CSRF_TOKEN;
      })
      .finally(() => {
        csrfFetchPromise = null;
      });
  }
  return csrfFetchPromise;
}

/** Public: call at app start (non-blocking is fine). */
export async function initApi() {
  try {
    await fetchCsrf();
    console.log("[client] CSRF initialized");
  } catch (e) {
    console.warn("[client] CSRF init failed; will retry on demand");
  }
}

/* Attach CSRF token for unsafe methods */
client.interceptors.request.use(async (config) => {
  const method = (config.method || "get").toLowerCase();
  if (!["post", "put", "patch", "delete"].includes(method)) return config;

  // If we don't have a token yet, grab it before first unsafe call
  if (!CSRF_TOKEN) {
    try {
      await fetchCsrf();
    } catch {
      // continue; server will 403 and response interceptor will retry once
    }
  }
  if (CSRF_TOKEN) config.headers["X-CSRF-Token"] = CSRF_TOKEN;
  return config;
});

/* On 403, refresh CSRF once and retry the request */
client.interceptors.response.use(
  (r) => r,
  async (error) => {
    const { config, response } = error || {};
    const status = response?.status;

    const alreadyRetried = config?._csrfRetried === true;
    const unsafe =
      !!config &&
      ["post", "put", "patch", "delete"].includes(
        (config.method || "get").toLowerCase()
      );

    if (status === 403 && unsafe && !alreadyRetried) {
      try {
        await fetchCsrf();
        const retry = { ...config, _csrfRetried: true };
        if (CSRF_TOKEN) retry.headers = { ...(retry.headers || {}), "X-CSRF-Token": CSRF_TOKEN };
        return client.request(retry);
      } catch (_) {
        // fall through to reject
      }
    }

    if (status === 403) {
      console.warn(
        "[API] 403 Forbidden — possible CSRF/token issue:",
        response?.data || error?.message
      );
    }
    return Promise.reject(error);
  }
);

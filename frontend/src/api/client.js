// frontend/src/api/client.js
import axios from "axios";

export const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://teesfromthepast.onrender.com";

export const client = axios.create({
  baseURL: `${API_BASE}/api`,
  // We do NOT send cookies for auth (you use Bearer JWT),
  // but we need credentials when fetching /api/csrf to receive the cookie.
  withCredentials: false,
});

// Attach/detach Bearer from outside (AuthProvider uses these):
export const setAuthHeader = (token) => {
  if (token) client.defaults.headers.common.Authorization = `Bearer ${token}`;
};
export const clearAuthHeader = () => {
  delete client.defaults.headers.common.Authorization;
};

// ---- CSRF bootstrap ----
let csrfToken = "";
let inflight; // promise to avoid double /api/csrf fetches

async function fetchCsrf() {
  // Use a bare axios call (NOT the client) so baseURL and headers don't interfere.
  const { data } = await axios.get(`${API_BASE}/api/csrf`, {
    withCredentials: true, // allow cross-site cookie set (SameSite=None)
  });
  csrfToken = data?.csrfToken || "";
  return csrfToken;
}

// Add token to unsafe methods
client.interceptors.request.use(async (config) => {
  const method = (config.method || "get").toLowerCase();
  const unsafe = method === "post" || method === "put" || method === "patch" || method === "delete";

  if (unsafe) {
    if (!csrfToken) {
      inflight = inflight || fetchCsrf();
      await inflight.catch(() => {}); // swallow; server will 403 if needed
      inflight = undefined;
    }
    if (csrfToken) {
      config.headers["X-CSRF-Token"] = csrfToken;
    }
  }
  return config;
});

// On 403 invalid CSRF, refresh once & retry
client.interceptors.response.use(
  (r) => r,
  async (error) => {
    const status = error?.response?.status;
    const reason = error?.response?.data?.message || "";
    const cfg = error?.config || {};
    if (
      status === 403 &&
      /csrf/i.test(reason) &&
      !cfg.__csrfRetried
    ) {
      try {
        await fetchCsrf();
        cfg.__csrfRetried = true;
        cfg.headers = cfg.headers || {};
        if (csrfToken) cfg.headers["X-CSRF-Token"] = csrfToken;
        return client.request(cfg);
      } catch (_) {
        // fall through to reject
      }
    }
    return Promise.reject(error);
  }
);

// Call this once at app startup (optional pre-warm)
export async function initApi() {
  try { await fetchCsrf(); } catch { /* no-op, interceptor will refresh on demand */ }
}

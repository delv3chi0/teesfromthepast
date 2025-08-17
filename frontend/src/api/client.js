// frontend/src/api/client.js
import axios from "axios";

/**
 * Axios instance used throughout the app.
 * - baseURL '' lets you pass absolute paths like '/api/...'
 * - withCredentials true for cookie reads (if any)
 */
export const client = axios.create({
  baseURL: "",
  withCredentials: true,
  // You can add a short timeout if you like:
  // timeout: 30000,
});

/**
 * Set or clear the Authorization header for both axios and our client.
 * Your AuthProvider imports these.
 */
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

// --- Optional: best-effort CSRF token priming (no top-level await) ---
// Our backend currently *skips* CSRF checks for JWT APIs, so this is not required,
// but keeping it here future-proofs us if we later enforce CSRF on some routes.
(async () => {
  try {
    const { data } = await axios.get("/api/csrf", { withCredentials: true });
    const token = data?.csrfToken;
    if (token) {
      axios.defaults.headers.common["X-CSRF-Token"] = token;
      client.defaults.headers.common["X-CSRF-Token"] = token;
    }
  } catch {
    // Silently ignore; not required for today’s JWT auth flow
  }
})();

// Optional: Response interceptor to surface common auth errors consistently
client.interceptors.response.use(
  (res) => res,
  (err) => {
    // You can customize this behavior if you want to auto-logout on 401, etc.
    return Promise.reject(err);
  }
);

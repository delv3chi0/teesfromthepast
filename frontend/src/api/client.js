// frontend/src/api/client.js
import axios from "axios";

// IMPORTANT: Make sure VITE_API_BASE_URL has NO trailing /api
// Example:
//   Vercel -> https://teesfromthepast.onrender.com
//   Local  -> http://localhost:5000
const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") || "";

export const client = axios.create({
  baseURL: `${API_BASE}/api`,   // single /api here
  withCredentials: true,        // send & receive cookies across origins
});

// Read our CSRF cookie (set by /api/csrf) so we can mirror it into the header
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
    if (token) {
      config.headers["X-CSRF-Token"] = token;
    }
  }
  return config;
});

// Optional response logging for 403 to help debugging
client.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 403) {
      console.warn("[API] 403 Forbidden — possible CSRF/token issue:", err?.response?.data || err?.message);
    }
    return Promise.reject(err);
  }
);

// Pre-warm: fetch a CSRF token cookie
export async function initApi() {
  try {
    await axios.get(`${API_BASE}/api/csrf`, { withCredentials: true });
    console.log("[client] CSRF initialized");
  } catch (e) {
    console.warn("[client] CSRF init failed (will retry on demand)", e?.message || e);
  }
}

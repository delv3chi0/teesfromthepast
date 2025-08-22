// frontend/src/api/client.js
import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_BASE_URL ||
  "/api"; // works with your proxy or full URL

export const client = axios.create({
  baseURL,
  withCredentials: false,
});

// ---- header helpers ----
export function setAuthHeader(token) {
  if (token) client.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}
export function clearAuthHeader() {
  delete client.defaults.headers.common["Authorization"];
}

export function setSessionIdHeader(jti) {
  if (jti) client.defaults.headers.common["X-Session-Id"] = jti;
}
export function clearSessionIdHeader() {
  delete client.defaults.headers.common["X-Session-Id"];
}

// Optional: pull existing token/jti from localStorage on first import
try {
  const token = localStorage.getItem("tftp_token") || localStorage.getItem("token");
  const jti = localStorage.getItem("tftp_session");
  if (token) setAuthHeader(token);
  if (jti) setSessionIdHeader(jti);
} catch {}

// ---- 401 / revoked handling ----
// If the server sends 401 with a recognizable shape, wipe session
client.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err?.response?.status;
    const data = err?.response?.data;
    const code = data?.code || data?.error || data?.message || "";

    // Tweak this condition to match your middleware's responses
    const looksRevoked =
      status === 401 &&
      /revoked|expired|invalid token|unauthorized/i.test(String(code));

    if (looksRevoked) {
      try {
        localStorage.removeItem("tftp_token");
        localStorage.removeItem("token");
        localStorage.removeItem("tftp_session");
      } catch {}
      // Let the app reroute to /login by reloading (simple + robust)
      // You can instead publish a custom event if you prefer a softer UX.
      setTimeout(() => {
        window.location.href = "/login";
      }, 50);
    }
    return Promise.reject(err);
  }
);

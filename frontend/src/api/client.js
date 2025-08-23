// frontend/src/api/client.js
import axios from "axios";

/**
 * We do NOT require any env var here.
 * We default to your backend domain so you don't need Vercel rewrites.
 *
 * If you later want to use an env var, you still can:
 *  - VITE_API_BASE or NEXT_PUBLIC_API_BASE
 */
const FALLBACK_API = "https://teesfromthepast.onrender.com/api"; // <-- your backend (Render) API
const API_BASE =
  import.meta.env.VITE_API_BASE ||
  import.meta.env.NEXT_PUBLIC_API_BASE ||
  FALLBACK_API;

export const client = axios.create({
  baseURL: API_BASE,
  // Send creds only if you use cookies (you don't now)
  withCredentials: false,
});

// --- Auth header helpers (used by AuthProvider / pages) ---
let authToken = null;
let sessionId = null;

export function setAuthHeader(token) {
  authToken = token || null;
  if (authToken) {
    client.defaults.headers.common["Authorization"] = `Bearer ${authToken}`;
    try { localStorage.setItem("tftp_token", authToken); } catch {}
  } else {
    delete client.defaults.headers.common["Authorization"];
  }
}

export function clearAuthHeader() {
  authToken = null;
  delete client.defaults.headers.common["Authorization"];
  try {
    localStorage.removeItem("tftp_token");
    localStorage.removeItem("token"); // legacy key
  } catch {}
}

/**
 * Session tracking header so the backend can block revoked sessions immediately.
 * We support both a setter that writes to localStorage and a header-only setter.
 */
const SESSION_KEY = "tftp_session_id";

export function setSessionId(jti) {
  sessionId = jti || null;
  if (sessionId) {
    client.defaults.headers.common["x-session-id"] = sessionId;
    try { localStorage.setItem(SESSION_KEY, sessionId); } catch {}
  } else {
    delete client.defaults.headers.common["x-session-id"];
    try { localStorage.removeItem(SESSION_KEY); } catch {}
  }
}

// keep for callers that want header-only behavior
export function setSessionIdHeader(jti) {
  sessionId = jti || null;
  if (sessionId) client.defaults.headers.common["x-session-id"] = sessionId;
  else delete client.defaults.headers.common["x-session-id"];
}

export function clearSessionIdHeader() {
  sessionId = null;
  delete client.defaults.headers.common["x-session-id"];
}

/**
 * On app boot, hydrate defaults from localStorage if present.
 * This avoids a race where the first API call is missing headers.
 */
(function hydrateHeadersFromStorage() {
  try {
    const t = localStorage.getItem("tftp_token") || localStorage.getItem("token");
    if (t && t !== "undefined") setAuthHeader(t);
  } catch {}
  try {
    const s = localStorage.getItem(SESSION_KEY);
    if (s && s !== "undefined") setSessionIdHeader(s);
  } catch {}
})();

// --- Interceptors: attach headers + handle 401/SESSION_REVOKED ---
client.interceptors.request.use((config) => {
  // Ensure headers are there even if caller didn’t call setters explicitly
  if (authToken && !config.headers?.Authorization) {
    config.headers = { ...(config.headers || {}), Authorization: `Bearer ${authToken}` };
  }
  if (sessionId && !config.headers?.["x-session-id"]) {
    config.headers = { ...(config.headers || {}), "x-session-id": sessionId };
  }
  // Best-effort client context (optional)
  try {
    const info = {
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      lang: navigator.language,
      platform: navigator.platform,
      vendor: navigator.vendor,
      screen: { w: window.screen?.width, h: window.screen?.height, dpr: window.devicePixelRatio || 1 },
      href: window.location?.href,
    };
    config.headers["x-client-info"] = JSON.stringify(info);
  } catch {}
  return config;
});

client.interceptors.response.use(
  (resp) => resp,
  (err) => {
    const status = err?.response?.status;
    const code =
      err?.response?.data?.code ||
      err?.response?.data?.errorCode ||
      err?.response?.data?.message;

    // If backend enforces revoked sessions -> return 401 with a clear code
    if (status === 401 && code && String(code).toUpperCase().includes("SESSION")) {
      // Clear everything so protected routes kick user to /login
      clearSessionIdHeader();
      clearAuthHeader();
      try {
        // force other tabs to clear too
        localStorage.setItem("tftp_token", "");
        localStorage.setItem("token", "");
        localStorage.setItem(SESSION_KEY, "");
      } catch {}
      // Let the app’s AuthProvider react (it calls /auth/profile on boot)
      // Caller can also catch and redirect.
    }
    return Promise.reject(err);
  }
);

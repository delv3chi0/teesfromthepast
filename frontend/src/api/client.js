// frontend/src/api/client.js
import axios from "axios";

const FALLBACK_API = "https://teesfromthepast.onrender.com/api";

// If an env var is present but doesn’t end with /api, we’ll smart-append it.
function normalizeBase(u) {
  if (!u) return FALLBACK_API;
  try {
    const url = new URL(u);
    if (!url.pathname.endsWith("/api")) {
      url.pathname = url.pathname.replace(/\/?$/, "/api");
    }
    return url.toString().replace(/\/+$/, ""); // trim trailing slash
  } catch {
    // string not a full URL; fall back
    return FALLBACK_API;
  }
}

const API_BASE = normalizeBase(
  import.meta.env.VITE_API_BASE || import.meta.env.NEXT_PUBLIC_API_BASE || FALLBACK_API
);

export const client = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
});

// ---- auth/session header helpers (unchanged) ----
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
  try { localStorage.removeItem("tftp_token"); localStorage.removeItem("token"); } catch {}
}

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
export function setSessionIdHeader(jti) {
  sessionId = jti || null;
  if (sessionId) client.defaults.headers.common["x-session-id"] = sessionId;
  else delete client.defaults.headers.common["x-session-id"];
}
export function clearSessionIdHeader() {
  sessionId = null;
  delete client.defaults.headers.common["x-session-id"];
}

// hydrate on boot
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

// ---- interceptors ----
// (Temporarily skip x-client-info until backend CORS is updated everywhere)
client.interceptors.request.use((config) => {
  if (authToken && !config.headers?.Authorization) {
    config.headers = { ...(config.headers || {}), Authorization: `Bearer ${authToken}` };
  }
  if (sessionId && !config.headers?.["x-session-id"]) {
    config.headers = { ...(config.headers || {}), "x-session-id": sessionId };
  }
  // If you want to re-enable this later, ensure backend CORS allows x-client-info
  // try {
  //   const info = {
  //     tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
  //     lang: navigator.language,
  //     platform: navigator.platform,
  //     vendor: navigator.vendor,
  //     screen: { w: window.screen?.width, h: window.screen?.height, dpr: window.devicePixelRatio || 1 },
  //     href: window.location?.href,
  //   };
  //   config.headers["x-client-info"] = JSON.stringify(info);
  // } catch {}
  return config;
});

client.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err?.response?.status;
    const code = String(
      err?.response?.data?.code ||
      err?.response?.data?.errorCode ||
      err?.response?.data?.message || ""
    ).toUpperCase();
    if (status === 401 && code.includes("SESSION")) {
      clearSessionIdHeader();
      clearAuthHeader();
      try {
        localStorage.setItem("tftp_token", "");
        localStorage.setItem("token", "");
        localStorage.setItem(SESSION_KEY, "");
      } catch {}
    }
    return Promise.reject(err);
  }
);

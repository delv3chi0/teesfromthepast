// frontend/src/api/client.js
import axios from "axios";

// ----- Base URL resolution -----
// In production on Vercel, we want calls to hit "/api" so vercel.json can proxy to Render.
// For local dev, you can set VITE_API_BASE_URL=http://localhost:5000/api (or your dev backend).
const API_BASE =
  (import.meta && import.meta.env && import.meta.env.VITE_API_BASE_URL)
    ? String(import.meta.env.VITE_API_BASE_URL).replace(/\/$/, "")
    : "/api";

// Token keys we support across the app
const TOKEN_KEYS = ["tftp_token", "token"];
const SESSION_KEY = "tftp_session";

// Helpers
export function readToken() {
  for (const k of TOKEN_KEYS) {
    const v = localStorage.getItem(k);
    if (v && v !== "undefined") return v;
  }
  return null;
}
export function setAuthHeader(token) {
  if (token) {
    client.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete client.defaults.headers.common["Authorization"];
  }
}
export function clearAuthHeader() {
  delete client.defaults.headers.common["Authorization"];
}
export function setSessionId(jti) {
  if (!jti) {
    localStorage.removeItem(SESSION_KEY);
    delete client.defaults.headers.common["X-Session-Id"];
    return;
  }
  localStorage.setItem(SESSION_KEY, jti);
  client.defaults.headers.common["X-Session-Id"] = jti;
}
export function getSessionId() {
  return localStorage.getItem(SESSION_KEY) || "";
}

// Axios instance
export const client = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach token + session automatically on each request
client.interceptors.request.use((config) => {
  // Authorization
  if (!config.headers?.Authorization) {
    const tok = readToken();
    if (tok) config.headers = { ...config.headers, Authorization: `Bearer ${tok}` };
  }
  // Session
  const jti = getSessionId();
  if (jti && !config.headers?.["X-Session-Id"]) {
    config.headers = { ...config.headers, "X-Session-Id": jti };
  }
  // Client hints (nice-to-have)
  try {
    const hints = {
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      lang: navigator.language,
      platform: navigator.platform,
      viewport:
        typeof window !== "undefined"
          ? `${window.innerWidth}x${window.innerHeight}@${window.devicePixelRatio || 1}`
          : "",
    };
    config.headers["x-client-lang"] = hints.lang;
    config.headers["x-client-timezone"] = hints.tz;
    config.headers["x-client-viewport"] = hints.viewport;
    config.headers["x-client-platform"] = hints.platform;
  } catch {}
  return config;
});

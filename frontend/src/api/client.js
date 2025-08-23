// frontend/src/api/client.js
import axios from "axios";

// --- Base URL: prod uses relative /api (Vercel rewrite); local can use VITE_API_BASE ---
const API_BASE =
  import.meta?.env?.VITE_API_BASE?.trim() ||
  "/api";

export const client = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
  },
});

// --- Auth header helpers ---
export function setAuthHeader(token) {
  if (!token) return clearAuthHeader();
  client.defaults.headers.common.Authorization = `Bearer ${token}`;
}
export function clearAuthHeader() {
  delete client.defaults.headers.common.Authorization;
}

// --- Session-ID (JTI) header helpers ---
const SESSION_HEADER = "x-session-id";
export function setSessionIdHeader(jti) {
  if (!jti) return clearSessionIdHeader();
  client.defaults.headers.common[SESSION_HEADER] = jti;
}
export function clearSessionIdHeader() {
  delete client.defaults.headers.common[SESSION_HEADER];
}

// Back-compat alias (old code may import setSessionId)
export const setSessionId = setSessionIdHeader;

// --- Global response interceptor: on 401/419, clear local session & bump to /login ---
const TOKEN_KEYS = ["tftp_token", "token"];
function nukeLocalSession() {
  TOKEN_KEYS.forEach((k) => localStorage.removeItem(k));
  // also clear our default headers to avoid thrash
  clearAuthHeader();
  clearSessionIdHeader();
}

// Avoid multiple redirects racing
let redirecting = false;
client.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    if ((status === 401 || status === 419) && !redirecting) {
      redirecting = true;
      try {
        nukeLocalSession();
        // bounce to login, keep where we were as redirect param
        const here =
          typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
        const target = `/login?redirect=${encodeURIComponent(here)}`;
        if (typeof window !== "undefined") {
          window.location.replace(target);
        }
      } catch {
        // no-op
      }
    }
    return Promise.reject(error);
  }
);

// frontend/src/api/client.js
import axios from "axios";

/**
 * Build a correct API base URL without double `/api`.
 * Rules:
 * - If VITE_API_BASE is set, use it and only append `/api` if it's not already present.
 * - If running on a vercel.app domain, default to your Render backend origin.
 * - Otherwise fallback to same-origin "/api".
 */
function withApiPath(base) {
  const b = (base || "").replace(/\/+$/, ""); // strip trailing slash
  return /\/api$/i.test(b) ? b : `${b}/api`;
}

const envBase = import.meta.env?.VITE_API_BASE || "";
const isVercel = typeof window !== "undefined" && window.location.hostname.includes("vercel.app");
const vercelFallbackOrigin = "https://teesfromthepast.onrender.com";

const API_BASE = envBase
  ? withApiPath(envBase)
  : isVercel
  ? withApiPath(vercelFallbackOrigin)
  : "/api";

export const client = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // required for CSRF cookie round-trip
  timeout: 30000,
});

// ---- Auth header helpers ----
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

// ---- Small cookie reader for csrfToken cookie (non-HttpOnly) ----
function getCookie(name) {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

// ---- CSRF bootstrap (GET /api/csrf) ----
export async function initApi() {
  try {
    // This call should set the csrfToken cookie and return a token in JSON
    const { data } = await client.get("/csrf");
    const token = data?.csrfToken || data?.token || getCookie("csrfToken");
    if (token) {
      client.defaults.headers.common["X-CSRF-Token"] = token;
      console.log("[client] CSRF initialized");
    } else {
      console.warn("[client] CSRF endpoint returned no token");
    }
  } catch (err) {
    // Don't hard-fail the app — backend may exempt some routes.
    console.warn("[client] CSRF init failed:", err?.response?.status, err?.response?.data || err?.message);
  }
}

// Always attach CSRF header if we have the cookie and header is missing.
// This covers any requests made before/without explicit initApi await.
client.interceptors.request.use((config) => {
  const headerAlready = config.headers?.["X-CSRF-Token"] || config.headers?.["x-csrf-token"];
  if (!headerAlready) {
    const token = getCookie("csrfToken");
    if (token) {
      config.headers = config.headers || {};
      config.headers["X-CSRF-Token"] = token;
    }
  }
  return config;
});

// Response interceptor: surface auth/CSRF errors nicely in the console
client.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      console.warn("[API] 401 Unauthorized — token may be expired");
    } else if (status === 403) {
      console.warn("[API] 403 Forbidden — possible CSRF/token issue:", error?.response?.data);
    }
    return Promise.reject(error);
  }
);

// Fire-and-forget bootstrap so the app has a CSRF token ASAP.
// Safe even if you also call initApi() elsewhere.
try { initApi(); } catch {}

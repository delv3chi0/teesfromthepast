// frontend/src/api/client.js
import axios from "axios";

/**
 * API base:
 * - Prefer VITE_API_BASE (set this in Vercel env to your Render URL, e.g. https://teesfromthepast.onrender.com)
 * - Fallback to Render domain if app runs on vercel.app
 * - Final fallback to same-origin "/api"
 */
const envBase = (import.meta.env && import.meta.env.VITE_API_BASE) || "";
const vercelFallback = (typeof window !== "undefined" && window.location.hostname.includes("vercel.app"))
  ? "https://teesfromthepast.onrender.com"
  : "";
const rootBase = (envBase || vercelFallback || "").replace(/\/$/, "");
const API_BASE = rootBase ? `${rootBase}/api` : "/api";

// Create axios instance used across the app
export const client = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // send/receive cookies (CSRF cookie, etc.)
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

// ---- CSRF bootstrap ----
// Fetches a CSRF token from backend (/api/csrf) and sets it on axios default headers.
// Non-blocking: safe to call without await. Return promise if you want to await it.
export async function initApi() {
  try {
    const { data } = await client.get("/csrf"); // backend: app.get('/api/csrf', csrfTokenRoute)
    const token = data?.csrfToken || data?.token;
    if (token) {
      client.defaults.headers.common["X-CSRF-Token"] = token;
      // Keep a readable cookie for frameworks if backend set one — nothing to do here on the client.
      console.log("[client] CSRF initialized");
    } else {
      console.warn("[client] CSRF endpoint returned no token");
    }
  } catch (err) {
    // Don't hard-fail the app — auth flows can still work if server exempts certain routes.
    console.warn("[client] CSRF init failed:", err?.response?.status, err?.response?.data || err?.message);
  }
}

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

// Optional: immediately kick off CSRF init (safe if you also call initApi() in main.jsx)
try { initApi(); } catch {}

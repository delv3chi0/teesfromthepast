// frontend/src/api/client.js
import axios from "axios";

// Keep this env name if you're already using it; falls back to Render URL.
const baseURL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE || // extra fallback if you used this earlier
  "https://teesfromthepast.onrender.com/api";

export const client = axios.create({
  baseURL,
  withCredentials: true, // backend CORS must have credentials: true (we set that)
  // Do NOT set Accept/Cache-Control/Pragma here; let axios/browser handle it.
});

// ----- Auth header helpers (used by AuthProvider) -----
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

// ----- Optional: tiny request/response debug in dev -----
if (import.meta.env.DEV) {
  client.interceptors.request.use((config) => {
    // console.log("[API] →", config.method?.toUpperCase(), config.url);
    return config;
  });
  client.interceptors.response.use(
    (res) => res,
    (err) => {
      // console.warn("[API] ✖", err?.response?.status, err?.config?.url, err?.message);
      return Promise.reject(err);
    }
  );
}

// ----- Keep the interceptor lean: only sync Authorization if user refreshed -----
const TOKEN_KEY = "tftp_token"; // matches AuthProvider
client.interceptors.request.use((config) => {
  // If AuthProvider already set default header we’re fine; this is just a safety net
  if (!config.headers?.Authorization) {
    try {
      const t = localStorage.getItem(TOKEN_KEY);
      if (t && t !== "undefined") {
        config.headers = config.headers || {};
        config.headers["Authorization"] = `Bearer ${t}`;
      }
    } catch {
      // ignore
    }
  }
  return config;
});

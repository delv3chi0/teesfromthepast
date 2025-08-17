// frontend/src/api/client.js
import axios from "axios";

// 1) Resolve API base
const envBase = (import.meta?.env?.VITE_API_BASE || "").trim().replace(/\/$/, "");
const DEFAULT_PROD = "https://teesfromthepast.onrender.com/api";
const DEFAULT_DEV  = "http://localhost:5000/api";

const API_BASE =
  envBase ||
  (typeof window !== "undefined" && window.location.hostname.includes("localhost")
    ? DEFAULT_DEV
    : DEFAULT_PROD);

// 2) Axios instance pointing to backend API (not the frontend origin)
export const client = axios.create({
  baseURL: API_BASE,      // e.g. https://teesfromthepast.onrender.com/api
  withCredentials: true,  // allow cookies if you ever use them
});

// 3) Auth header helpers (expected by AuthProvider)
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

// 4) Optional: CSRF priming (no top-level await)
(async () => {
  try {
    const { data } = await client.get("/csrf"); // now hits API_BASE + /csrf
    const token = data?.csrfToken;
    if (token) {
      axios.defaults.headers.common["X-CSRF-Token"] = token;
      client.defaults.headers.common["X-CSRF-Token"] = token;
    }
  } catch {
    // ignore; JWT APIs don't require it right now
  }
})();

// 5) Simple pass-through interceptor
client.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
);

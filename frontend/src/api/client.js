// frontend/src/api/client.js
import axios from "axios";

export const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "https://teesfromthepast.onrender.com/api",
  withCredentials: true,
  headers: {
    "Accept": "application/json, text/plain, */*",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
  },
});

// helpers so AuthProvider can set/clear header centrally
export const setAuthHeader = (token) => {
  client.defaults.headers.common["Authorization"] = `Bearer ${token}`;
};
export const clearAuthHeader = () => {
  delete client.defaults.headers.common["Authorization"];
};

// Request interceptor: add Authorization if token exists (belt & suspenders)
client.interceptors.request.use((config) => {
  try {
    const t = localStorage.getItem("token");
    if (t && t !== "undefined") {
      config.headers = config.headers || {};
      config.headers["Authorization"] = `Bearer ${t}`;
    }
  } catch { /* ignore */ }
  // Prevent browsers/proxies from caching API GETs
  config.headers["Cache-Control"] = "no-store";
  config.headers["Pragma"] = "no-cache";
  config.headers["Expires"] = "0";
  return config;
});

// frontend/src/api/client.js
import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "https://teesfromthepast.onrender.com/api";

export const client = axios.create({
  baseURL,
  withCredentials: true,
});

// Helpers used by AuthProvider
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

// Safety net: if a page refresh happens before AuthProvider runs,
// try to attach the token from localStorage.
const TOKEN_KEYS = ["tftp_token", "token"];
client.interceptors.request.use((config) => {
  if (!config.headers?.Authorization) {
    for (const key of TOKEN_KEYS) {
      const t = localStorage.getItem(key);
      if (t && t !== "undefined") {
        config.headers = config.headers || {};
        config.headers["Authorization"] = `Bearer ${t}`;
        break;
      }
    }
  }
  return config;
});

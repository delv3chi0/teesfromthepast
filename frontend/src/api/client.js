// frontend/src/api/client.js
import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_BASE ||
// prod API
  "https://teesfromthepast.onrender.com/api";

export const client = axios.create({
  baseURL,
  withCredentials: true, // allow cookie on same origin / CORS "credentials: true"
  timeout: 30000,
});

// --- helpers expected by AuthProvider ---
export const setAuthHeader = (token) => {
  if (token) client.defaults.headers.common.Authorization = `Bearer ${token}`;
};

export const clearAuthHeader = () => {
  delete client.defaults.headers.common.Authorization;
};

// frontend/src/api/client.js (pseudo)
const { data } = await axios.get('/api/csrf', { withCredentials: true });
axios.defaults.headers.common['X-CSRF-Token'] = data?.csrfToken || '';

// Optional: simple response error logging
client.interceptors.response.use(
  (res) => res,
  (err) => {
    // eslint-disable-next-line no-console
    console.warn("[API Error]", err?.response?.status, err?.response?.data);
    return Promise.reject(err);
  }
);

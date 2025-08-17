// frontend/src/api/client.js
import axios from 'axios';

// Read a cookie by name (for CSRF)
function getCookie(name) {
  const v = document.cookie.split('; ').find((row) => row.startsWith(name + '='));
  return v ? decodeURIComponent(v.split('=')[1]) : null;
}

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'https://teesfromthepast.onrender.com/api',
  withCredentials: true, // send cookies
});

// Request: add CSRF header for state-changing methods
client.interceptors.request.use((config) => {
  const method = (config.method || 'get').toLowerCase();
  if (['post', 'put', 'patch', 'delete'].includes(method)) {
    const csrf = getCookie('csrf'); // set by server
    if (csrf) config.headers['X-CSRF-Token'] = csrf;
  }
  return config;
});

// Response: silent refresh on 401 once
let isRefreshing = false;
let pending = [];

function processQueue(error, token = null) {
  pending.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  pending = [];
}

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error?.response?.status;

    if (status === 401 && !original._retry) {
      if (isRefreshing) {
        // Queue while a refresh is in progress
        return new Promise((resolve, reject) => {
          pending.push({ resolve, reject });
        }).then(() => {
          original._retry = true;
          return client(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        await client.post('/auth/refresh'); // cookies + CSRF are handled automatically
        processQueue(null);
        return client(original);
      } catch (e) {
        processQueue(e);
        // fall through to reject; caller can redirect to /login
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export { client };

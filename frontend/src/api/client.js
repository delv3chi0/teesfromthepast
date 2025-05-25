// frontend/src/api/client.js
import axios from 'axios';

export const client = axios.create({
  baseURL: import.meta.env.DEV
    ? 'http://localhost:5000/api' // For local development
    : 'https://teesfromthepast.onrender.com/api', // For production
});

// Request Interceptor: Adds the auth token to every request if it exists
client.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      // ADD THIS LOG:
      console.log('[Axios Interceptor] Token from localStorage:', token); 
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
        console.log('[Axios Interceptor] Authorization header set.');
      } else {
        console.log('[Axios Interceptor] No token found in localStorage. Header not set.');
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

client.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error from interceptor:", error.response ? error.response.data : error.message);
    return Promise.reject(error);
  }
);

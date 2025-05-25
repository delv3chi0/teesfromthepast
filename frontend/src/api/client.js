import axios from 'axios';

export const client = axios.create({
  baseURL: import.meta.env.DEV
    ? 'http://localhost:5000/api' // For local development
    : 'https://teesfromthepast.onrender.com/api', // For production
});

client.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

client.interceptors.response.use(
  (response) => response, // Simply return successful responses
  (error) => {
    console.error("API Error:", error.response ? error.response.data : error.message);
    return Promise.reject(error);
  }
);

import axios from 'axios';

export const client = axios.create({
  baseURL: import.meta.env.DEV
    ? 'http://localhost:5000/api'
    : 'https://teesfromthepast.onrender.com/api',
});

client.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token)   if (token) cfg.headers.Authorization = 'Bearer ' + token;
  return cfg;
});
client.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const { data } = await client.post('/refresh', {}, { withCredentials: true });
      localStorage.setItem('token', data.token);
      originalRequest.headers.Authorization = 'Bearer ' + data.token;
      return client(originalRequest);
    }
    return Promise.reject(error);
  }
);

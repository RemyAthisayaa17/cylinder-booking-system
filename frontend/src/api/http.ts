import axios from 'axios';
import { showError } from '../utils/toast';
console.log("VITE_API_URL =", import.meta.env.VITE_API_URL);
const http = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ??
    'http://localhost:5000/api',


  timeout: 15000,
});

 
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  return config;
});

// Global error handling
http.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const message = err?.response?.data?.msg ?? 'Something went wrong';

    if (status === 401) {
      localStorage.clear();
      showError('Session expired — login again');
      window.location.href = '/login';
    } else if (status === 429) {
      showError('Too many requests');
    } else if (status >= 500) {
      showError('Server error');
    }

    return Promise.reject({ message, status });
  }
);

export default http;
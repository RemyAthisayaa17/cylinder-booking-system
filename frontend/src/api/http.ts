import axios from 'axios';
import { showError } from '../utils/toast';

const http = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ??
    'http://localhost:5000/api',

  // No global Content-Type. Axios sets it correctly per-request:
  //   plain object body  →  application/json
  //   FormData body      →  multipart/form-data; boundary=<...>
  // A global 'application/json' override breaks multipart file uploads.
  timeout: 15000,
});

// Attach JWT + fix Content-Type for FormData
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // When sending FormData, delete the Content-Type header entirely so that
  // axios (and the browser) can set "multipart/form-data; boundary=..." 
  // automatically. Any explicit string value — even the "correct" one —
  // omits the boundary and corrupts multer's parser on the server.
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
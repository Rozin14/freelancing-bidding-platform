import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

const api = axios.create({
  baseURL: BASE_URL,
});

// Add request interceptor to ensure token is always sent
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;

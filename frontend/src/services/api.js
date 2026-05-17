import axios from 'axios';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let pendingQueue = [];

function processQueue(error, token) {
  pendingQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token)
  );
  pendingQueue = [];
}

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      window.dispatchEvent(new Event('auth:logout'));
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post(`${BASE}/auth/refresh`, { refreshToken });
      localStorage.setItem('accessToken',  data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      processQueue(null, data.accessToken);
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(original);
    } catch (err) {
      processQueue(err, null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.dispatchEvent(new Event('auth:logout'));
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;

import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

// In production (Vercel), VITE_API_BASE_URL points to the Railway backend.
// In Docker Compose, this is empty so Nginx proxies /api → backend container.
// In local dev without Docker, falls back to localhost:8080.
const getBaseURL = (): string => {
  let url = '';
  if (import.meta.env.VITE_API_BASE_URL) {
    url = import.meta.env.VITE_API_BASE_URL as string;
  } else if (import.meta.env.DEV) {
    url = 'http://localhost:8080/api';
  } else {
    url = '/api'; // Nginx proxy in Docker
  }

  // Normalize: if the url ends in /v1 or /v1/, strip it so it ends with /api
  if (url.endsWith('/v1')) {
    url = url.substring(0, url.length - 3);
  } else if (url.endsWith('/v1/')) {
    url = url.substring(0, url.length - 4);
  }
  return url;
};

export const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
});

// Request interceptor to inject JWT
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string | null) => void;
  reject: (reason: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor to handle 401 and auto-refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Avoid infinite loop if auth/refresh itself fails with 401
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== '/v1/auth/refresh' &&
      originalRequest.url !== '/v1/auth/login' &&
      originalRequest.url !== '/v1/auth/signup'
    ) {
      if (isRefreshing) {
        return new Promise<string | null>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await api.post('/v1/auth/refresh');
        const { accessToken, user } = response.data;
        
        useAuthStore.getState().setAuth(user, accessToken);
        processQueue(null, accessToken);
        
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().clearAuth();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

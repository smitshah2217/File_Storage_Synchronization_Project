import axios, { type InternalAxiosRequestConfig } from 'axios';
import { store } from '../store/store';
import { logout, updateToken } from '../store/authSlice';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';
const axiosInstance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

type RefreshResponse = { token: string; expiresIn: number };
type RetryableRequestConfig = InternalAxiosRequestConfig & { _authRetry?: boolean };

let refreshInFlight: Promise<string> | null = null;

const isAuthEndpoint = (url: string) => /\/auth\/(login|register|refresh|logout)(?:\?|$)/.test(url);

const tokenExpiresAt = (token: string): number | null => {
  try {
    const encoded = token.split('.')[1];
    if (!encoded) return null;
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const payload = JSON.parse(window.atob(padded)) as { exp?: unknown };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

const refreshAccessToken = (): Promise<string> => {
  if (refreshInFlight) return refreshInFlight;
  const currentToken = localStorage.getItem('token');
  if (!currentToken || currentToken === 'undefined') {
    store.dispatch(logout());
    return Promise.reject(new Error('No access token is available to refresh'));
  }

  refreshInFlight = axios.post<RefreshResponse>(`${baseURL}/auth/refresh`, {}, {
    headers: { Authorization: `Bearer ${currentToken}` },
  })
    .then(({ data }) => {
      localStorage.setItem('token', data.token);
      store.dispatch(updateToken(data.token));
      return data.token;
    })
    .catch((error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        store.dispatch(logout());
        if (window.location.pathname !== '/login') window.location.assign('/login');
      }
      throw error;
    })
    .finally(() => { refreshInFlight = null; });

  return refreshInFlight;
};

axiosInstance.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('token');
  const url = config.url || '';
  if (token && token !== 'undefined' && !/\/auth\/(login|register)$/.test(url)) {
    let activeToken = token;
    if (!isAuthEndpoint(url)) {
      const expiry = tokenExpiresAt(token);
      // Refresh just before expiry; the server intentionally accepts only a currently valid access token.
      if (expiry !== null && expiry <= Date.now() + 120_000) {
        activeToken = await refreshAccessToken();
      }
    }
    config.headers.Authorization = `Bearer ${activeToken}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);
    const config = error.config as RetryableRequestConfig | undefined;
    const url = config?.url || '';
    const hasToken = Boolean(config?.headers?.Authorization);
    if (error.response?.status === 401 && config && hasToken && !isAuthEndpoint(url) && !config._authRetry) {
      config._authRetry = true;
      try {
        const refreshedToken = await refreshAccessToken();
        config.headers.Authorization = `Bearer ${refreshedToken}`;
        return axiosInstance(config);
      } catch {
        return Promise.reject(error);
      }
    }
    if (error.response?.status === 401 && hasToken && !isAuthEndpoint(url)) {
      store.dispatch(logout());
      if (window.location.pathname !== '/login') window.location.assign('/login');
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;

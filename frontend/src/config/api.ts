import axios from 'axios';

const API_PREFIX = '/wsp-api/api';

const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

type StoreRef = {
  startLoading?: () => void;
  stopLoading?: () => void;
  logout?: () => void;
};

const storeRef: StoreRef = {};

export function registerUiStore(startLoading: () => void, stopLoading: () => void) {
  storeRef.startLoading = startLoading;
  storeRef.stopLoading = stopLoading;
}

export function registerAuthStore(logout: () => void) {
  storeRef.logout = logout;
}

// Request interceptor: force prefix URL + auth token + loading
api.interceptors.request.use((config) => {
  // Force prepend the API prefix to every request URL
  const url = config.url || '';
  if (!url.startsWith(API_PREFIX) && !url.startsWith('http')) {
    config.url = API_PREFIX + (url.startsWith('/') ? url : '/' + url);
  }
  // Remove baseURL to prevent double-prepending
  config.baseURL = '';

  // Auth token
  try {
    const raw = sessionStorage.getItem('auth-storage');
    if (raw) {
      const parsed = JSON.parse(raw);
      const token = parsed?.state?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch {
    // ignore
  }

  storeRef.startLoading?.();
  return config;
});

// Response interceptor: decrement loading + handle 401
api.interceptors.response.use(
  (response) => {
    storeRef.stopLoading?.();
    return response;
  },
  (error) => {
    storeRef.stopLoading?.();
    if (error.response?.status === 401) {
      storeRef.logout?.();
    }
    return Promise.reject(error);
  }
);

export default api;

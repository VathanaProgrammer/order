import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const isSafari = (): boolean => {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  return /^((?!chrome|android).)*safari/i.test(ua) || /iPad|iPhone|iPod/.test(ua);
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
});

let currentToken: string | null = null;

const updateToken = (token: string | null) => {
  currentToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }
};

// INITIALIZATION: Load for EVERYONE, not just Safari
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('auth_token');
  if (stored) {
    currentToken = stored;
  }
}

api.interceptors.request.use(
  (config) => {
    const safari = isSafari();
    // Use currentToken first, fallback to fresh localStorage read
    const token = currentToken || (typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null);

    if (token) {
      // ✅ FIX 1: ALWAYS set the Header. Never skip this.
      config.headers.set('Authorization', `Bearer ${token}`);

      // ✅ FIX 2: Only add query param as an ADDITIONAL backup for Safari
      if (safari && config.method?.toLowerCase() === 'get') {
        config.params = { ...config.params, token };
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    // Detect token in any response and sync it
    if (response.data?.token) {
      updateToken(response.data.token);
    }
    return response;
  },
  (error) => {
    // 🔐 FIX 3: Don't clear token if it's a network error (status undefined)
    // Only clear if the server explicitly says 401
    if (error.response?.status === 401 && !error.config?.url?.includes('login')) {
      console.warn('401 → clearing token');
      updateToken(null);
    }
    return Promise.reject(error);
  }
);

export default api;
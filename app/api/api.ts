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
    // 1. Double-check storage if the local variable is null
    if (!currentToken && typeof window !== 'undefined') {
      currentToken = localStorage.getItem('auth_token');
    }

    if (currentToken) {
      // 2. Standard Header (Primary)
      config.headers['Authorization'] = `Bearer ${currentToken}`;
      
      // 3. iOS Specific Fixes
      if (isSafari()) {
        config.params = { 
          ...config.params, 
          token: currentToken, // Fallback for PHP/Laravel
          _t: Date.now()       // Prevents Safari from serving a cached 401
        };
        
        // Ensure headers are actually assigned to the config object
        config.headers.set('Authorization', `Bearer ${currentToken}`);
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
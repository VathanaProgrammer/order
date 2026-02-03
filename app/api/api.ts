import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const isSafari = (): boolean => {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  return /^((?!chrome|android).)*safari/i.test(ua) || /iPad|iPhone|iPod/.test(ua);
};

export const clearApiState = () => {
  currentToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
    // Force clear the header immediately
    delete api.defaults.headers.common["Authorization"];
  }
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
    // Always pull fresh from storage to avoid "Variable Desync"
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : currentToken;

    if (token) {
      // Modern Axios way to set headers safely
      if (config.headers.set) {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      
      if (isSafari()) {
        config.params = { 
          ...config.params, 
          token: token, 
          _t: Date.now() 
        };
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    // Only save the token if we are on the login or register page
    // This prevents the "user" endpoint from accidentally re-saving a zombie token
    const isAuthPath = response.config.url?.includes('login') || response.config.url?.includes('register');
    
    if (isAuthPath && response.data?.token) {
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
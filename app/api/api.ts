import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://syspro.asia/api';
console.log('🌐 API Base URL:', API_BASE_URL);

// Safari detection
export const isSafari = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const ua = navigator.userAgent;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  return isSafari || isIOS;
};

// PHONE-BASED AUTH STORAGE KEYS
const STORAGE_KEYS = {
  PHONE: 'user_phone',
  USER_DATA: 'user_data_cache',
  LAST_LOGIN: 'last_login_timestamp'
};

// Save phone number
export const saveUserPhone = (phone: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.PHONE, phone);
  localStorage.setItem(STORAGE_KEYS.LAST_LOGIN, Date.now().toString());
  console.log('📱 Phone saved to localStorage:', phone);
};

// Get saved phone
export const getSavedPhone = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.PHONE);
};

// Save user data cache
export const saveUserDataCache = (userData: any) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
  console.log('💾 User data cached');
};

// Get cached user data
export const getCachedUserData = (): any => {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(STORAGE_KEYS.USER_DATA);
  return data ? JSON.parse(data) : null;
};

// Clear all auth data
export const clearAuthData = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.PHONE);
  localStorage.removeItem(STORAGE_KEYS.USER_DATA);
  localStorage.removeItem(STORAGE_KEYS.LAST_LOGIN);
  localStorage.removeItem('auth_token');
  console.log('🗑️ All auth data cleared');
};

// Token management
let authToken: string | null = null;
if (typeof window !== 'undefined') {
  authToken = localStorage.getItem('auth_token');
}

export const getAuthToken = () => authToken;
export const setAuthToken = (token: string) => {
  authToken = token;
  localStorage.setItem('auth_token', token);
  console.log('🔑 Token saved');
};

export const clearAuthToken = () => {
  authToken = null;
  localStorage.removeItem('auth_token');
  console.log('🔑 Token cleared');
};

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const safari = isSafari();
    
    console.log(`📤 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    console.log(`🌐 Browser: ${safari ? 'Safari' : 'Non-Safari'}`);
    
    if (safari) {
      // Safari: Use Authorization header if token exists
      if (authToken) {
        config.headers['Authorization'] = `Bearer ${authToken}`;
        console.log('🦁 Added Authorization header');
      }
      config.withCredentials = false;
    } else {
      // Non-Safari: Use cookies
      config.withCredentials = true;
      console.log('🌍 Using cookies');
    }
    
    // Add cache busting for GET requests
    if (config.method?.toLowerCase() === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now()
      };
    }
    
    return config;
  },
  (error) => {
    console.error('📤 Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.status} ${response.config.url}`);
    
    // Save token from login response
    if (response.config.url?.includes('login') && response.data?.token) {
      setAuthToken(response.data.token);
    }
    
    return response;
  },
  (error) => {
    console.error(`❌ ${error.response?.status || 'Error'}: ${error.config?.url}`, {
      message: error.response?.data?.message || error.message
    });
    return Promise.reject(error);
  }
);

// Create convenience methods
const apiRequest = {
  get: (url: string, config?: any) => api.get(url, config),
  post: (url: string, data?: any, config?: any) => api.post(url, data, config),
  put: (url: string, data?: any, config?: any) => api.put(url, data, config),
  delete: (url: string, config?: any) => api.delete(url, config),
};

// Export everything
export default api;
export { apiRequest };
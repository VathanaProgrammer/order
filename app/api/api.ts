import axios from "axios";

// SAFARI FIX: Use absolute URLs since frontend/backend are different domains
const getAPIBaseURL = () => {
  // Try to get from env first
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Default to your likely backend
  return 'https://syspro.asia';
};

const API_BASE_URL = getAPIBaseURL();
console.log('🌐 API Base URL:', API_BASE_URL);

// Safari detection
export const isSafari = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const ua = navigator.userAgent;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  return isSafari || isIOS;
};

console.log('🦁 Is Safari?', isSafari());

// Create axios instance with absolute URL
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

// Token management
let authToken: string | null = null;

// Initialize
if (typeof window !== 'undefined') {
  authToken = localStorage.getItem('auth_token');
  console.log('🔑 Initial token:', authToken ? 'Found' : 'None');
}

export const getAuthToken = () => authToken;

export const setAuthToken = (token: string) => {
  authToken = token;
  localStorage.setItem('auth_token', token);
  console.log('✅ Token saved');
};

export const clearAuthToken = () => {
  authToken = null;
  localStorage.removeItem('auth_token');
  console.log('✅ Token cleared');
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const safari = isSafari();
    
    console.log(`📤 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    
    // CRITICAL: For Safari, use Authorization header
    if (safari && authToken) {
      config.headers['Authorization'] = `Bearer ${authToken}`;
      console.log('🔑 Added Authorization header for Safari');
    }
    
    // CRITICAL: For non-Safari, use cookies (withCredentials)
    if (!safari) {
      config.withCredentials = true;
      console.log('🍪 Using cookies (withCredentials) for non-Safari');
    }
    
    return config;
  },
  (error) => {
    console.error('📤 Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - SIMPLE
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
    console.error(`❌ ${error.response?.status || 'Network'} Error:`, {
      url: error.config?.url,
      method: error.config?.method,
      message: error.response?.data?.message || error.message
    });
    return Promise.reject(error);
  }
);

export default api;
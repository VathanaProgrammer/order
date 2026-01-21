import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

console.log('🌐 API Base URL:', API_BASE_URL);

// Safari detection utility
export const isSafari = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const ua = navigator.userAgent;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  return isSafari || isIOS;
};

console.log('🦁 Is Safari?', isSafari());

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Safari token management
let safariToken: string | null = null;

// Initialize auth based on browser
const initializeAuth = () => {
  if (typeof window === 'undefined') return;
  
  console.log('🔄 Initializing auth...');
  
  if (isSafari()) {
    console.log('🦁 Safari detected - using token-based auth');
    safariToken = localStorage.getItem('auth_token');
    
    if (safariToken) {
      console.log('🔑 Token found in localStorage');
      api.defaults.headers.common['Authorization'] = `Bearer ${safariToken}`;
    } else {
      console.log('🔑 No token in localStorage');
    }
  } else {
    console.log('🌍 Non-Safari browser detected - using cookie-based auth');
    // Non-Safari: use cookies
    api.defaults.withCredentials = true;
  }
};

// Initialize on module load
initializeAuth();

// Add request interceptor with detailed logging
api.interceptors.request.use(
  (config) => {
    const safari = isSafari();
    
    console.log(`📤 [${config.method?.toUpperCase()}] ${config.baseURL}${config.url}`);
    console.log('🔧 Request config:', {
      isSafari: safari,
      hasToken: !!safariToken,
      withCredentials: config.withCredentials,
      headers: config.headers
    });
    
    if (safari && safariToken) {
      config.headers['Authorization'] = `Bearer ${safariToken}`;
    }
    
    // Ensure proper content type for POST requests
    if (config.method === 'post' || config.method === 'put') {
      if (!config.headers['Content-Type']) {
        config.headers['Content-Type'] = 'application/json';
      }
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
    console.log(`✅ [${response.status}] ${response.config.url}`);
    console.log('📥 Response data:', response.data);
    
    const safari = isSafari();
    const url = response.config.url || '';
    
    // Store new token from login response
    if (safari && url.includes('login') && response.data?.token) {
      const newToken = response.data.token;
      safariToken = newToken;
      localStorage.setItem('auth_token', newToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      console.log('🔑 New token saved from login');
    }
    
    return response;
  },
  async (error) => {
    console.error('🔴 Response error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    
    return Promise.reject(error);
  }
);

export default api;
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

api.interceptors.request.use(
  (config) => {
    const safari = isSafari();
    const token = safariToken || localStorage.getItem('auth_token');

    console.log(`📤 [${config.method?.toUpperCase()}] ${config.baseURL}${config.url}`);

    if (token) {
      if (safari) {
        if (config.method === 'get') {
          // Workaround for Axios + Safari/iOS bug: Authorization header often dropped on GET
          config.params = config.params || {};
          config.params.token = token;
          console.log('Safari GET workaround → using ?token=... instead of header');
        } else {
          // POST/PUT/DELETE → still use Bearer header
          config.headers = config.headers || {};
          config.headers['Authorization'] = `Bearer ${token}`;
          console.log('Safari non-GET → using Authorization: Bearer');
        }
      } else {
        // Non-Safari → always use Bearer header
        config.headers = config.headers || {};
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    } else {
      console.log('No token available for this request');
    }

    console.log('🔧 Final request config:', {
      isSafari: safari,
      method: config.method,
      usingQueryToken: !!config.params?.token,
      authHeader: config.headers?.['Authorization'],
      withCredentials: config.withCredentials,
    });

    // Content-Type for POST/PUT
    if (config.method === 'post' || config.method === 'put') {
      if (!config.headers['Content-Type']) {
        config.headers['Content-Type'] = 'application/json';
      }
    }

    return config;
  },
  (error) => {
    console.error('📤 Request interceptor error:', error);
    return Promise.reject(error);
  }
);
export default api;
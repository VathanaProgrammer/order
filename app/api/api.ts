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

// Add request interceptor with detailed logging + Safari GET workaround
api.interceptors.request.use(
  (config) => {
    const safari = isSafari();
    const token = safariToken || localStorage.getItem('auth_token'); // fallback to localStorage

    console.log(`📤 [${config.method?.toUpperCase()}] ${config.baseURL}${config.url}`);

    if (token) {
      if (safari && config.method?.toLowerCase() === 'get') {
        // Critical workaround: Safari/iOS often drops Authorization header on GET
        // Send token as query param instead → JWTAuth supports this natively
        config.params = config.params || {};
        config.params.token = token;
        console.log('🦁 Safari GET workaround: added ?token=... (header skipped)');
      } else {
        // For non-Safari or non-GET requests → use standard Bearer header
        config.headers = config.headers || {};
        config.headers['Authorization'] = `Bearer ${token}`;
        console.log('Using Authorization: Bearer header');
      }
    } else {
      console.log('⚠️ No auth token found for this request');
    }

    // Detailed debug
    console.log('🔧 Request details:', {
      isSafari: safari,
      hasToken: !!token,
      method: config.method,
      usingQueryToken: !!config.params?.token,
      authHeaderSent: config.headers?.['Authorization'],
      params: config.params,
      withCredentials: config.withCredentials,
    });

    // Content-Type fix for POST/PUT
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
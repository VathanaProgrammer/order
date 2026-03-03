import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

console.log('🌐 API Base URL:', API_BASE_URL);

export const isSafari = (): boolean => {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  return /^((?!chrome|android).)*safari/i.test(ua) || /iPad|iPhone|iPod/.test(ua);
};

console.log('🦁 Is Safari?', isSafari());

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true, // Safe to always enable (non-Safari uses cookies, Safari ignores)
});

// Remove any default Authorization (we set it dynamically)
delete api.defaults.headers.common['Authorization'];

// Unified token management
let currentToken: string | null = null;

const updateToken = (token: string | null) => {
  currentToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
};

// Load token on module load (Safari only)
if (typeof window !== 'undefined') {
  console.log('🔄 Initializing auth...');
  const stored = localStorage.getItem('auth_token');
  if (stored && isSafari()) {
    console.log('🔑 Loaded existing token from localStorage');
    updateToken(stored);
  } else if (!isSafari()) {
    console.log('🍪 Non-Safari: relying on cookies');
  }
}

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const safari = isSafari();
    
    // Get token from multiple sources
    let token = null;
    
    // Priority 1: Check axios defaults (set after login)
    if (api.defaults.headers.common['Authorization']) {
      const authHeader = api.defaults.headers.common['Authorization'] as string;
      token = authHeader.replace('Bearer ', '');
      console.log('🔑 Using token from axios defaults');
    }
    
    // Priority 2: Check localStorage (for Safari)
    if (!token && safari) {
      token = localStorage.getItem('auth_token');
      if (token) {
        console.log('🔑 Using token from localStorage');
      }
    }
    
    console.log(`📤 [${config.method?.toUpperCase()}] ${config.baseURL}${config.url || ''}`);
    console.log('🔧 Token present:', !!token);

    if (token) {
      // YOUR MIDDLEWARE EXPECTS AUTHORIZATION HEADER FIRST
      // This is the most reliable method across all browsers
      config.headers.set('Authorization', `Bearer ${token}`);
      
      // For Safari GET requests, also add as query parameter as fallback
      // Your middleware checks for '_token' query param
      if (safari && config.method?.toLowerCase() === 'get') {
        config.params = { 
          ...config.params, 
          _token: token  // Using '_token' as your middleware expects
        };
        console.log('🦁 Safari GET workaround: added ?_token=...');
      }
      
      // Also set as cookie? No, cookies are handled by the browser
      // But we can ensure withCredentials is true
      config.withCredentials = true;
    } else {
      console.log('⚠️ No auth token found for this request');
    }

    // Debug
    console.log('🔧 Request details:', {
      isSafari: safari,
      hasToken: !!token,
      method: config.method,
      authHeaderSent: config.headers.get('Authorization'),
      queryTokenSent: config.params?._token ? 'yes' : 'no',
      withCredentials: config.withCredentials,
      url: config.url
    });

    return config;
  },
  (error) => {
    console.error('📤 Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    const url = response.config.url || '';

    // Save new token from login/refresh responses (Safari)
    if (isSafari() && response.data?.token) {
      console.log('🔑 Token detected in response → saving (regardless of URL)');
      updateToken(response.data.token);
    }

    console.log(`✅ [${response.status}] ${url}`);
    return response;
  },
  (error) => {
    console.error('🔴 Response error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
    });

    // Optional: handle 401 globally
    if (error.response?.status === 401 && !error.config?.url?.includes('login')) {
      console.warn('401 → clearing token');
      updateToken(null);
      // Add redirect here if you want: router.push('/sign-in')
    }

    return Promise.reject(error);
  }
);

export default api;
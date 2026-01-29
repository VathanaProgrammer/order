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
    const token = currentToken || localStorage.getItem('auth_token');

    console.log(`📤 [${config.method?.toUpperCase()}] ${config.baseURL}${config.url || ''}`);

    if (token) {
      if (safari && config.method?.toLowerCase() === 'get') {
        // Safari/iOS GET workaround for Axios header-dropping bug
        config.params = { ...config.params, token };
        console.log('🦁 Safari GET workaround: added ?token=...');
      } else {
        // Use .set() because config.headers is AxiosHeaders
        config.headers.set('Authorization', `Bearer ${token}`);
        console.log('→ Using Bearer header');
      }
    } else {
      console.log('⚠️ No auth token found for this request');
    }

    // Debug
    console.log('🔧 Request details:', {
      isSafari: safari,
      hasToken: !!token,
      method: config.method,
      usingQueryToken: !!config.params?.token,
      authHeaderSent: config.headers.get('Authorization'),
      params: config.params,
      withCredentials: config.withCredentials,
    });

    // POST/PUT content type
    if (config.method === 'post' || config.method === 'put') {
      if (!config.headers.get('Content-Type')) {
        config.headers.set('Content-Type', 'application/json');
      }
    }

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
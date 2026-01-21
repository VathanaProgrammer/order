import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://your-api-domain.com';

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

// SIMPLE axios instance - NO interceptors
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Token management
let authToken: string | null = null;

// Initialize on client side only
if (typeof window !== 'undefined') {
  authToken = localStorage.getItem('auth_token');
  console.log('🔑 Initial auth token:', authToken ? 'Found' : 'None');
}

// Helper functions
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

// Create a request with proper auth headers
export const createRequest = (config: any) => {
  const isSafariBrowser = isSafari();
  const finalConfig = { ...config };
  
  if (isSafariBrowser) {
    // Safari: Use Authorization header
    if (authToken) {
      finalConfig.headers = {
        ...finalConfig.headers,
        'Authorization': `Bearer ${authToken}`
      };
    }
    finalConfig.withCredentials = false;
  } else {
    // Non-Safari: Use cookies
    finalConfig.withCredentials = true;
  }
  
  // Add cache busting for GET requests
  if (finalConfig.method?.toLowerCase() === 'get' && finalConfig.params) {
    finalConfig.params._t = Date.now();
  }
  
  return api(finalConfig);
};

// Individual request methods with proper auth
export const apiGet = (url: string, config = {}) => 
  createRequest({ method: 'get', url, ...config });

export const apiPost = (url: string, data = {}, config = {}) => 
  createRequest({ method: 'post', url, data, ...config });

export const apiPut = (url: string, data = {}, config = {}) => 
  createRequest({ method: 'put', url, data, ...config });

export const apiDelete = (url: string, config = {}) => 
  createRequest({ method: 'delete', url, ...config });

// Manual token refresh function (call this explicitly, don't auto-refresh)
export const refreshToken = async () => {
  const isSafariBrowser = isSafari();
  
  if (isSafariBrowser) {
    // Safari: Refresh using Authorization header
    const response = await api.post(`${API_BASE_URL}/auth/refresh`, {}, {
      headers: authToken ? {
        'Authorization': `Bearer ${authToken}`
      } : {}
    });
    
    if (response.data.token) {
      setAuthToken(response.data.token);
      return response.data.token;
    }
  } else {
    // Non-Safari: Refresh using cookies
    await api.post(`${API_BASE_URL}/auth/refresh`, {}, {
      withCredentials: true
    });
    return null;
  }
  
  throw new Error('Token refresh failed');
};

// Export the base api for compatibility
export default api;
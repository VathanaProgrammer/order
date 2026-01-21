import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Safari detection utility
export const isSafari = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const ua = navigator.userAgent;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  return isSafari || isIOS;
};

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Safari token management
let safariToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

// Initialize token from localStorage ONLY if Safari
if (typeof window !== 'undefined' && isSafari()) {
  safariToken = localStorage.getItem('auth_token');
  
  if (safariToken) {
    api.defaults.headers.common['Authorization'] = `Bearer ${safariToken}`;
  }
} else {
  // Non-Safari: use cookies
  api.defaults.withCredentials = true;
}

// Add request interceptor
api.interceptors.request.use(
  (config) => {
    const safari = isSafari();
    
    if (safari && safariToken) {
      config.headers['Authorization'] = `Bearer ${safariToken}`;
    }
    
    // Add cache busting only for GET requests (except auth endpoints)
    if (config.method === 'get' && 
        !config.url?.includes('/auth/') && 
        !config.url?.includes('/login') &&
        !config.url?.includes('/logout')) {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - SIMPLIFIED VERSION
api.interceptors.response.use(
  (response) => {
    const safari = isSafari();
    
    // For Safari: Update token if returned (only from login/refresh)
    if (safari && response.data?.token) {
      const url = response.config.url || '';
      
      // Only update token from specific endpoints
      if (url.includes('/login') || url.includes('/auth/refresh')) {
        const newToken = response.data.token;
        safariToken = newToken;
        localStorage.setItem('auth_token', newToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        
        // Remove token from response to prevent infinite loops
        delete response.data.token;
      }
    }
    
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Only handle 401 errors
    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }
    
    // Don't retry if it's a refresh request
    if (originalRequest.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }
    
    const safari = isSafari();
    
    if (safari) {
      // If we're already refreshing, wait for that promise
      if (refreshPromise) {
        try {
          await refreshPromise;
          // Retry the original request with new token
          return api(originalRequest);
        } catch {
          return Promise.reject(error);
        }
      }
      
      // Start a refresh
      refreshPromise = (async () => {
        try {
          const refreshResponse = await axios.post(
            `${API_BASE_URL}/auth/refresh`,
            {},
            {
              headers: safariToken ? {
                'Authorization': `Bearer ${safariToken}`
              } : {}
            }
          );
          
          const newToken = refreshResponse.data.token;
          safariToken = newToken;
          localStorage.setItem('auth_token', newToken);
          api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
          return newToken;
        } catch (refreshError) {
          // Clear auth state on refresh failure
          localStorage.removeItem('auth_token');
          safariToken = null;
          delete api.defaults.headers.common['Authorization'];
          throw refreshError;
        } finally {
          refreshPromise = null;
        }
      })();
      
      try {
        await refreshPromise;
        // Retry the original request
        return api(originalRequest);
      } catch {
        return Promise.reject(error);
      }
      
    } else {
      // Non-Safari: Simple retry for cookies
      try {
        await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        return api(originalRequest);
      } catch {
        return Promise.reject(error);
      }
    }
  }
);

export default api;
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

// Check if we're in iOS Safari Private Browsing
export const isPrivateBrowsing = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  
  return new Promise((resolve) => {
    try {
      if (!window.indexedDB) {
        resolve(true);
        return;
      }
      
      const db = window.indexedDB.open("test");
      db.onerror = () => resolve(true);
      db.onsuccess = () => {
        db.result.close();
        resolve(false);
      };
    } catch (e) {
      resolve(true);
    }
  });
};

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Safari token management
let safariToken: string | null = null;

// Initialize token from localStorage
if (typeof window !== 'undefined') {
  safariToken = localStorage.getItem('auth_token');
  
  // Set initial Authorization header for Safari
  if (isSafari() && safariToken) {
    api.defaults.headers.common['Authorization'] = `Bearer ${safariToken}`;
  } else {
    // Non-Safari: use cookies
    api.defaults.withCredentials = true;
  }
}

// Add request interceptor
api.interceptors.request.use(async (config) => {
  const safari = isSafari();
  
  if (safari) {
    // Safari: Add Authorization header
    if (safariToken) {
      config.headers['Authorization'] = `Bearer ${safariToken}`;
    }
    
    // Add Safari-specific headers
    config.headers['X-Requested-With'] = 'XMLHttpRequest';
    
    // Cache busting for Safari
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now(),
        _rand: Math.random().toString(36).substring(2, 9)
      };
    }
  } else {
    // Non-Safari: Use cookies
    config.withCredentials = true;
  }
  
  // Common cache control headers
  config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
  config.headers['Pragma'] = 'no-cache';
  
  return config;
});

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => {
    const safari = isSafari();
    
    // Check if response has a new token (for Safari)
    if (safari && response.data?.token) {
      const newToken = response.data.token;
      safariToken = newToken;
      localStorage.setItem('auth_token', newToken);
      
      // Update axios default header
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      // Remove token from response data to avoid confusion
      delete response.data.token;
    }
    
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 errors for token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const safari = isSafari();
      
      if (safari) {
        // Safari: Refresh token
        try {
          const refreshResponse = await axios.post(
            `${API_BASE_URL}/auth/refresh`,
            {},
            {
              headers: {
                'Authorization': `Bearer ${safariToken}`
              }
            }
          );
          
          const newToken = refreshResponse.data.token;
          safariToken = newToken;
          localStorage.setItem('auth_token', newToken);
          
          // Update header and retry
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
          
          return api(originalRequest);
        } catch (refreshError) {
          // Clear token and redirect to login
          localStorage.removeItem('auth_token');
          safariToken = null;
          delete api.defaults.headers.common['Authorization'];
          
          // Redirect to login
          if (typeof window !== 'undefined') {
            window.location.href = '/sign-in?reason=session_expired';
          }
          
          return Promise.reject(refreshError);
        }
      } else {
        // Non-Safari: Try refresh with cookies
        try {
          await axios.post(
            `${API_BASE_URL}/auth/refresh`,
            {},
            { withCredentials: true }
          );
          
          return api(originalRequest);
        } catch (refreshError) {
          // Redirect to login
          if (typeof window !== 'undefined') {
            window.location.href = '/sign-in?reason=session_expired';
          }
          return Promise.reject(refreshError);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
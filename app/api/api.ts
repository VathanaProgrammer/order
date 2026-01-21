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

// Initialize auth based on browser
const initializeAuth = () => {
  if (typeof window === 'undefined') return;
  
  console.log('🔄 Initializing auth...');
  
  if (isSafari()) {
    console.log('🦁 Safari detected');
    safariToken = localStorage.getItem('auth_token');
    
    if (safariToken) {
      console.log('🔑 Token found in localStorage');
      api.defaults.headers.common['Authorization'] = `Bearer ${safariToken}`;
    } else {
      console.log('🔑 No token in localStorage');
    }
    
    // Non-Safari browsers use cookies
    api.defaults.withCredentials = false;
  } else {
    console.log('🌍 Non-Safari browser detected');
    // Non-Safari: use cookies
    api.defaults.withCredentials = true;
    delete api.defaults.headers.common['Authorization'];
  }
};

// Initialize on module load
initializeAuth();

// Also re-initialize when window loads (for page refreshes)
if (typeof window !== 'undefined') {
  window.addEventListener('load', initializeAuth);
}

// Add request interceptor
api.interceptors.request.use(
  (config) => {
    // Don't modify if it's a login or logout request
    if (config.url?.includes('/login') || config.url?.includes('/logout')) {
      return config;
    }
    
    const safari = isSafari();
    
    if (safari && safariToken) {
      config.headers['Authorization'] = `Bearer ${safariToken}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle token updates
api.interceptors.response.use(
  (response) => {
    const safari = isSafari();
    const url = response.config.url || '';
    
    // Store new token from login response
    if (safari && url.includes('/login') && response.data?.token) {
      const newToken = response.data.token;
      safariToken = newToken;
      localStorage.setItem('auth_token', newToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      console.log('🔑 New token saved from login');
    }
    
    // Store new token from refresh response
    if (safari && url.includes('/auth/refresh') && response.data?.token) {
      const newToken = response.data.token;
      safariToken = newToken;
      localStorage.setItem('auth_token', newToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      console.log('🔑 Token refreshed');
    }
    
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 errors
    if (error.response?.status === 401) {
      const safari = isSafari();
      const url = originalRequest.url || '';
      
      // Don't retry login/logout/refresh endpoints
      if (url.includes('/login') || 
          url.includes('/logout') || 
          url.includes('/auth/refresh')) {
        return Promise.reject(error);
      }
      
      if (safari) {
        // Safari: Try to refresh token
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
          
          // Retry original request
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          return api(originalRequest);
          
        } catch (refreshError) {
          // Clear token and let component handle redirect
          localStorage.removeItem('auth_token');
          safariToken = null;
          delete api.defaults.headers.common['Authorization'];
          return Promise.reject(refreshError);
        }
      } else {
        // Non-Safari: Try cookie refresh
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
    
    return Promise.reject(error);
  }
);

export default api;
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://your-api-domain.com';

console.log('🌐 API Base URL:', API_BASE_URL);

// Safari detection utility
export const isSafari = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const ua = navigator.userAgent;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  return isSafari || isIOS;
};

console.log('🦁 Browser is Safari/iOS:', isSafari());

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Token management for Safari
let authToken: string | null = null;

// Initialize token from localStorage
if (typeof window !== 'undefined') {
  authToken = localStorage.getItem('auth_token');
  console.log('🔑 Initial token from localStorage:', authToken ? 'Found' : 'Not found');
  
  if (authToken) {
    api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    console.log('✅ Authorization header set');
  }
}

// Store token function (call this after login)
export const setAuthToken = (token: string) => {
  authToken = token;
  localStorage.setItem('auth_token', token);
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  console.log('🔑 Token saved and header updated');
};

// Clear token function (call this after logout)
export const clearAuthToken = () => {
  authToken = null;
  localStorage.removeItem('auth_token');
  delete api.defaults.headers.common['Authorization'];
  console.log('🔑 Token cleared');
};

// Get current token
export const getAuthToken = () => authToken;

// Add request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`📤 Request: ${config.method?.toUpperCase()} ${config.url}`);
    
    // Always add the current token if we have one
    if (authToken) {
      config.headers['Authorization'] = `Bearer ${authToken}`;
      console.log('🔑 Adding Authorization header to request');
    }
    
    // Don't add cache busting to avoid infinite loops
    if (config.method === 'get' && config.params) {
      config.params._t = Date.now();
    }
    
    return config;
  },
  (error) => {
    console.error('📤 Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - SIMPLIFIED
api.interceptors.response.use(
  (response) => {
    console.log(`✅ Response [${response.status}]: ${response.config.url}`);
    
    // Check for new token in login response
    if (response.config.url?.includes('login') && response.data?.token) {
      setAuthToken(response.data.token);
    }
    
    // Check for new token in refresh response  
    if (response.config.url?.includes('refresh') && response.data?.token) {
      setAuthToken(response.data.token);
    }
    
    // Check for new token in user response (if backend returns it)
    if (response.config.url?.includes('user') && response.data?.token) {
      setAuthToken(response.data.token);
    }
    
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    console.error('🔴 Response error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.message
    });
    
    // Handle 401 Unauthorized errors
    if (error.response?.status === 401) {
      console.log('🔄 Handling 401 error');
      
      // If it's a login request, don't try to refresh
      if (originalRequest.url?.includes('login') || 
          originalRequest.url?.includes('logout')) {
        return Promise.reject(error);
      }
      
      // Try to refresh the token
      try {
        console.log('🔄 Attempting token refresh...');
        
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          {
            headers: authToken ? {
              'Authorization': `Bearer ${authToken}`
            } : {}
          }
        );
        
        if (refreshResponse.data.token) {
          setAuthToken(refreshResponse.data.token);
          console.log('✅ Token refreshed successfully');
          
          // Retry the original request with new token
          originalRequest.headers['Authorization'] = `Bearer ${authToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('🔴 Token refresh failed:', refreshError);
        clearAuthToken();
        
        // Redirect to login page
        if (typeof window !== 'undefined') {
          window.location.href = '/sign-in?reason=session_expired';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
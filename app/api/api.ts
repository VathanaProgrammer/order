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

// Create axios instance - NO INTERCEPTORS
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Token management
let authToken: string | null = null;

// Initialize token
if (typeof window !== 'undefined') {
  authToken = localStorage.getItem('auth_token');
  console.log('🔑 Initial token:', authToken ? 'Yes' : 'No');
  
  if (authToken && isSafari()) {
    api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
  }
}

// Helper functions
export const setAuthToken = (token: string) => {
  authToken = token;
  localStorage.setItem('auth_token', token);
  
  if (isSafari()) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
  
  console.log('✅ Token saved');
};

export const clearAuthToken = () => {
  authToken = null;
  localStorage.removeItem('auth_token');
  
  if (isSafari()) {
    delete api.defaults.headers.common['Authorization'];
  }
  
  console.log('✅ Token cleared');
};

export const getAuthToken = () => authToken;

// Simple request functions
const makeRequest = async (method: string, url: string, data?: any) => {
  const config: any = {
    method,
    url,
  };
  
  if (data) {
    config.data = data;
  }
  
  // For Safari, use token; for others, use cookies
  if (isSafari()) {
    if (authToken) {
      config.headers = {
        'Authorization': `Bearer ${authToken}`
      };
    }
  } else {
    config.withCredentials = true;
  }
  
  // Add cache busting for GET requests
  if (method.toLowerCase() === 'get') {
    config.params = {
      _t: Date.now()
    };
  }
  
  console.log(`📤 ${method.toUpperCase()} ${url}`);
  
  try {
    const response = await api(config);
    console.log(`✅ ${method.toUpperCase()} ${url} succeeded`);
    return response;
  } catch (error: any) {
    console.error(`❌ ${method.toUpperCase()} ${url} failed:`, error.message);
    throw error;
  }
};

// Export simple methods
export const apiGet = (url: string) => makeRequest('get', url);
export const apiPost = (url: string, data?: any) => makeRequest('post', url, data);

export default api;
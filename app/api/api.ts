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
  withCredentials: true,
});

// Request interceptor - No token management needed
api.interceptors.request.use(
  (config) => {
    console.log(`📤 [${config.method?.toUpperCase()}] ${config.baseURL}${config.url || ''}`);
    
    // Add phone from localStorage for certain endpoints
    if (config.url?.includes('/user/phone')) {
      // If phone not in query params, get from localStorage
      if (!config.params?.phone) {
        const storedPhone = localStorage.getItem('user_phone');
        if (storedPhone) {
          config.params = { ...config.params, phone: storedPhone };
          console.log('📱 Added stored phone to request');
        }
      }
    }
    
    // Set content type for POST/PUT
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
    
    return Promise.reject(error);
  }
);

export default api;
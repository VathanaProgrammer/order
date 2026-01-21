// api.ts - UPDATED VERSION
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL; 

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Add request interceptor for cache busting
api.interceptors.request.use((config) => {
  // Add timestamp to all GET requests to prevent caching
  if (config.method === 'get') {
    // Add cache busting parameter
    config.params = {
      ...config.params,
      _t: Date.now(), // Always changing
      _rand: Math.random().toString(36).substring(2, 9) // Random string
    };
    
    // Add cache control headers
    config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    config.headers['Pragma'] = 'no-cache';
    config.headers['Expires'] = '0';
  }
  
  return config;
});

export default api;
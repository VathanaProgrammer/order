import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true, // This allows the browser to send/receive cookies
});

// Request Logger (Helpful for debugging)
api.interceptors.request.use((config) => {
  console.log(`📤 [${config.method?.toUpperCase()}] Sending to ${config.url}`);
  return config;
});

// Response Error Handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("🔐 401 Unauthorized - Cookie may be missing or expired");
    }
    return Promise.reject(error);
  }
);

export default api;
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // List of public auth endpoints that should NOT trigger a refresh
    const skipRefreshPaths = ['/auth/login', '/auth/register', '/auth/verify-otp', '/auth/forgot-password', '/auth/reset-password', '/auth/refresh'];
    const isSkipPath = skipRefreshPaths.some(path => originalRequest.url?.includes(path));

    // If error is 401 and not already retried and not a public auth path
    if (error.response?.status === 401 && !originalRequest._retry && !isSkipPath) {
      originalRequest._retry = true;
      
      try {
        const { data } = await axios.post('/api/auth/refresh');
        const newToken = data.accessToken;
        
        useAuthStore.getState().setAuth(useAuthStore.getState().user!, newToken);
        
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        // Return a cleaner error if it's a session check
        return Promise.reject(new Error('Session expired. Please login again.'));
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;

import axios from 'axios';
import useAuthStore from '../store/authStore';
import { toast } from 'sonner';

/**
 * API Client with Axios
 * Handles bearer token authentication
 * Includes offline detection and error handling
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.4:8001/api/v1';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // Increased to 60 seconds
  // Don't set default headers - let interceptor handle it based on request type
  // Retry configuration
  retry: 2,
  retryDelay: 1000,
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor - Add bearer token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Set appropriate headers based on request data type
    if (config.data instanceof FormData) {
      console.log('🎯 FormData detected - letting Axios set multipart headers');
      // For FormData, Axios will automatically set Content-Type with boundary
      // Just ensure we accept JSON responses
      config.headers['Accept'] = 'application/json';
    } else {
      console.log('📝 Regular request - setting JSON headers');
      // For regular requests, set JSON headers
      config.headers['Content-Type'] = 'application/json';
      config.headers['Accept'] = 'application/json';
    }
    
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const config = error.config;
    
    // Handle network errors (offline or server not reachable)
    if (!error.response) {
      // Retry logic for network errors
      if (config && config.retry && config.__retryCount < config.retry) {
        config.__retryCount = config.__retryCount || 0;
        config.__retryCount += 1;
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, config.retryDelay || 1000));
        
        // Retry the request
        return apiClient(config);
      }
      
      // Show error after retries exhausted
      if (!navigator.onLine) {
        toast.error('You are offline. Please check your internet connection.');
      } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        toast.error('Request timeout. Please try again.');
      } else {
        toast.error('Cannot connect to server. Please check if the server is running.');
      }
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized - Token expired or invalid
    if (error.response?.status === 401) {
      // Logout user and redirect to login
      useAuthStore.getState().logout();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
        toast.error('Session expired. Please login again.');
      }
      return Promise.reject(error);
    }

    // Handle other errors
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || 'An error occurred';

      switch (status) {
        case 400:
          break;
        case 403:
          toast.error('You do not have permission to perform this action');
          break;
        case 404:
          toast.error('Resource not found');
          break;
        case 500:
          toast.error('Server error. Please try again later.');
          break;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

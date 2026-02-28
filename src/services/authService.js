import apiClient from './apiClient';
import useAuthStore from '../store/authStore';

/**
 * Authentication Service
 * Handles all authentication-related API calls
 */

const authService = {
  /**
   * Login user with email and password
   * @param {Object} credentials - User credentials
   * @param {string} credentials.email - User email
   * @param {string} credentials.password - User password
   * @returns {Promise} API response with user data
   */
  async login(credentials) {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      const { user } = response.data;
      
      // Extract token from Authorization header
      // const authHeader = response.headers['authorization'];
      // const accessToken = authHeader?.replace('Bearer ', '');

      const accessToken = response.data.access_token; // Assuming token is returned in response body
      if (!accessToken) {
        throw new Error('No token received from server');
      }

      // Store authentication data (no refresh token in this API)
      useAuthStore.getState().setAuth(user, accessToken, null);

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Logout user and clear authentication data
   * @returns {Promise} API response
   */
  async logout() {
    try {
      const response = await apiClient.post('/auth/logout');
      
      // Clear local auth state
      useAuthStore.getState().logout();
      
      return response.data;
    } catch (error) {
      // Even if API call fails, clear local state
      useAuthStore.getState().logout();
      throw error;
    }
  },

  /**
   * Get current user profile
   * @returns {Promise} API response with user data
   */
  async getCurrentUserProfile() {
    try {
      const response = await apiClient.get('/auth/me');
      
      // Update user data in store
      useAuthStore.getState().setUser(response.data);
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Send forgot password request (placeholder - not yet in API)
   * @param {string} email - User email address
   * @returns {Promise} API response
   */
  async forgotPassword(email) {
    try {
      // TODO: Update endpoint when forgot password API is implemented
      const response = await apiClient.post('/auth/forgot-password', {
        email,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Reset password using token (placeholder - not yet in API)
   * @param {Object} data - Reset password data
   * @param {string} data.token - Password reset token
   * @param {string} data.password - New password
   * @returns {Promise} API response
   */
  async resetPassword(data) {
    try {
      // TODO: Update endpoint when reset password API is implemented
      const response = await apiClient.post('/auth/reset-password', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Verify if user is authenticated
   * @returns {boolean} Authentication status
   */
  isAuthenticated() {
    return useAuthStore.getState().isAuthenticated;
  },

  /**
   * Get current user data
   * @returns {Object|null} User object or null
   */
  getCurrentUser() {
    return useAuthStore.getState().user;
  },

  /**
   * Get user role
   * @returns {string|null} User role or null
   */
  getUserRole() {
    return useAuthStore.getState().getUserRole();
  },

  /**
   * Check if user has specific role(s)
   * @param {string|Array<string>} roles - Role or array of roles to check
   * @returns {boolean} True if user has the role
   */
  hasRole(roles) {
    return useAuthStore.getState().hasRole(roles);
  },
};

export default authService;

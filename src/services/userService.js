import apiClient from './apiClient';

/**
 * User Service
 * Handles all user management API calls
 */

const userService = {
  /**
   * Get all users
   * @returns {Promise} API response with users list
   */
  async getAllUsers() {
    try {
      const response = await apiClient.get('/users');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get user by ID
   * @param {number} id - User ID
   * @returns {Promise} API response with user data
   */
  async getUserById(id) {
    try {
      const response = await apiClient.get(`/users/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create a new user (Admin only)
   * @param {Object|FormData} userData - User data (can be FormData for file uploads)
   * @param {string} userData.name - User name
   * @param {string} userData.email - User email
   * @param {string} userData.password - User password
   * @param {string} userData.password_confirmation - Password confirmation
   * @param {string} userData.role - User role (admin, agent, sales_executive, accountant)
   * @param {File} [userData.avatar] - Avatar image file
   * @returns {Promise} API response with created user
   */
  async createUser(userData) {
    try {
      const config = userData instanceof FormData ? {
        headers: { 'Content-Type': 'multipart/form-data' }
      } : {};
      const response = await apiClient.post('/users', userData, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update user
   * @param {number} id - User ID
   * @param {Object|FormData} userData - User data to update (can be FormData for file uploads)
   * @returns {Promise} API response with updated user
   */
  async updateUser(id, userData) {
    try {
      const config = userData instanceof FormData ? {
        headers: { 'Content-Type': 'multipart/form-data' }
      } : {};
      const response = await apiClient.put(`/users/${id}`, userData, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete user (Admin only)
   * @param {number} id - User ID
   * @returns {Promise} API response
   */
  async deleteUser(id) {
    try {
      const response = await apiClient.delete(`/users/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Lock user account (Admin only)
   * @param {number} id - User ID
   * @returns {Promise} API response
   */
  async lockUser(id) {
    try {
      const response = await apiClient.post(`/users/${id}/lock`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Unlock user account (Admin only)
   * @param {number} id - User ID
   * @returns {Promise} API response
   */
  async unlockUser(id) {
    try {
      const response = await apiClient.post(`/users/${id}/unlock`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update user role (Admin only)
   * @param {number} id - User ID
   * @param {string} role - New role (admin, agent, sales_executive, accountant)
   * @returns {Promise} API response
   */
  async updateUserRole(id, role) {
    try {
      const response = await apiClient.put(`/users/${id}/role`, { role });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Change user password (Admin only)
   * @param {number} id - User ID
   * @param {string} password - New password
   * @param {string} password_confirmation - Password confirmation
   * @returns {Promise} API response
   */
  async changePassword(id, password, password_confirmation) {
    try {
      const response = await apiClient.put(`/users/${id}`, { 
        password, 
        password_confirmation 
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default userService;

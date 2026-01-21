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
   * @param {Object} userData - User data
   * @param {string} userData.name - User name
   * @param {string} userData.email - User email
   * @param {string} userData.password - User password
   * @param {string} userData.password_confirmation - Password confirmation
   * @param {string} userData.role - User role (admin, agent, sales_executive, accountant)
   * @returns {Promise} API response with created user
   */
  async createUser(userData) {
    try {
      const response = await apiClient.post('/users', userData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update user
   * @param {number} id - User ID
   * @param {Object} userData - User data to update
   * @returns {Promise} API response with updated user
   */
  async updateUser(id, userData) {
    try {
      const response = await apiClient.put(`/users/${id}`, userData);
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
};

export default userService;

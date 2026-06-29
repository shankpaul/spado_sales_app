import apiClient from './apiClient';

/**
 * Addon Service
 * Handles all addon management API calls
 */
const addonService = {
  /**
   * Get all addons with optional filters
   * @param {Object} [filters] - Query filters
   * @param {boolean} [filters.active] - Filter by active status
   * @param {number} [filters.page] - Page number
   * @param {number} [filters.per_page] - Items per page
   * @returns {Promise} API response
   */
  async getAddons(filters = {}) {
    try {
      const response = await apiClient.get('/addons', { params: filters });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get addon by ID
   * @param {number} id - Addon ID
   * @returns {Promise} API response
   */
  async getAddonById(id) {
    try {
      const response = await apiClient.get(`/addons/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create a new addon (Admin only)
   * @param {Object} addonData - Addon details
   * @returns {Promise} API response
   */
  async createAddon(addonData) {
    try {
      const response = await apiClient.post('/addons', addonData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update addon (Admin only)
   * @param {number} id - Addon ID
   * @param {Object} addonData - Addon details to update
   * @returns {Promise} API response
   */
  async updateAddon(id, addonData) {
    try {
      const response = await apiClient.put(`/addons/${id}`, addonData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete addon (Admin only)
   * @param {number} id - Addon ID
   * @returns {Promise} API response
   */
  async deleteAddon(id) {
    try {
      const response = await apiClient.delete(`/addons/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default addonService;

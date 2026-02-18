import apiClient from './apiClient';

/**
 * Office Service
 * Handles all office management API calls
 */

const officeService = {
  /**
   * Get all offices
   * @param {boolean} activeOnly - Filter for active offices only
   * @returns {Promise} API response with offices list
   */
  async getAllOffices(activeOnly = false) {
    try {
      const params = activeOnly ? { active_only: 'true' } : {};
      const response = await apiClient.get('/offices', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get office by ID
   * @param {number} id - Office ID
   * @returns {Promise} API response with office data
   */
  async getOfficeById(id) {
    try {
      const response = await apiClient.get(`/offices/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create a new office (Admin only)
   * @param {Object} officeData - Office data
   * @returns {Promise} API response with created office
   */
  async createOffice(officeData) {
    try {
      const response = await apiClient.post('/offices', { office: officeData });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update office
   * @param {number} id - Office ID
   * @param {Object} officeData - Office data to update
   * @returns {Promise} API response with updated office
   */
  async updateOffice(id, officeData) {
    try {
      const response = await apiClient.put(`/offices/${id}`, { office: officeData });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete office (Admin only)
   * @param {number} id - Office ID
   * @returns {Promise} API response
   */
  async deleteOffice(id) {
    try {
      const response = await apiClient.delete(`/offices/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Activate office (Admin only)
   * @param {number} id - Office ID
   * @returns {Promise} API response
   */
  async activateOffice(id) {
    try {
      const response = await apiClient.post(`/offices/${id}/activate`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Deactivate office (Admin only)
   * @param {number} id - Office ID
   * @returns {Promise} API response
   */
  async deactivateOffice(id) {
    try {
      const response = await apiClient.post(`/offices/${id}/deactivate`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default officeService;

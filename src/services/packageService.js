import apiClient from './apiClient';

/**
 * Package Service
 * Handles all package management and checklist items API calls
 */
const packageService = {
  /**
   * Get all packages with optional filters
   * @param {Object} [filters] - Query filters
   * @param {string} [filters.vehicle_type] - Filter by vehicle type (hatchback, sedan, suv, luxury)
   * @param {boolean} [filters.active] - Filter by active status
   * @param {boolean} [filters.subscription_enabled] - Filter by subscription enabled
   * @param {number} [filters.page] - Page number
   * @param {number} [filters.per_page] - Items per page
   * @returns {Promise} API response
   */
  async getPackages(filters = {}) {
    try {
      const response = await apiClient.get('/packages', { params: filters });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get package by ID
   * @param {number} id - Package ID
   * @returns {Promise} API response
   */
  async getPackageById(id) {
    try {
      const response = await apiClient.get(`/packages/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create a new package (Admin only)
   * @param {Object} packageData - Package details
   * @returns {Promise} API response
   */
  async createPackage(packageData) {
    try {
      const response = await apiClient.post('/packages', packageData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update package (Admin only)
   * @param {number} id - Package ID
   * @param {Object} packageData - Package details to update
   * @returns {Promise} API response
   */
  async updatePackage(id, packageData) {
    try {
      const response = await apiClient.put(`/packages/${id}`, packageData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete package (Admin only)
   * @param {number} id - Package ID
   * @returns {Promise} API response
   */
  async deletePackage(id) {
    try {
      const response = await apiClient.delete(`/packages/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get checklist items with optional filters
   * @param {Object} [filters] - Query filters
   * @returns {Promise} API response with checklist items list
   */
  async getChecklistItems(filters = {}) {
    try {
      const response = await apiClient.get('/checklist_items', { params: filters });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create a new checklist item (Admin only)
   * @param {Object} checklistData - Checklist item details
   * @returns {Promise} API response
   */
  async createChecklistItem(checklistData) {
    try {
      const response = await apiClient.post('/checklist_items', checklistData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update checklist item (Admin only)
   * @param {number} id - Checklist item ID
   * @param {Object} checklistData - Checklist item updates
   * @returns {Promise} API response
   */
  async updateChecklistItem(id, checklistData) {
    try {
      const response = await apiClient.put(`/checklist_items/${id}`, checklistData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete checklist item (Admin only)
   * @param {number} id - Checklist item ID
   * @returns {Promise} API response
   */
  async deleteChecklistItem(id) {
    try {
      const response = await apiClient.delete(`/checklist_items/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default packageService;

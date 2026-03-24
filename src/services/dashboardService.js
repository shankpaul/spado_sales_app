import apiClient from './apiClient';

/**
 * Dashboard Service
 * Handles API calls for dashboard statistics
 */
const dashboardService = {
  /**
   * Get dashboard statistics
   * @returns {Promise<Object>} Dashboard statistics with comparisons
   */
  async getStats() {
    try {
      const response = await apiClient.get('/dashboard/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  },
};

export default dashboardService;

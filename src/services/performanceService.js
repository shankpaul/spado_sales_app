import apiClient from './apiClient';

/**
 * Performance Service
 * Handles Partner Performance Scoring, Weekly Bonus Calculations, Adjustments, and Confirmations
 */
const performanceService = {
  /**
   * List summary of historical weekly settlement cycles
   * @param {number} limit - Max cycles to fetch
   * @returns {Promise} API response
   */
  async getCycles(limit = 26) {
    try {
      const response = await apiClient.get('/admin/performance/cycles', {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get partner performance scores for a specific cycle
   * @param {string} startDate - ISO string or DateOnly
   * @param {string} endDate - ISO string or DateOnly
   * @returns {Promise} API response
   */
  async getCyclePerformances(startDate, endDate) {
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const response = await apiClient.get('/admin/performance/cycle', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get detailed performance record by ID
   * @param {number} id
   * @returns {Promise} API response
   */
  async getPerformanceDetail(id) {
    try {
      const response = await apiClient.get(`/admin/performance/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get weekly partner performance score history for a specific employee
   * @param {number} employeeId
   * @param {number} limit
   * @returns {Promise} API response
   */
  async getEmployeeHistory(employeeId, limit = 26) {
    try {
      const response = await apiClient.get(`/admin/performance/employee/${employeeId}/history`, {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Trigger performance score calculation for all commission partners for a cycle
   * @param {string} cycleStart
   * @param {string} cycleEnd
   * @returns {Promise} API response
   */
  async calculateCycle(cycleStart, cycleEnd) {
    try {
      const response = await apiClient.post('/admin/performance/calculate', {
        cycle_start: cycleStart,
        cycle_end: cycleEnd,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Submit a manual adjustment / override for a partner's score
   * @param {number} id - Performance Record ID
   * @param {Object} data - { metric_name, adjusted_value, adjusted_score, exception_type, reason, evidence_url }
   * @returns {Promise} API response
   */
  async submitAdjustment(id, data) {
    try {
      const response = await apiClient.post(`/admin/performance/${id}/adjust`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Confirm a partner's performance score and credit bonus directly to wallet
   * @param {number} id - Performance Record ID
   * @returns {Promise} API response
   */
  async confirmPerformance(id) {
    try {
      const response = await apiClient.post(`/admin/performance/${id}/confirm`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Confirm all unfinalized scores for a cycle and credit bonuses in batch
   * @param {string} cycleStart
   * @param {string} cycleEnd
   * @returns {Promise} API response
   */
  async confirmCycleBatch(cycleStart, cycleEnd) {
    try {
      const response = await apiClient.post('/admin/performance/cycle/confirm', {
        cycle_start: cycleStart,
        cycle_end: cycleEnd,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete draft performance entries for a specific cycle
   * @param {string} cycleStart
   * @param {string} cycleEnd
   * @returns {Promise} API response
   */
  async deleteDraftCycle(cycleStart, cycleEnd) {
    try {
      const response = await apiClient.delete('/admin/performance/cycle', {
        params: {
          start_date: cycleStart,
          end_date: cycleEnd,
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete an individual draft performance score entry
   * @param {number} id - Performance Record ID
   * @returns {Promise} API response
   */
  async deletePerformance(id) {
    try {
      const response = await apiClient.delete(`/admin/performance/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Recalculate an individual draft performance score entry
   * @param {number} id - Performance Record ID
   * @returns {Promise} API response
   */
  async recalculatePerformance(id) {
    try {
      const response = await apiClient.post(`/admin/performance/${id}/recalculate`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get active performance scoring configuration
   * @returns {Promise} API response
   */
  async getConfig() {
    try {
      const response = await apiClient.get('/admin/performance/config');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update active performance scoring configuration
   * @param {Object} data - Configuration input
   * @returns {Promise} API response
   */
  async updateConfig(data) {
    try {
      const response = await apiClient.post('/admin/performance/config', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default performanceService;

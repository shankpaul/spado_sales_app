import apiClient from './apiClient';

/**
 * Wallet Service
 * Handles all wallet, settlement, and cash reconciliation API calls
 */

const walletService = {
  /**
   * Get wallet transactions
   * @param {Object} filters - Optional filters (employee_id, transaction_type, payment_method, settlement_id, settled, start_date, end_date, search, page, per_page)
   * @returns {Promise} API response with transactions list and pagination metadata
   */
  async getWalletTransactions(filters = {}) {
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const queryString = params.toString();
      const url = queryString ? `/wallet/transactions?${queryString}` : '/wallet/transactions';
      
      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create a manual transaction (Bonus, Incentive, Penalty, Manual Adjustment, Refund)
   * @param {Object} data - { employee_id, transaction_type, amount, description }
   * @returns {Promise} API response
   */
  async createManualTransaction(data) {
    try {
      const response = await apiClient.post('/wallet/transactions/manual', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get all employee wallet summaries in one shot
   * @returns {Promise} API response with array of all employee wallet summaries
   */
  async getAllWalletsSummary() {
    try {
      const response = await apiClient.get('/wallet/overview');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get employee wallet summary
   * @param {number} employeeId - Employee ID
   * @returns {Promise} API response with wallet summary
   */
  async getEmployeeSummary(employeeId) {
    try {
      const response = await apiClient.get(`/wallet/employees/${employeeId}/summary`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get employee wallet transaction history
   * @param {number} employeeId - Employee ID
   * @param {Object} filters - Optional filters
   * @returns {Promise} API response with transaction history
   */
  async getEmployeeTransactions(employeeId, filters = {}) {
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const queryString = params.toString();
      const url = queryString ? `/wallet/employees/${employeeId}/transactions?${queryString}` : `/wallet/employees/${employeeId}/transactions`;
      
      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * List settlements
   * @param {Object} filters - Optional filters (employee_id, cycle, start_date, end_date, page, per_page)
   * @returns {Promise} API response with settlements list
   */
  async getSettlements(filters = {}) {
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const queryString = params.toString();
      const url = queryString ? `/wallet/settlements?${queryString}` : '/wallet/settlements';
      
      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get employees due for settlement
   * @returns {Promise} API response with due employees list
   */
  async getSettlementsDue() {
    try {
      const response = await apiClient.get('/wallet/settlements/due');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get settlement preview calculation for an employee
   * @param {number} employeeId - Employee ID
   * @returns {Promise} API response with preview details
   */
  async getSettlementPreview(employeeId) {
    try {
      const response = await apiClient.get(`/wallet/settlements/preview/${employeeId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create a settlement for an employee
   * @param {number} employeeId - Employee ID
   * @param {Object} data - { notes, reference_number }
   * @returns {Promise} API response with created settlement
   */
  async createSettlement(employeeId, data = {}) {
    try {
      const response = await apiClient.post(`/wallet/settlements/${employeeId}`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * List cash reconciliation records
   * @param {Object} filters - Optional filters (employee_id, start_date, end_date, page, per_page)
   * @returns {Promise} API response
   */
  async getCashReconciliation(filters = {}) {
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const queryString = params.toString();
      const url = queryString ? `/wallet/cash-reconciliation?${queryString}` : '/wallet/cash-reconciliation';
      
      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Record company cash received from employee
   * @param {Object} data - { employee_id, amount, remarks }
   * @returns {Promise} API response
   */
  async receiveCompanyCash(data) {
    try {
      const response = await apiClient.post('/wallet/cash-reconciliation/receive', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default walletService;

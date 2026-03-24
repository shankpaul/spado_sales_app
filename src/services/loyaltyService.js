import apiClient from './apiClient';

/**
 * Loyalty Service
 * Handles all loyalty points related API calls
 */

const loyaltyService = {
  /**
   * Get customer's loyalty points summary
   * @param {number} customerId - Customer ID
   * @returns {Promise} API response with loyalty summary
   */
  async getCustomerSummary(customerId) {
    try {
      const response = await apiClient.get(`/loyalty/customers/${customerId}/summary`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get customer's loyalty transaction history
   * @param {number} customerId - Customer ID
   * @param {number} page - Page number
   * @param {number} perPage - Items per page
   * @returns {Promise} API response with transaction history
   */
  async getCustomerTransactions(customerId, page = 1, perPage = 20) {
    try {
      const response = await apiClient.get(`/loyalty/customers/${customerId}/transactions`, {
        params: { page, per_page: perPage }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get maximum redeemable points for an order
   * @param {number} orderId - Order ID
   * @param {number} customerId - Customer ID
   * @param {number} orderTotal - Order total amount
   * @returns {Promise} API response with max redeemable info
   */
  async getMaxRedeemable(orderId, customerId, orderTotal) {
    try {
      const response = await apiClient.get(`/loyalty/orders/${orderId}/max-redeemable`, {
        params: { customer_id: customerId, order_total: orderTotal }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Calculate maximum redeemable points without order ID (for draft orders)
   * @param {number} customerId - Customer ID
   * @param {number} orderTotal - Order total amount
   * @returns {Promise} API response with max redeemable info
   */
  async calculateMaxRedeemable(customerId, orderTotal) {
    try {
      // Use a temporary order ID of 0 for draft calculations
      const response = await apiClient.get(`/loyalty/orders/0/max-redeemable`, {
        params: { customer_id: customerId, order_total: orderTotal }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Redeem points for an order
   * @param {number} orderId - Order ID
   * @param {Object} data - Redemption data
   * @param {number} data.customer_id - Customer ID
   * @param {number} data.points - Points to redeem
   * @param {number} data.order_total - Order total amount
   * @returns {Promise} API response
   */
  async redeemPoints(orderId, data) {
    try {
      const response = await apiClient.post(`/loyalty/orders/${orderId}/redeem`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default loyaltyService;

import apiClient from './apiClient';

/**
 * Subscription Service
 * Handles all subscription-related API calls
 * Reference: /Users/shan/works/spado-api/SUBSCRIPTION_FEATURE.md
 */

const subscriptionService = {
  /**
   * Get all subscriptions with optional filters
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.per_page - Items per page
   * @param {string} params.search - Search term (customer name/phone)
   * @param {string} params.status - Subscription status filter (active/paused/cancelled/expired)
   * @param {string} params.customer_id - Customer ID filter
   */
  getAllSubscriptions: async (params = {}) => {
    const response = await apiClient.get('/subscriptions', { params });
    return response.data;
  },

  /**
   * Get a single subscription by ID
   * @param {string} id - Subscription ID
   */
  getSubscriptionById: async (id) => {
    const response = await apiClient.get(`/subscriptions/${id}`);
    return response.data;
  },

  /**
   * Create a new subscription
   * @param {Object} subscriptionData - Subscription data
   */
  createSubscription: async (subscriptionData) => {
    const response = await apiClient.post('/subscriptions', subscriptionData);
    return response.data;
  },

  /**
   * Update subscription payment
   * @param {string} id - Subscription ID
   * @param {Object} paymentData - Payment data
   */
  updatePayment: async (id, paymentData) => {
    const response = await apiClient.post(`/subscriptions/${id}/update_payment`, paymentData);
    return response.data;
  },

  /**
   * Pause subscription
   * @param {string} id - Subscription ID
   */
  pauseSubscription: async (id) => {
    const response = await apiClient.post(`/subscriptions/${id}/pause`);
    return response.data;
  },

  /**
   * Resume subscription
   * @param {string} id - Subscription ID
   */
  resumeSubscription: async (id) => {
    const response = await apiClient.post(`/subscriptions/${id}/resume`);
    return response.data;
  },

  /**
   * Cancel subscription
   * @param {string} id - Subscription ID
   */
  cancelSubscription: async (id) => {
    const response = await apiClient.post(`/subscriptions/${id}/cancel`);
    return response.data;
  },

  /**
   * Get subscription orders
   * @param {string} id - Subscription ID
   */
  getSubscriptionOrders: async (id) => {
    const response = await apiClient.get(`/subscriptions/${id}/orders`);
    return response.data;
  },

  /**
   * Get subscription-enabled packages
   * @param {string} vehicleType - Optional vehicle type filter
   */
  getSubscriptionPackages: async (vehicleType = null) => {
    const params = { subscription_enabled: true };
    if (vehicleType) {
      params.vehicle_type = vehicleType;
    }
    const response = await apiClient.get('/packages', { params });
    return response.data;
  },

  /**
   * Get addons for subscriptions
   */
  getAddons: async () => {
    const response = await apiClient.get('/addons');
    return response.data;
  },
};

export default subscriptionService;

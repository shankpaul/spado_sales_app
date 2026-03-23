import apiClient from './apiClient';

/**
 * Offer Service
 * Handles all offer-related API calls
 */

const offerService = {
  /**
   * Get all offers with optional filters
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.per_page - Items per page
   * @param {string} params.search - Search term (name or coupon code)
   * @param {string} params.offer_type - Offer type filter (package_bundle, addon_bundle, value_discount, wash_completion)
   * @param {boolean} params.is_active - Active status filter
   * @param {boolean} params.include_archived - Include archived offers
   */
  getAllOffers: async (params = {}) => {
    const response = await apiClient.get('/offers', { params });
    return response.data;
  },

  /**
   * Get a single offer by ID
   * @param {string} id - Offer ID
   */
  getOfferById: async (id) => {
    const response = await apiClient.get(`/offers/${id}`);
    return response.data;
  },

  /**
   * Create a new offer
   * @param {Object} offerData - Offer data
   * @param {string} offerData.name - Offer name (required)
   * @param {string} offerData.description - Offer description
   * @param {string} offerData.conditions - Offer terms and conditions
   * @param {string} offerData.offer_type - Offer type (required)
   * @param {string} offerData.discount_type - Discount type: fixed or percentage (required)
   * @param {number} offerData.discount_value - Discount value (required)
   * @param {number} offerData.wash_count_required - Required wash count (for wash_completion type)
   * @param {string} offerData.start_date - Start date ISO 8601 (required)
   * @param {string} offerData.end_date - End date ISO 8601 (required)
   * @param {string} offerData.coupon_code - Optional coupon code
   * @param {number} offerData.per_use_count - Usage limit per customer (0 = unlimited)
   * @param {number} offerData.max_usage - Total usage limit (0 = unlimited)
   * @param {boolean} offerData.is_stackable - Can be combined with other offers
   * @param {boolean} offerData.is_active - Is active
   * @param {number[]} offerData.required_package_ids - Required package IDs
   * @param {number[]} offerData.reward_package_ids - Reward package IDs
   * @param {number[]} offerData.required_addon_ids - Required addon IDs
   * @param {number[]} offerData.reward_addon_ids - Reward addon IDs
   */
  createOffer: async (offerData) => {
    const response = await apiClient.post('/offers', offerData);
    return response.data;
  },

  /**
   * Update an existing offer
   * @param {string} id - Offer ID
   * @param {Object} offerData - Offer data (same as create, all optional)
   */
  updateOffer: async (id, offerData) => {
    const response = await apiClient.put(`/offers/${id}`, offerData);
    return response.data;
  },

  /**
   * Delete an offer (soft delete)
   * @param {string} id - Offer ID
   */
  deleteOffer: async (id) => {
    const response = await apiClient.delete(`/offers/${id}`);
    return response.data;
  },

  /**
   * Archive an offer
   * @param {string} id - Offer ID
   */
  archiveOffer: async (id) => {
    const response = await apiClient.post(`/offers/${id}/archive`);
    return response.data;
  },

  /**
   * Unarchive an offer
   * @param {string} id - Offer ID
   */
  unarchiveOffer: async (id) => {
    const response = await apiClient.post(`/offers/${id}/unarchive`);
    return response.data;
  },

  /**
   * Get all active offers
   */
  getActiveOffers: async () => {
    const response = await apiClient.get('/offers/active');
    return response.data;
  },

  /**
   * Get available offers for selected packages (for order wizard)
   * @param {Object} params - Query parameters
   * @param {number[]} params.package_ids - Selected package IDs
   * @param {number} params.customer_id - Customer ID
   */
  getAvailableOffers: async (params = {}) => {
    const response = await apiClient.get('/offers/available', { params });
    return response.data;
  },

  /**
   * Validate an offer for a customer
   * @param {string} id - Offer ID
   * @param {number} customerId - Customer ID
   */
  validateOffer: async (id, customerId) => {
    const response = await apiClient.get(`/offers/${id}/validate`, {
      params: { customer_id: customerId },
    });
    return response.data;
  },

  /**
   * Get offer by coupon code
   * @param {string} code - Coupon code
   * @param {number} customerId - Optional customer ID for validation
   */
  getOfferByCouponCode: async (code, customerId = null) => {
    const params = customerId ? { customer_id: customerId } : {};
    const response = await apiClient.get(`/offers/coupon/${code}`, { params });
    return response.data;
  },
};

export default offerService;

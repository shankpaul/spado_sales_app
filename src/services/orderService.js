import apiClient from './apiClient';
import { getVehicleType } from '../lib/vehicleData';

/**
 * Order Service
 * Handles all order-related API calls
 */

const orderService = {
  /**
   * Get all orders with optional filters
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.search - Search term (order number)
   * @param {string} params.status - Order status filter
   * @param {string} params.payment_status - Payment status filter
   * @param {string} params.date_from - Start date filter
   * @param {string} params.date_to - End date filter
   * @param {string} params.agent_id - Agent ID filter
   * @param {string} params.customer_phone - Customer phone filter
   * @param {string} params.order_number - Order number search
   */
  getAllOrders: async (params = {}) => {
    const response = await apiClient.get('/orders', { params });
    return response.data;
  },

  /**
   * Get a single order by ID
   * @param {string} id - Order ID
   */
  getOrderById: async (id) => {
    const response = await apiClient.get(`/orders/${id}`);
    return response.data;
  },

  /**
   * Create a new order
   * @param {Object} orderData - Order data
   */
  createOrder: async (orderData) => {
    const response = await apiClient.post('/orders', orderData);
    return response.data;
  },

  /**
   * Update an existing order
   * @param {string} id - Order ID
   * @param {Object} orderData - Updated order data
   */
  updateOrder: async (id, orderData) => {
    const response = await apiClient.put(`/orders/${id}`, orderData);
    return response.data;
  },

  /**
   * Update order status
   * @param {string} id - Order ID
   * @param {string} status - New status (draft, booked, completed, cancelled)
   */
  updateOrderStatus: async (id, status) => {
    const response = await apiClient.patch(`/orders/${id}/status`, { status });
    return response.data;
  },

  /**
   * Cancel an order with reason
   * @param {string} id - Order ID
   * @param {string} reason - Cancellation reason
   */
  cancelOrder: async (id, reason) => {
    const response = await apiClient.post(`/orders/${id}/cancel`, { reason });
    return response.data;
  },

  /**
   * Get all packages with optional vehicle type filter
   * @param {string} vehicleType - Optional vehicle type filter (Hatchback/Sedan/SUV)
   * @param {boolean} subscription_enabled - Filter by subscription enabled status
   */
  getPackages: async (vehicleType = null, subscription_enabled = null) => {
    const params = {};
    if (vehicleType) {
      params.vehicle_type = vehicleType;
    }
    if (subscription_enabled !== null) {
      params.subscription_enabled = subscription_enabled;
    }
    const response = await apiClient.get('/packages', { params });
    return response.data;
  },

  /**
   * Get all add-ons
   */
  getAddons: async () => {
    const response = await apiClient.get('/addons');
    return response.data;
  },

  /**
   * Get users by role
   * @param {string} role - User role (e.g., 'agent')
   */
  getUsersByRole: async (role) => {
    const response = await apiClient.get('/users', { params: { role } });
    return response.data;
  },

  /**
   * Get order timeline/history
   * @param {string} id - Order ID
   */
  getOrderTimeline: async (id) => {
    const response = await apiClient.get(`/orders/${id}/timeline`);
    return response.data;
  },

  /**
   * Get order reassignments
   * @param {string} id - Order ID
   */
  getOrderReassignments: async (id) => {
    const response = await apiClient.get(`/orders/${id}/reassignments`);
    return response.data;
  },

  /**
   * Reassign order to different agent
   * @param {string} id - Order ID
   * @param {string} agentId - New agent ID
   * @param {string} notes - Reassignment notes
   */
  reassignOrder: async (id, agentId, notes = '') => {
    const response = await apiClient.post(`/orders/${id}/reassign`, {
      agent_id: agentId,
      notes,
    });
    return response.data;
  },

  /**
   * Submit order feedback
   * @param {string} id - Order ID
   * @param {Object} feedbackData - Feedback data
   * @param {number} feedbackData.rating - Rating (1-5)
   * @param {string} feedbackData.comment - Feedback comment
   */
  submitOrderFeedback: async (id, feedbackData) => {
    const response = await apiClient.post(`/orders/${id}/feedback`, feedbackData);
    return response.data;
  },

  /**
   * Update order note
   * @param {string} id - Order ID
   * @param {string} notes - Order notes
   */
  updateOrderNote: async (id, notes) => {
    const response = await apiClient.put(`/orders/${id}`, { notes });
    return response.data;
  },

  /**
   * Helper: Get vehicle type from brand and model
   * @param {string} brand - Car brand
   * @param {string} model - Car model
   * @returns {string|null} Vehicle type or null
   */
  getVehicleTypeFromBrandModel: (brand, model) => {
    return getVehicleType(brand, model);
  },

  /**
   * Calculate line item total with discount
   * @param {number} quantity - Quantity
   * @param {number} unitPrice - Unit price
   * @param {number} discount - Discount amount
   * @param {string} discountType - 'percentage' or 'fixed'
   * @returns {number} Total amount
   */
  calculateLineTotal: (quantity, unitPrice, discount = 0, discountType = 'fixed') => {
    const subtotal = quantity * unitPrice;
    
    if (discountType === 'percentage') {
      const discountAmount = (subtotal * discount) / 100;
      return subtotal - discountAmount;
    }
    
    return subtotal - discount;
  },

  /**
   * Validate discount amount
   * @param {number} discount - Discount amount
   * @param {string} discountType - 'percentage' or 'fixed'
   * @param {number} subtotal - Subtotal amount
   * @returns {boolean} Is valid
   */
  validateDiscount: (discount, discountType, subtotal) => {
    if (discountType === 'percentage') {
      return discount >= 0 && discount <= 50; // Max 50%
    }
    
    // For fixed discount, max 50% of subtotal
    const maxDiscount = subtotal * 0.5;
    return discount >= 0 && discount <= maxDiscount;
  },

  /**
   * Update order with images
   * @param {string} id - Order ID
   * @param {Object} orderData - Order data to update (optional, can be null)
   * @param {Object} images - Image files object
   * @param {File[]} images.beforeImages - Before service images (multiple files)
   * @param {File[]} images.afterImages - After service images (multiple files)
   * @param {File} images.customerSignature - Customer signature (single file)
   * @param {File} images.paymentProof - Payment proof (single file)
   * @param {File} images.googleReviewImage - Google review screenshot (single file)
   * @returns {Promise} Response with updated order including image URLs
   * 
   * @example
   * // Upload images with order data
   * await orderService.updateOrderWithImages('123', 
   *   { notes: 'Service completed', payment_status: 'paid' },
   *   { beforeImages: [file1, file2], afterImages: [file3] }
   * );
   * 
   * @example
   * // Upload only images without order data
   * await orderService.updateOrderWithImages('123', null, { 
   *   paymentProof: file 
   * });
   */
  updateOrderWithImages: async (id, orderData = null, images = {}) => {
    const formData = new FormData();

    // Add JSON data as string in 'data' field (optional)
    if (orderData && Object.keys(orderData).length > 0) {
      formData.append('data', JSON.stringify(orderData));
    }

    // Add before images - IMPORTANT: Use 'before_images' NOT 'before_images[]'
    // Multiple files are appended with the same field name
    if (images.beforeImages && images.beforeImages.length > 0) {
      images.beforeImages.forEach((file) => {
        formData.append('before_images', file);
      });
    }

    // Add after images - IMPORTANT: Use 'after_images' NOT 'after_images[]'
    // Multiple files are appended with the same field name
    if (images.afterImages && images.afterImages.length > 0) {
      images.afterImages.forEach((file) => {
        formData.append('after_images', file);
      });
    }

    // Add single file uploads
    if (images.customerSignature) {
      formData.append('customer_signature', images.customerSignature);
    }

    if (images.paymentProof) {
      formData.append('payment_proof', images.paymentProof);
    }

    if (images.googleReviewImage) {
      formData.append('google_review_image', images.googleReviewImage);
    }

    // Send as multipart/form-data
    // Note: Content-Type header will be set automatically by axios/fetch with the correct boundary
    const response = await apiClient.put(`/orders/${id}`, formData);
    return response.data;
  },
};

export default orderService;

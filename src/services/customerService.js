import apiClient from './apiClient';
import { parseMapLink as parseMapLinkUtil, reverseGeocode as reverseGeocodeUtil } from '../lib/utilities';

/**
 * Customer Service
 * Handles all customer-related API calls
 */

const customerService = {
  /**
   * Get all customers with optional filters
   * @param {Object} params - Query parameters (search, page, limit, last_booked_filter)
   */
  getAllCustomers: async (params = {}) => {
    const response = await apiClient.get('/customers', { params });
    return response.data;
  },

  /**
   * Get a single customer by ID
   * @param {string} id - Customer ID
   */
  getCustomerById: async (id) => {
    const response = await apiClient.get(`/customers/${id}`);
    return response.data;
  },

  /**
   * Create a new customer
   * @param {Object} customerData - Customer data
   */
  createCustomer: async (customerData) => {
    const response = await apiClient.post('/customers', customerData);
    return response.data;
  },

  /**
   * Update an existing customer
   * @param {string} id - Customer ID
   * @param {Object} customerData - Updated customer data
   */
  updateCustomer: async (id, customerData) => {
    const response = await apiClient.put(`/customers/${id}`, customerData);
    return response.data;
  },

  /**
   * Delete a customer
   * @param {string} id - Customer ID
   */
  deleteCustomer: async (id) => {
    const response = await apiClient.delete(`/customers/${id}`);
    return response.data;
  },

  /**
   * Parse Google Maps link to extract coordinates
   * @deprecated Use parseMapLink from utilities instead
   * @param {string} mapLink - Google Maps URL
   * @returns {Promise<Object>} Extracted coordinates {latitude, longitude}
   */
  parseMapLink: parseMapLinkUtil,

  /**
   * Reverse geocode coordinates to get address details
   * @deprecated Use reverseGeocode from utilities instead
   * @param {number} latitude
   * @param {number} longitude
   * @returns {Promise<Object>} Address details
   */
  reverseGeocode: reverseGeocodeUtil,
};

export default customerService;

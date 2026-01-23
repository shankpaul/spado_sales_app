import apiClient from './apiClient';

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
   * @param {string} mapLink - Google Maps URL
   * @returns {Object} Extracted coordinates {latitude, longitude}
   */
  parseMapLink: (mapLink) => {
    try {
      // Handle various Google Maps URL formats
      // Format 1: https://maps.google.com/?q=40.7128,-74.0060
      // Format 2: https://www.google.com/maps/place/40.7128,-74.0060
      // Format 3: https://maps.app.goo.gl/...
      // Format 4: https://www.google.com/maps/@40.7128,-74.0060,15z
      
      let latitude = null;
      let longitude = null;

      // Try to match ?q=lat,lng
      const qMatch = mapLink.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (qMatch) {
        latitude = parseFloat(qMatch[1]);
        longitude = parseFloat(qMatch[2]);
      }

      // Try to match @lat,lng
      if (!latitude && !longitude) {
        const atMatch = mapLink.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
        if (atMatch) {
          latitude = parseFloat(atMatch[1]);
          longitude = parseFloat(atMatch[2]);
        }
      }

      // Try to match place/lat,lng
      if (!latitude && !longitude) {
        const placeMatch = mapLink.match(/place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
        if (placeMatch) {
          latitude = parseFloat(placeMatch[1]);
          longitude = parseFloat(placeMatch[2]);
        }
      }

      return { latitude, longitude };
    } catch (error) {
      console.error('Error parsing map link:', error);
      return { latitude: null, longitude: null };
    }
  },

  /**
   * Reverse geocode coordinates to get address details
   * Uses a free geocoding service
   * @param {number} latitude
   * @param {number} longitude
   * @returns {Promise<Object>} Address details
   */
  reverseGeocode: async (latitude, longitude) => {
    try {
      // Using Nominatim (OpenStreetMap) free geocoding service
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'Spado-CarWash-App',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error('Geocoding failed');
      }

      const data = await response.json();
      
      return {
        area: data.address?.neighbourhood || data.address?.suburb || '',
        city: data.address?.city || data.address?.town || data.address?.village || '',
        district: data.address?.state_district || data.address?.county || '',
        state: data.address?.state || '',
        country: data.address?.country_code?.toUpperCase() || '',
        display_name: data.display_name || '',
      };
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return {
        area: '',
        city: '',
        district: '',
        state: '',
        country: '',
        display_name: '',
      };
    }
  },
};

export default customerService;

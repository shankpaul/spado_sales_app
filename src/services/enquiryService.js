import apiClient from './apiClient';

/**
 * Enquiry Service
 * Handles all enquiry/lead-related API calls
 */

const enquiryService = {
  /**
   * Get all enquiries with optional filters
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.per_page - Items per page
   * @param {string} params.search - Search term
   * @param {string} params.status - Status filter (new, contacted, interested, needs_followup, converted, lost)
   * @param {string} params.source - Source filter (whatsapp, phone_call, walk_in, etc.)
   * @param {string} params.sentiment - Sentiment filter
   * @param {number} params.assigned_to_id - Assigned user ID filter
   * @param {string} params.start_date - Start date filter (YYYY-MM-DD)
   * @param {string} params.end_date - End date filter (YYYY-MM-DD)
   */
  getAllEnquiries: async (params = {}) => {
    const response = await apiClient.get('/enquiries', { params });
    return response.data;
  },

  /**
   * Get a single enquiry by ID
   * @param {string} id - Enquiry ID
   */
  getEnquiryById: async (id) => {
    const response = await apiClient.get(`/enquiries/${id}`);
    return response.data;
  },

  /**
   * Create a new enquiry
   * @param {Object} enquiryData - Enquiry data
   * @param {string} enquiryData.contact_phone - Contact phone (required)
   * @param {string} enquiryData.contact_name - Contact name
   * @param {string} enquiryData.contact_email - Contact email
   * @param {string} enquiryData.source - Source (required)
   * @param {string} enquiryData.notes - Notes
   * @param {string} enquiryData.sentiment - Customer sentiment
   * @param {string} enquiryData.area - Area
   * @param {number} enquiryData.assigned_to_id - Assigned user ID
   */
  createEnquiry: async (enquiryData) => {
    const response = await apiClient.post('/enquiries', enquiryData);
    return response.data;
  },

  /**
   * Update an existing enquiry
   * @param {string} id - Enquiry ID
   * @param {Object} enquiryData - Updated enquiry data
   */
  updateEnquiry: async (id, enquiryData) => {
    const response = await apiClient.put(`/enquiries/${id}`, enquiryData);
    return response.data;
  },

  /**
   * Update enquiry status
   * @param {string} id - Enquiry ID
   * @param {string} status - New status
   * @param {string} notes - Optional notes
   */
  updateEnquiryStatus: async (id, status, notes = '') => {
    const response = await apiClient.post(`/enquiries/${id}/update_status`, { status, notes });
    return response.data;
  },

  /**
   * Assign enquiry to a sales executive
   * @param {string} id - Enquiry ID
   * @param {number} assigned_to_id - User ID to assign to
   */
  assignEnquiry: async (id, assigned_to_id) => {
    const response = await apiClient.post(`/enquiries/${id}/assign`, { assigned_to_id });
    return response.data;
  },

  /**
   * Convert enquiry to order
   * @param {string} id - Enquiry ID
   * @param {string} notes - Optional conversion notes
   */
  convertToOrder: async (id, notes = '') => {
    const response = await apiClient.post(`/enquiries/${id}/convert`, { notes });
    return response.data;
  },

  /**
   * Delete an enquiry (admin only)
   * @param {string} id - Enquiry ID
   */
  deleteEnquiry: async (id) => {
    const response = await apiClient.delete(`/enquiries/${id}`);
    return response.data;
  },

  /**
   * Get weekly report
   * @param {string} start_date - Start date (YYYY-MM-DD)
   * @param {string} end_date - End date (YYYY-MM-DD)
   * @param {number} assigned_to_id - Optional assigned user ID filter
   * @param {string} source - Optional source filter
   */
  getWeeklyReport: async (start_date, end_date, assigned_to_id = null, source = null) => {
    const params = { start_date, end_date };
    if (assigned_to_id) params.assigned_to_id = assigned_to_id;
    if (source) params.source = source;
    const response = await apiClient.get('/enquiries/reports/weekly', { params });
    return response.data;
  },

  /**
   * Get comments for an enquiry
   * @param {string} enquiry_id - Enquiry ID
   */
  getComments: async (enquiry_id) => {
    const response = await apiClient.get(`/enquiries/${enquiry_id}/comments`);
    return response.data;
  },

  /**
   * Add a comment to an enquiry (text only)
   * @param {string} enquiry_id - Enquiry ID
   * @param {Object} commentData - Comment data
   * @param {string} commentData.text - Comment text (required)
   * @param {boolean} commentData.is_customer_response - Is customer response
   */
  addComment: async (enquiry_id, commentData) => {
    const response = await apiClient.post(`/enquiries/${enquiry_id}/comments`, commentData);
    return response.data;
  },

  /**
   * Add a voice note comment to an enquiry
   * @param {string} enquiry_id - Enquiry ID
   * @param {FormData} formData - FormData containing audio file and metadata
   */
  addVoiceComment: async (enquiry_id, formData) => {
    // Don't set Content-Type manually - let Axios set it with the proper boundary
    const response = await apiClient.post(`/enquiries/${enquiry_id}/comments`, formData);
    return response.data;
  },

  /**
   * Get follow-ups for an enquiry
   * @param {string} enquiry_id - Enquiry ID
   */
  getFollowUps: async (enquiry_id) => {
    const response = await apiClient.get(`/enquiries/${enquiry_id}/followups`);
    return response.data;
  },

  /**
   * Add a follow-up for an enquiry
   * @param {string} enquiry_id - Enquiry ID
   * @param {Object} followUpData - Follow-up data {follow_up_at, notes}
   */
  addFollowUp: async (enquiry_id, followUpData) => {
    const response = await apiClient.post(`/enquiries/${enquiry_id}/followups`, followUpData);
    return response.data;
  },

  /**
   * Mark a follow-up as done
   * @param {string} followup_id - Follow-up ID
   */
  markFollowUpDone: async (followup_id) => {
    const response = await apiClient.put(`/enquiries/followups/${followup_id}/mark_done`);
    return response.data;
  },
};

export default enquiryService;

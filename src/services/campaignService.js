import apiClient from './apiClient';

/**
 * Campaign & Coupon Service
 * Handles all marketing campaign, partner, and coupon related API calls
 */

const campaignService = {
  // Campaign endpoints
  getAllCampaigns: async (params = {}) => {
    const response = await apiClient.get('/campaigns', { params });
    return response.data;
  },

  getCampaignById: async (id) => {
    const response = await apiClient.get(`/campaigns/${id}`);
    return response.data;
  },

  createCampaign: async (campaignData) => {
    const response = await apiClient.post('/campaigns', campaignData);
    return response.data;
  },

  updateCampaign: async (id, campaignData) => {
    const response = await apiClient.put(`/campaigns/${id}`, campaignData);
    return response.data;
  },

  deleteCampaign: async (id) => {
    const response = await apiClient.delete(`/campaigns/${id}`);
    return response.data;
  },

  generateCoupons: async (campaignId, data) => {
    const response = await apiClient.post(`/campaigns/${campaignId}/generate-coupons`, data);
    return response.data;
  },

  getCampaignAnalytics: async (id) => {
    const response = await apiClient.get(`/campaigns/${id}/analytics`);
    return response.data;
  },

  getGlobalCampaignAnalytics: async () => {
    const response = await apiClient.get('/campaigns/analytics');
    return response.data;
  },

  // Partner endpoints
  getAllPartners: async (params = {}) => {
    const response = await apiClient.get('/partners', { params });
    return response.data;
  },

  getPartnerById: async (id) => {
    const response = await apiClient.get(`/partners/${id}`);
    return response.data;
  },

  createPartner: async (partnerData) => {
    const response = await apiClient.post('/partners', partnerData);
    return response.data;
  },

  updatePartner: async (id, partnerData) => {
    const response = await apiClient.put(`/partners/${id}`, partnerData);
    return response.data;
  },

  deletePartner: async (id) => {
    const response = await apiClient.delete(`/partners/${id}`);
    return response.data;
  },

  // Coupon endpoints
  getAllCoupons: async (params = {}) => {
    const response = await apiClient.get('/coupons', { params });
    return response.data;
  },

  validateCoupon: async (code, customerId, mobile) => {
    const response = await apiClient.get(`/coupons/${code}/validate`, {
      params: { customer_id: customerId, mobile },
    });
    return response.data;
  },

  updateCoupon: async (id, data) => {
    const response = await apiClient.put(`/coupons/${id}`, data);
    return response.data;
  },

  bulkUpdateCouponStatus: async (data) => {
    const response = await apiClient.put('/coupons/bulk-status', data);
    return response.data;
  },
};

export default campaignService;

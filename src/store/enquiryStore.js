import { create } from 'zustand';
import enquiryService from '../services/enquiryService';

/**
 * Enquiry Store using Zustand
 * Single source of truth for all enquiry/lead data across the application
 */

const useEnquiryStore = create((set, get) => ({
  // State
  enquiries: [], // All enquiries in memory
  selectedEnquiry: null, // Currently viewing enquiry
  isLoading: false,
  error: null,
  
  // Filters
  filters: {
    status: '',
    source: '',
    sentiment: '',
    search: '',
    assignedToId: '',
    startDate: '',
    endDate: '',
  },
  
  // Pagination
  page: 1,
  hasMore: true,
  perPage: 20,
  totalCount: 0,
  totalPages: 1,

  // Actions
  
  /**
   * Set loading state
   */
  setLoading: (isLoading) => set({ isLoading }),

  /**
   * Set error state
   */
  setError: (error) => set({ error }),

  /**
   * Update filters
   */
  setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),

  /**
   * Reset filters
   */
  resetFilters: () => set({
    filters: {
      status: '',
      source: '',
      sentiment: '',
      search: '',
      assignedToId: '',
      startDate: '',
      endDate: '',
    },
  }),

  /**
   * Fetch enquiries with filters
   * Supports pagination and infinite scroll
   */
  fetchEnquiries: async (reset = false) => {
    const state = get();
    
    if (reset) {
      set({ page: 1, enquiries: [], hasMore: true });
    }

    const currentPage = reset ? 1 : state.page;
    
    set({ isLoading: true, error: null });
    try {
      const params = {
        page: currentPage,
        per_page: state.perPage,
        ...state.filters,
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });

      const response = await enquiryService.getAllEnquiries(params);
      const newEnquiries = response.enquiries || [];
      const total = response.total || 0;
      const calculatedTotalPages = Math.ceil(total / state.perPage) || 1;

      set({
        enquiries: reset ? newEnquiries : [...state.enquiries, ...newEnquiries],
        totalCount: total,
        totalPages: calculatedTotalPages,
        hasMore: newEnquiries.length === state.perPage,
        page: currentPage + 1,
        isLoading: false,
      });

      return newEnquiries;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  /**
   * Fetch single enquiry by ID
   */
  fetchEnquiryById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await enquiryService.getEnquiryById(id);
      const enquiry = response.enquiry;
      
      set({ selectedEnquiry: enquiry, isLoading: false });
      
      // Also update in the list if it exists
      const state = get();
      const index = state.enquiries.findIndex(e => e.id === enquiry.id);
      if (index !== -1) {
        const updatedEnquiries = [...state.enquiries];
        updatedEnquiries[index] = enquiry;
        set({ enquiries: updatedEnquiries });
      }
      
      return enquiry;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  /**
   * Create new enquiry
   */
  createEnquiry: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await enquiryService.createEnquiry(data);
      const newEnquiry = response.enquiry;
      
      // Add to beginning of list
      set(state => ({
        enquiries: [newEnquiry, ...state.enquiries],
        totalCount: state.totalCount + 1,
        isLoading: false,
      }));
      
      return newEnquiry;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  /**
   * Update enquiry
   */
  updateEnquiry: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await enquiryService.updateEnquiry(id, data);
      const updatedEnquiry = response.enquiry;
      
      // Update in list
      set(state => ({
        enquiries: state.enquiries.map(e => 
          e.id === id ? updatedEnquiry : e
        ),
        selectedEnquiry: state.selectedEnquiry?.id === id ? updatedEnquiry : state.selectedEnquiry,
        isLoading: false,
      }));
      
      return updatedEnquiry;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  /**
   * Update enquiry status
   */
  updateEnquiryStatus: async (id, status, notes = '') => {
    set({ isLoading: true, error: null });
    try {
      const response = await enquiryService.updateEnquiryStatus(id, status, notes);
      const updatedEnquiry = response.enquiry;
      
      // Update in list
      set(state => ({
        enquiries: state.enquiries.map(e => 
          e.id === id ? updatedEnquiry : e
        ),
        selectedEnquiry: state.selectedEnquiry?.id === id ? updatedEnquiry : state.selectedEnquiry,
        isLoading: false,
      }));
      
      return updatedEnquiry;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  /**
   * Assign enquiry to user
   */
  assignEnquiry: async (id, assigned_to_id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await enquiryService.assignEnquiry(id, assigned_to_id);
      const updatedEnquiry = response.enquiry;
      
      // Update in list
      set(state => ({
        enquiries: state.enquiries.map(e => 
          e.id === id ? updatedEnquiry : e
        ),
        selectedEnquiry: state.selectedEnquiry?.id === id ? updatedEnquiry : state.selectedEnquiry,
        isLoading: false,
      }));
      
      return updatedEnquiry;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  /**
   * Convert enquiry to order
   */
  convertToOrder: async (id, notes = '') => {
    set({ isLoading: true, error: null });
    try {
      const response = await enquiryService.convertToOrder(id, notes);
      
      // Refresh the enquiry to get updated status
      await get().fetchEnquiryById(id);
      
      set({ isLoading: false });
      return response;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  /**
   * Delete enquiry (admin only)
   */
  deleteEnquiry: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await enquiryService.deleteEnquiry(id);
      
      // Remove from list
      set(state => ({
        enquiries: state.enquiries.filter(e => e.id !== id),
        totalCount: state.totalCount - 1,
        selectedEnquiry: state.selectedEnquiry?.id === id ? null : state.selectedEnquiry,
        isLoading: false,
      }));
    } catch (error) {

      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  /**
   * Fetch specific page (for desktop pagination)
   */
  fetchPage: async (pageNumber) => {
    const state = get();
    
    set({ isLoading: true, error: null });
    try {
      const params = {
        page: pageNumber,
        per_page: state.perPage,
        ...state.filters,
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });

      const response = await enquiryService.getAllEnquiries(params);
      const newEnquiries = response.enquiries || [];
      const total = response.total || 0;
      const calculatedTotalPages = Math.ceil(total / state.perPage) || 1;

      set({
        enquiries: newEnquiries,
        totalCount: total,
        totalPages: calculatedTotalPages,
        page: pageNumber,
        hasMore: pageNumber < calculatedTotalPages,
        isLoading: false,
      });

      return newEnquiries;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  /**
   * Reset pagination to page 1
   */
  resetPagination: () => set({ page: 1, enquiries: [], hasMore: true }),

  /**
   * Clear selected enquiry
   */
  clearSelectedEnquiry: () => set({ selectedEnquiry: null }),

  /**
   * Get weekly report
   */
  getWeeklyReport: async (start_date, end_date, assigned_to_id = null, source = null) => {
    set({ isLoading: true, error: null });
    try {
      const response = await enquiryService.getWeeklyReport(start_date, end_date, assigned_to_id, source);
      set({ isLoading: false });
      return response.report;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
}));

export default useEnquiryStore;

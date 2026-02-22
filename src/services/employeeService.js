import apiClient from './apiClient';

/**
 * Employee Service
 * Handles all employee management API calls
 */

const employeeService = {
  /**
   * Get all employees
   * @param {Object} filters - Optional filters (status, scheme)
   * @returns {Promise} API response with employees list
   */
  async getAllEmployees(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.scheme) params.append('scheme', filters.scheme);
      
      const queryString = params.toString();
      const url = queryString ? `/employees?${queryString}` : '/employees';
      
      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get employee by ID
   * @param {number} id - Employee ID
   * @returns {Promise} API response with employee data
   */
  async getEmployeeById(id) {
    try {
      const response = await apiClient.get(`/employees/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create a new employee (Admin only)
   * @param {Object} employeeData - Employee data
   * @returns {Promise} API response with created employee
   */
  async createEmployee(employeeData) {
    try {
      const response = await apiClient.post('/employees', employeeData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update employee
   * @param {number} id - Employee ID
   * @param {Object} employeeData - Employee data to update
   * @returns {Promise} API response with updated employee
   */
  async updateEmployee(id, employeeData) {
    try {
      const response = await apiClient.put(`/employees/${id}`, employeeData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete employee (Admin only)
   * @param {number} id - Employee ID
   * @returns {Promise} API response
   */
  async deleteEmployee(id) {
    try {
      const response = await apiClient.delete(`/employees/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Activate employee (Admin only)
   * @param {number} id - Employee ID
   * @returns {Promise} API response
   */
  async activateEmployee(id) {
    try {
      const response = await apiClient.post(`/employees/${id}/activate`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Deactivate employee (Admin only)
   * @param {number} id - Employee ID
   * @returns {Promise} API response
   */
  async deactivateEmployee(id) {
    try {
      const response = await apiClient.post(`/employees/${id}/deactivate`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default employeeService;

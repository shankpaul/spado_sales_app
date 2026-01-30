import { format } from 'date-fns';

/**
 * Format date to "MMM dd, yyyy"
 * @param {string} dateString - Date string to format
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return format(new Date(dateString), 'MMM dd, yyyy');
  } catch {
    return 'Invalid date';
  }
};

/**
 * Format date and time to "MMM dd, yyyy hh:mm a"
 * @param {string} dateString - Date string to format
 * @returns {string} Formatted date time string
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return format(new Date(dateString), 'MMM dd, yyyy hh:mm a');
  } catch {
    return 'Invalid date';
  }
};

/**
 * Format time to "hh:mm a"
 * @param {string} dateTimeString - Date time string to format
 * @returns {string} Formatted time string
 */
export const formatTime = (dateTimeString) => {
  if (!dateTimeString) return 'N/A';
  try {
    return format(new Date(dateTimeString), 'hh:mm a');
  } catch {
    return 'N/A';
  }
};

/**
 * Format amount to INR currency
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount || 0);
};

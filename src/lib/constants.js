/**
 * API Constants and Configuration
 * Reference: /Users/shan/works/spado-api/API_DOCUMENTATION.md
 */

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  AGENT: 'agent',
  SALES_EXECUTIVE: 'sales_executive',
  ACCOUNTANT: 'accountant',
};

// Role Labels for UI
export const ROLE_LABELS = {
  [USER_ROLES.ADMIN]: 'Admin',
  [USER_ROLES.AGENT]: 'Agent',
  [USER_ROLES.SALES_EXECUTIVE]: 'Sales Executive',
  [USER_ROLES.ACCOUNTANT]: 'Accountant',
};

// Role Colors for badges/tags
export const ROLE_COLORS = {
  [USER_ROLES.ADMIN]: 'destructive',
  [USER_ROLES.AGENT]: 'secondary',
  [USER_ROLES.SALES_EXECUTIVE]: 'default',
  [USER_ROLES.ACCOUNTANT]: 'outline',
};

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  ME: '/auth/me',
  FORGOT_PASSWORD: '/auth/forgot-password', // TODO: Not yet implemented in API
  RESET_PASSWORD: '/auth/reset-password', // TODO: Not yet implemented in API

  // Users
  USERS: '/users',
  USER_BY_ID: (id) => `/users/${id}`,
  LOCK_USER: (id) => `/users/${id}/lock`,
  UNLOCK_USER: (id) => `/users/${id}/unlock`,
  UPDATE_USER_ROLE: (id) => `/users/${id}/role`,

  // Health
  HEALTH: '/health',
};

// Permission Checks
export const PERMISSIONS = {
  // User Management
  VIEW_ALL_USERS: [USER_ROLES.ADMIN, USER_ROLES.SALES_EXECUTIVE, USER_ROLES.ACCOUNTANT],
  CREATE_USER: [USER_ROLES.ADMIN],
  UPDATE_ANY_USER: [USER_ROLES.ADMIN],
  DELETE_USER: [USER_ROLES.ADMIN],
  LOCK_UNLOCK_USER: [USER_ROLES.ADMIN],
  CHANGE_USER_ROLE: [USER_ROLES.ADMIN],
};

/**
 * Check if user has permission
 * @param {string} userRole - Current user's role
 * @param {Array<string>} allowedRoles - Array of allowed roles
 * @returns {boolean} True if user has permission
 */
export const hasPermission = (userRole, allowedRoles) => {
  return allowedRoles.includes(userRole);
};

/**
 * Get available roles for user creation/editing
 * @returns {Array<Object>} Array of role objects
 */
export const getAvailableRoles = () => {
  return Object.values(USER_ROLES).map((role) => ({
    value: role,
    label: ROLE_LABELS[role],
  }));
};

// Token expiry (30 days according to API docs)
export const TOKEN_EXPIRY_DAYS = 30;

// Account locking settings (from API docs)
export const ACCOUNT_SETTINGS = {
  MAX_FAILED_ATTEMPTS: 5,
  LOCK_DURATION_HOURS: 1,
  INACTIVITY_EXPIRY_DAYS: 30,
};

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
};

// Test Credentials (from API docs - for development only)
export const TEST_CREDENTIALS = {
  ADMIN: {
    email: 'admin@spado.com',
    password: 'password123',
  },
  AGENT: {
    email: 'agent1@spado.com',
    password: 'password123',
  },
  SALES_EXECUTIVE: {
    email: 'sales1@spado.com',
    password: 'password123',
  },
  ACCOUNTANT: {
    email: 'accountant1@spado.com',
    password: 'password123',
  },
};

// ============================================
// ORDER MANAGEMENT CONSTANTS
// ============================================

// Order Status Constants
export const ORDER_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'gray' },
  { value: 'confirmed', label: 'Confirmed', color: 'blue' },
  { value: 'completed', label: 'Completed', color: 'green' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' },
  { value: 'in_progress', label: 'In Progress', color: 'amber' },
];

// Payment Status Constants
export const PAYMENT_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'yellow' },
  { value: 'paid', label: 'Paid', color: 'green' },
  { value: 'failed', label: 'Failed', color: 'red' },
  { value: 'refunded', label: 'Refunded', color: 'purple' },
];

// Cancellation Reasons
export const CANCELLATION_REASONS = [
  'Customer Request',
  'Service Unavailable',
  'Payment Issue',
  'Duplicate Order',
  'Weather Conditions',
  'Vehicle Not Available',
  'Staff Unavailable',
  'Other',
];

// Draft Expiry Duration (24 hours)
export const DRAFT_EXPIRY_HOURS = 24;

// LocalStorage Keys
export const STORAGE_KEYS = {
  ORDER_WIZARD_DRAFT: 'orderWizardDraft',
  SUBSCRIPTION_WIZARD_DRAFT: 'subscriptionWizardDraft',
};

// Order Timeline Event Types
export const TIMELINE_EVENT_TYPES = {
  CREATED: 'created',
  STATUS_CHANGED: 'status_changed',
  ASSIGNED: 'assigned',
  REASSIGNED: 'reassigned',
  PAYMENT_UPDATED: 'payment_updated',
  NOTE_ADDED: 'note_added',
  CANCELLED: 'cancelled',
};

// Discount Types
export const DISCOUNT_TYPES = {
  PERCENTAGE: 'percentage',
  FIXED: 'fixed',
};

// Maximum Discount Percentage
export const MAX_DISCOUNT_PERCENTAGE = 50;

/**
 * Get status color class
 * @param {string} status - Status value
 * @param {Array} statusArray - Array of status objects
 * @returns {string} Color class
 */
export const getStatusColor = (status, statusArray = ORDER_STATUSES) => {
  const statusObj = statusArray.find((s) => s.value === status);
  return statusObj ? statusObj.color : 'gray';
};

/**
 * Get status label
 * @param {string} status - Status value
 * @param {Array} statusArray - Array of status objects
 * @returns {string} Status label
 */
export const getStatusLabel = (status, statusArray = ORDER_STATUSES) => {
  const statusObj = statusArray.find((s) => s.value === status);
  return statusObj ? statusObj.label : status;
};

// ============================================
// SUBSCRIPTION MANAGEMENT CONSTANTS
// ============================================

// Subscription Status Constants
export const SUBSCRIPTION_STATUSES = [
  { value: 'active', label: 'Active', variant: 'default', color: 'green' },
  { value: 'paused', label: 'Paused', variant: 'secondary', color: 'yellow' },
  { value: 'cancelled', label: 'Cancelled', variant: 'destructive', color: 'red' },
  { value: 'expired', label: 'Expired', variant: 'outline', color: 'gray' },
];

// Payment Method Constants
export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
];

// Subscription Payment Status Constants
export const SUBSCRIPTION_PAYMENT_STATUSES = [
  { value: 'pending', label: 'Pending', variant: 'secondary', color: 'yellow' },
  { value: 'partial', label: 'Partial', variant: 'outline', color: 'orange' },
  { value: 'paid', label: 'Paid', variant: 'default', color: 'green' },
];

/**
 * Generate time slots for subscription scheduling in 24-hour format
 * @param {string} startTime - Start time in HH:MM format (default: '06:00')
 * @param {string} endTime - End time in HH:MM format (default: '20:30')
 * @param {number} intervalMinutes - Interval in minutes (default: 30)
 * @returns {Array<string>} Array of time slots in HH:MM format
 */
export const generateTimeSlots = (startTime = '06:00', endTime = '20:00', intervalMinutes = 30) => {
  const slots = [];
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);

  let currentHour = startHour;
  let currentMinute = startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;

  while (currentHour * 60 + currentMinute <= endTotalMinutes) {
    const hourStr = currentHour.toString().padStart(2, '0');
    const minuteStr = currentMinute.toString().padStart(2, '0');
    slots.push(`${hourStr}:${minuteStr}`);

    currentMinute += intervalMinutes;
    if (currentMinute >= 60) {
      currentHour += Math.floor(currentMinute / 60);
      currentMinute = currentMinute % 60;
    }
  }

  return slots;
};

/**
 * Format time to 12-hour format with AM/PM
 * @param {string} time24 - Time in HH:MM 24-hour format
 * @returns {string} Formatted time (e.g., "06:00 PM")
 */
export const formatTimeDisplay = (time24) => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  const h = parseInt(hours, 10);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  const h12Str = h12.toString().padStart(2, '0');
  return `${h12Str}:${minutes} ${period}`;
};

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

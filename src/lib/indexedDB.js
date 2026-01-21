import { openDB } from 'idb';

/**
 * IndexedDB Utility
 * Handles local data persistence for offline support
 */

const DB_NAME = 'SpadoCarWashDB';
const DB_VERSION = 1;

// Store names
const STORES = {
  USER_DATA: 'userData',
  DASHBOARD_CACHE: 'dashboardCache',
  BOOKINGS: 'bookings',
  CUSTOMERS: 'customers',
  SERVICES: 'services',
};

/**
 * Initialize IndexedDB
 * Creates database and object stores
 */
const initDB = async () => {
  const db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.USER_DATA)) {
        db.createObjectStore(STORES.USER_DATA);
      }
      if (!db.objectStoreNames.contains(STORES.DASHBOARD_CACHE)) {
        const dashboardStore = db.createObjectStore(STORES.DASHBOARD_CACHE);
        dashboardStore.createIndex('timestamp', 'timestamp');
      }
      if (!db.objectStoreNames.contains(STORES.BOOKINGS)) {
        const bookingsStore = db.createObjectStore(STORES.BOOKINGS, {
          keyPath: 'id',
        });
        bookingsStore.createIndex('date', 'date');
        bookingsStore.createIndex('status', 'status');
      }
      if (!db.objectStoreNames.contains(STORES.CUSTOMERS)) {
        db.createObjectStore(STORES.CUSTOMERS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.SERVICES)) {
        db.createObjectStore(STORES.SERVICES, { keyPath: 'id' });
      }
    },
  });
  return db;
};

/**
 * Generic get operation
 */
const get = async (storeName, key) => {
  const db = await initDB();
  return await db.get(storeName, key);
};

/**
 * Generic put operation
 */
const put = async (storeName, key, value) => {
  const db = await initDB();
  return await db.put(storeName, value, key);
};

/**
 * Generic delete operation
 */
const del = async (storeName, key) => {
  const db = await initDB();
  return await db.delete(storeName, key);
};

/**
 * Get all items from store
 */
const getAll = async (storeName) => {
  const db = await initDB();
  return await db.getAll(storeName);
};

/**
 * Clear entire store
 */
const clearStore = async (storeName) => {
  const db = await initDB();
  return await db.clear(storeName);
};

/**
 * Cache user data
 */
const cacheUserData = async (userData) => {
  return await put(STORES.USER_DATA, 'currentUser', {
    ...userData,
    cachedAt: new Date().toISOString(),
  });
};

/**
 * Get cached user data
 */
const getCachedUserData = async () => {
  return await get(STORES.USER_DATA, 'currentUser');
};

/**
 * Cache dashboard data
 */
const cacheDashboardData = async (role, data) => {
  return await put(STORES.DASHBOARD_CACHE, role, {
    role,
    data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Get cached dashboard data
 */
const getCachedDashboardData = async (role) => {
  const cached = await get(STORES.DASHBOARD_CACHE, role);
  
  // Check if cache is still valid (e.g., less than 1 hour old)
  if (cached) {
    const cacheAge = Date.now() - new Date(cached.timestamp).getTime();
    const oneHour = 60 * 60 * 1000;
    
    if (cacheAge < oneHour) {
      return cached.data;
    }
  }
  
  return null;
};

/**
 * Cache bookings list
 */
const cacheBookings = async (bookings) => {
  const db = await initDB();
  const tx = db.transaction(STORES.BOOKINGS, 'readwrite');
  
  // Clear existing data
  await tx.store.clear();
  
  // Add all bookings
  for (const booking of bookings) {
    await tx.store.put(booking);
  }
  
  await tx.done;
};

/**
 * Get cached bookings
 */
const getCachedBookings = async () => {
  return await getAll(STORES.BOOKINGS);
};

/**
 * Cache customers list
 */
const cacheCustomers = async (customers) => {
  const db = await initDB();
  const tx = db.transaction(STORES.CUSTOMERS, 'readwrite');
  
  await tx.store.clear();
  
  for (const customer of customers) {
    await tx.store.put(customer);
  }
  
  await tx.done;
};

/**
 * Get cached customers
 */
const getCachedCustomers = async () => {
  return await getAll(STORES.CUSTOMERS);
};

/**
 * Cache services list
 */
const cacheServices = async (services) => {
  const db = await initDB();
  const tx = db.transaction(STORES.SERVICES, 'readwrite');
  
  await tx.store.clear();
  
  for (const service of services) {
    await tx.store.put(service);
  }
  
  await tx.done;
};

/**
 * Get cached services
 */
const getCachedServices = async () => {
  return await getAll(STORES.SERVICES);
};

/**
 * Clear all cached data
 */
const clearAllCache = async () => {
  const db = await initDB();
  const stores = [
    STORES.USER_DATA,
    STORES.DASHBOARD_CACHE,
    STORES.BOOKINGS,
    STORES.CUSTOMERS,
    STORES.SERVICES,
  ];
  
  for (const store of stores) {
    await db.clear(store);
  }
};

export const indexedDBService = {
  initDB,
  get,
  put,
  del,
  getAll,
  clearStore,
  cacheUserData,
  getCachedUserData,
  cacheDashboardData,
  getCachedDashboardData,
  cacheBookings,
  getCachedBookings,
  cacheCustomers,
  getCachedCustomers,
  cacheServices,
  getCachedServices,
  clearAllCache,
  STORES,
};

export default indexedDBService;

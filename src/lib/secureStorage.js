/**
 * Secure Storage Utility
 * Provides encrypted storage for sensitive data in localStorage
 * Note: This is basic client-side encryption and should be used with httpOnly cookies for production
 */

const ENCRYPTION_KEY = 'spado-secure-storage-v1'; // In production, this should be derived from user session

/**
 * Simple XOR encryption (basic obfuscation)
 * WARNING: This is NOT cryptographically secure. Use Web Crypto API for real encryption
 * This is meant as a basic layer to prevent casual inspection
 */
const simpleEncrypt = (text) => {
  if (!text) return '';
  
  try {
    const textBytes = new TextEncoder().encode(text);
    const keyBytes = new TextEncoder().encode(ENCRYPTION_KEY);
    
    const encrypted = Array.from(textBytes).map((byte, i) => 
      byte ^ keyBytes[i % keyBytes.length]
    );
    
    return btoa(String.fromCharCode(...encrypted));
  } catch (error) {
    return text;
  }
};

/**
 * Simple XOR decryption
 */
const simpleDecrypt = (encrypted) => {
  if (!encrypted) return '';
  
  try {
    const encryptedBytes = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    const keyBytes = new TextEncoder().encode(ENCRYPTION_KEY);
    
    const decrypted = Array.from(encryptedBytes).map((byte, i) => 
      byte ^ keyBytes[i % keyBytes.length]
    );
    
    return new TextDecoder().decode(new Uint8Array(decrypted));
  } catch (error) {
    return encrypted;
  }
};

/**
 * Secure storage wrapper
 */
export const secureStorage = {
  /**
   * Set item in localStorage with encryption
   */
  setItem: (key, value) => {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      const encrypted = simpleEncrypt(stringValue);
      localStorage.setItem(key, encrypted);
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Get item from localStorage with decryption
   */
  getItem: (key) => {
    try {
      const encrypted = localStorage.getItem(key);
      if (!encrypted) return null;
      
      const decrypted = simpleDecrypt(encrypted);
      
      // Try to parse as JSON
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (error) {
      return null;
    }
  },

  /**
   * Remove item from localStorage
   */
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Clear all items from localStorage
   */
  clear: () => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Check if key exists
   */
  hasItem: (key) => {
    return localStorage.getItem(key) !== null;
  }
};

/**
 * Session storage wrapper (for temporary data)
 */
export const secureSessionStorage = {
  setItem: (key, value) => {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      sessionStorage.setItem(key, stringValue);
      return true;
    } catch (error) {
      return false;
    }
  },

  getItem: (key) => {
    try {
      const value = sessionStorage.getItem(key);
      if (!value) return null;
      
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      return null;
    }
  },

  removeItem: (key) => {
    try {
      sessionStorage.removeItem(key);
      return true;
    } catch (error) {
      return false;
    }
  },

  clear: () => {
    try {
      sessionStorage.clear();
      return true;
    } catch (error) {
      return false;
    }
  }
};

export default secureStorage;

/**
 * Security utilities for input validation and sanitization
 */

/**
 * Validates if a URL is safe to use
 * @param {string} url - The URL to validate
 * @param {array} allowedProtocols - Allowed protocols (default: ['http:', 'https:'])
 * @returns {boolean} - True if URL is valid and safe
 */
export const isValidUrl = (url, allowedProtocols = ['http:', 'https:']) => {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);
    return allowedProtocols.includes(parsed.protocol);
  } catch {
    return false;
  }
};

/**
 * Sanitizes a URL for safe usage
 * @param {string} url - The URL to sanitize
 * @param {string} fallback - Fallback URL if validation fails
 * @returns {string} - Sanitized URL or fallback
 */
export const sanitizeUrl = (url, fallback = '#') => {
  if (!isValidUrl(url)) {
    return fallback;
  }
  return url;
};

/**
 * Validates and sanitizes image URL
 * @param {string} url - Image URL to validate
 * @returns {string|null} - Sanitized URL or null
 */
export const sanitizeImageUrl = (url) => {
  if (!url) return null;
  
  // Check if it's a valid URL
  if (!isValidUrl(url)) {
    // Check if it's a data URL (base64 images)
    if (url.startsWith('data:image/')) {
      return url;
    }
    return null;
  }
  
  return url;
};

/**
 * Validates coordinate values
 * @param {number|string} lat - Latitude
 * @param {number|string} lng - Longitude
 * @returns {object|null} - {lat, lng} or null if invalid
 */
export const validateCoordinates = (lat, lng) => {
  const sanitizedLat = typeof lat === 'number' ? lat : parseFloat(lat);
  const sanitizedLng = typeof lng === 'number' ? lng : parseFloat(lng);
  
  if (isNaN(sanitizedLat) || isNaN(sanitizedLng)) {
    return null;
  }
  
  // Validate coordinate ranges
  if (sanitizedLat < -90 || sanitizedLat > 90 || sanitizedLng < -180 || sanitizedLng > 180) {
    return null;
  }
  
  return { lat: sanitizedLat, lng: sanitizedLng };
};

/**
 * Sanitizes HTML to prevent XSS
 * @param {string} html - HTML string
 * @returns {string} - Sanitized string
 */
export const sanitizeHtml = (html) => {
  if (!html) return '';
  
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
};

/**
 * Validates file type for uploads
 * @param {File} file - File object
 * @param {array} allowedTypes - Array of allowed MIME types
 * @returns {boolean} - True if file type is allowed
 */
export const isValidFileType = (file, allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']) => {
  if (!file || !file.type) {
    return false;
  }
  
  return allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      return file.type.startsWith(type.replace('/*', '/'));
    }
    return file.type === type;
  });
};

/**
 * Validates file size
 * @param {File} file - File object
 * @param {number} maxSize - Maximum size in bytes
 * @returns {boolean} - True if file size is within limit
 */
export const isValidFileSize = (file, maxSize = 5 * 1024 * 1024) => {
  if (!file || !file.size) {
    return false;
  }
  
  return file.size <= maxSize;
};

/**
 * Rate limiting helper
 * @param {function} func - Function to throttle
 * @param {number} delay - Delay in milliseconds
 * @returns {function} - Throttled function
 */
export const throttle = (func, delay = 300) => {
  let timeoutId;
  let lastExecTime = 0;
  
  return function(...args) {
    const currentTime = Date.now();
    const timeSinceLastExec = currentTime - lastExecTime;
    
    clearTimeout(timeoutId);
    
    if (timeSinceLastExec >= delay) {
      func.apply(this, args);
      lastExecTime = currentTime;
    } else {
      timeoutId = setTimeout(() => {
        func.apply(this, args);
        lastExecTime = Date.now();
      }, delay - timeSinceLastExec);
    }
  };
};

/**
 * Debounce helper
 * @param {function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {function} - Debounced function
 */
export const debounce = (func, wait = 300) => {
  let timeoutId;
  
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
};

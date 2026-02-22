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

/**
 * Calculate booking duration between two times
 * @param {string} fromTime - Start time in HH:MM format
 * @param {string} toTime - End time in HH:MM format
 * @returns {string|null} Formatted duration string or null if times are missing
 */
export const calculateBookingDuration = (fromTime, toTime) => {
  if (!fromTime || !toTime) return null;
  
  const [fromHours, fromMinutes] = fromTime.split(':').map(Number);
  const [toHours, toMinutes] = toTime.split(':').map(Number);
  const fromTotalMinutes = fromHours * 60 + fromMinutes;
  const toTotalMinutes = toHours * 60 + toMinutes;
  const durationMinutes = toTotalMinutes - fromTotalMinutes;
  
  if (durationMinutes <= 0) return 'Invalid time range';
  
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  
  if (hours === 0) {
    return `Booked for ${minutes} min`;
  } else if (minutes === 0) {
    return `Booked for ${hours} hr${hours > 1 ? 's' : ''}`;
  } else {
    return `Booked for ${hours} hr${hours > 1 ? 's' : ''} ${minutes} min`;
  }
};

/**
 * Calculate GST amount and total with GST
 * @param {number} amount - Base amount to calculate GST on
 * @param {number} gstPercentage - GST percentage (default: 18)
 * @returns {Object} Object containing gst, total, and gstPercentage
 */
export const calculateGST = (amount, gstPercentage = 18) => {
  const gst = (amount * gstPercentage) / 100;
  const total = amount + gst;
  
  return {
    subtotal: amount,
    gst,
    gstPercentage,
    total,
  };
};

/**
 * Calculate round-off amount to nearest integer
 * @param {number} amount - Amount to round
 * @returns {Object} Object containing roundedAmount and roundOff
 */
export const calculateRoundOff = (amount) => {
  const roundedAmount = Math.round(amount);
  const roundOff = roundedAmount - amount;
  
  return {
    roundedAmount,
    roundOff,
  };
};

/**
 * Expand shortened URL using backend API
 * @param {string} shortUrl - Shortened URL to expand
 * @returns {Promise<string|null>} Expanded URL or null if failed
 */
const expandUrlWithApi = async (shortUrl) => {
  try {
    // Import dynamically to avoid circular dependency
    const { default: apiClient } = await import('../services/apiClient');
    
    const response = await apiClient.post('/utilities/expand_url', { url: shortUrl });
    
    if (response.data.success && response.data.expanded_url) {
      return response.data.expanded_url;
    }
    return null;
  } catch (error) {
    console.warn('API URL expansion failed:', error);
    return null;
  }
};

/**
 * Parse various Google Maps URLs to extract coordinates
 * Handles: Regular URLs, shortened URLs (goo.gl, maps.app.goo.gl), WhatsApp location URLs
 * @param {string} mapLink - Map URL (Google Maps, shortened, WhatsApp location)
 * @returns {Promise<Object>} Extracted coordinates {latitude, longitude, needsExpansion}
 */
export const parseMapLink = async (mapLink) => {
  try {
    let originalLink = mapLink;
    let needsExpansion = false;

    // If it's a shortened URL, try to expand it
    if (mapLink.includes('goo.gl') || mapLink.includes('maps.app.goo.gl')) {
      needsExpansion = true;
      
      // Method 1: Try fetch with CORS
      try {
        const response = await fetch(mapLink, {
          method: 'GET',
          redirect: 'follow',
          mode: 'cors',
        });
        
        if (response.url && response.url !== mapLink) {
          mapLink = response.url;
          needsExpansion = false;
        }
      } catch (fetchError) {
        console.warn('Fetch expansion failed, trying API:', fetchError);
      }
      
      // Method 2: Try backend API expansion if fetch failed
      if (needsExpansion) {
        const apiExpanded = await expandUrlWithApi(mapLink);
        if (apiExpanded) {
          mapLink = apiExpanded;
          needsExpansion = false;
        } else {
          console.warn('Could not expand shortened URL with any method');
          // Return early with a flag indicating manual expansion needed
          return { 
            latitude: null, 
            longitude: null, 
            needsExpansion: true,
            originalLink 
          };
        }
      }
    }

    let latitude = null;
    let longitude = null;

    // Format 1: ?q=lat,lng or ?ll=lat,lng (Common in regular links and WhatsApp)
    const qMatch = mapLink.match(/[?&](q|ll)=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (qMatch) {
      latitude = parseFloat(qMatch[2]);
      longitude = parseFloat(qMatch[3]);
    }

    // Format 2: @lat,lng (Standard Google Maps format)
    if (!latitude && !longitude) {
      const atMatch = mapLink.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (atMatch) {
        latitude = parseFloat(atMatch[1]);
        longitude = parseFloat(atMatch[2]);
      }
    }

    // Format 3: /search/lat,lng or /search/lat,+lng (Expanded shortened URLs)
    if (!latitude && !longitude) {
      const searchMatch = mapLink.match(/\/search\/(-?\d+\.?\d*),\+?(-?\d+\.?\d*)/);
      if (searchMatch) {
        latitude = parseFloat(searchMatch[1]);
        longitude = parseFloat(searchMatch[2]);
      }
    }

    // Format 4: place/lat,lng or place/place_name/lat,lng
    if (!latitude && !longitude) {
      const placeMatch = mapLink.match(/place\/[^/]*?(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (placeMatch) {
        latitude = parseFloat(placeMatch[1]);
        longitude = parseFloat(placeMatch[2]);
      }
    }

    // Format 5: Direct lat,lng in URL path (some WhatsApp formats)
    if (!latitude && !longitude) {
      const directMatch = mapLink.match(/(-?\d+\.\d{4,}),(-?\d+\.\d{4,})/);
      if (directMatch) {
        latitude = parseFloat(directMatch[1]);
        longitude = parseFloat(directMatch[2]);
      }
    }

    return { latitude, longitude, needsExpansion: false };
  } catch (error) {
    console.error('Error parsing map link:', error);
    return { latitude: null, longitude: null, needsExpansion: false };
  }
};

/**
 * Reverse geocode coordinates or map link to get address details
 * Uses backend API which handles parsing, URL expansion, and geocoding
 * @param {number|string} latitudeOrMapLink - Latitude number or Google Maps URL
 * @param {number} longitude - Longitude number (only if first param is latitude)
 * @returns {Promise<Object>} Address details
 */
export const reverseGeocode = async (latitudeOrMapLink, longitude) => {
  try {
    const { default: apiClient } = await import('../services/apiClient');
    
    let requestData = {};
    
    // Check if first parameter is a string (map link) or number (latitude)
    if (typeof latitudeOrMapLink === 'string') {
      requestData = { map_link: latitudeOrMapLink };
    } else {
      requestData = { latitude: latitudeOrMapLink, longitude };
    }
    
    const response = await apiClient.post('/utilities/reverse_geocode', requestData);
    
    if (response.data.success && response.data.address) {
      return response.data.address;
    }
    
    throw new Error('Reverse geocoding failed');
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    throw error;
  }
};

/**
 * Check service availability for a location, vehicle type, and customer
 * @param {Object} params - Parameters for availability check
 * @param {string} params.customer_phone - Customer phone number
 * @param {string} params.vehicle_type - Vehicle type (hatchback, sedan, suv, luxury)
 * @param {string} params.package_name - Package name (optional)
 * @param {string} params.map_link - Google Maps link (optional)
 * @param {string} params.location - Location name (optional)
 * @param {number} params.latitude - Latitude (optional)
 * @param {number} params.longitude - Longitude (optional)
 * @returns {Promise<Object>} Availability result
 */
export const checkServiceAvailability = async (params) => {
  try {
    const { default: apiClient } = await import('../services/apiClient');
    
    const response = await apiClient.post('/utilities/check_service_availability', params);
    
    if (response.data.success) {
      return response.data;
    }
    
    throw new Error(response.data.error || 'Service availability check failed');
  } catch (error) {
    console.error('Error checking service availability:', error);
    throw error;
  }
};

/**
 * Get list of agents available today (checked in but not checked out)
 * @returns {Promise<Object>} Response with agents array and metadata
 */
export const getAgentsAvailableToday = async () => {
  try {
    const { default: apiClient } = await import('../services/apiClient');
    
    const response = await apiClient.get('/utilities/agents_available_today');
    
    if (response.data.success) {
      return response.data;
    }
    
    throw new Error(response.data.error || 'Failed to fetch available agents');
  } catch (error) {
    console.error('Error fetching available agents:', error);
    throw error;
  }
};

/**
 * Search for area/locality names using OpenStreetMap Nominatim API
 * Combines results from Nominatim with optional local database areas
 * @param {string} query - The search query (area name to search for)
 * @param {Object} options - Search options
 * @param {string} options.city - City name for context
 * @param {string} options.district - District name for context
 * @param {string} options.state - State name for context (default: 'Kerala')
 * @param {Array<string>} options.localAreas - Optional array of local area names from database
 * @param {number} options.limit - Maximum number of suggestions (default: 8)
 * @returns {Promise<Array<string>>} Array of unique area name suggestions
 */
export const searchAreas = async (query, options = {}) => {
  const {
    city = '',
    district = '',
    state = 'Kerala',
    localAreas = [],
    limit = 8,
  } = options;

  if (!query || query.length < 2) {
    return [];
  }

  const lowerQuery = query.toLowerCase();

  try {
    // Build search query with location context
    const searchContext = [query];
    if (city) searchContext.push(city);
    if (district) searchContext.push(district);
    searchContext.push(state);
    searchContext.push('India');
    
    const searchQuery = searchContext.join(', ');
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
      `format=json&` +
      `q=${encodeURIComponent(searchQuery)}&` +
      `limit=15&` + // Increased to get more results for filtering
      `addressdetails=1&` +
      `countrycodes=in`,
      {
        headers: {
          'User-Agent': 'Spado-CarWash-App/1.0',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      
      // Extract unique area names from results
      const apiSuggestions = data
        .map(item => {
          const addr = item.address;
          return addr?.neighbourhood || 
                 addr?.suburb || 
                 addr?.hamlet || 
                 addr?.village || 
                 addr?.town || 
                 null;
        })
        .filter(Boolean)
        .filter(area => area.toLowerCase().startsWith(lowerQuery)) // Only areas starting with query
        .filter((value, index, self) => self.indexOf(value) === index); // unique
      
      // Add matching areas from local database that start with query
      const matchingLocalAreas = localAreas
        .filter(area => area.toLowerCase().startsWith(lowerQuery))
        .slice(0, 5);
      
      // Combine and deduplicate
      const combined = [...new Set([...apiSuggestions, ...matchingLocalAreas])];
      
      return combined.slice(0, limit);
    }
    
    // If API fails, fallback to local areas starting with query
    return localAreas
      .filter(area => area.toLowerCase().startsWith(lowerQuery))
      .slice(0, limit);
  } catch (error) {
    console.error('Error searching areas:', error);
    
    // Fallback to local areas starting with query
    return localAreas
      .filter(area => area.toLowerCase().startsWith(lowerQuery))
      .slice(0, limit);
  }
};

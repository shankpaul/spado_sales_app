/**
 * India Location Service
 * Provides Indian states, districts, and cities data
 */

// Indian States
export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

// Major Districts in Kerala
export const KERALA_DISTRICTS = [
  // 'Alappuzha',
  'Ernakulam',
  // 'Idukki',
  // 'Kannur',
  // 'Kasaragod',
  // 'Kollam',
  // 'Kottayam',
  // 'Kozhikode',
  // 'Malappuram',
  // 'Palakkad',
  // 'Pathanamthitta',
  // 'Thiruvananthapuram',
  'Thrissur',
  // 'Wayanad',
];

// Cities organized by district
export const KERALA_CITIES_BY_DISTRICT = {
  Alappuzha: [
    'Alappuzha',
    'Kayamkulam',
    'Cherthala',
    'Haripad',
  ],
  Ernakulam: [
    'Kochi',
    'Kalamassery',
    'Thrippunithura',
    'Muvattupuzha',
    'Kothamangalam',
    'Perumbavoor',
    'North Paravur',
  ],
  Idukki: [
    'Thodupuzha',
  ],
  Kannur: [
    'Kannur',
    'Thalassery',
    'Payyanur',
    'Mattanur',
  ],
  Kasaragod: [
    'Kasaragod',
    'Kanhangad',
  ],
  Kollam: [
    'Kollam',
    'Punalur',
  ],
  Kottayam: [
    'Kottayam',
    'Changanassery',
    'Pala',
  ],
  Kozhikode: [
    'Kozhikode',
    'Vatakara',
    'Koyilandy',
    'Feroke',
  ],
  Malappuram: [
    'Malappuram',
    'Manjeri',
    'Ponnani',
    'Parappanangadi',
    'Perinthalmanna',
    'Tanur',
    'Tirur',
    'Nilambur',
    'Kottakkal',
  ],
  Palakkad: [
    'Palakkad',
    'Ottappalam',
    'Cherpulassery',
    'Shornur',
    'Ottapalam',
    'Shoranur',
  ],
  Pathanamthitta: [
    'Pathanamthitta',
    'Pandalam',
    'Tiruvalla',
    'Adoor',
  ],
  Thiruvananthapuram: [
    'Thiruvananthapuram',
    'Neyyattinkara',
    'Attingal',
    'Varkala',
  ],
  Thrissur: [
    'Thrissur',
    'Chalakudy',
    'Kodungallur',
    'Kunnamkulam',
    'Guruvayur',
  ],
  Wayanad: [
    'Kalpetta',
  ],
};

// All Kerala cities (flat list for backward compatibility)
export const KERALA_CITIES = Object.values(KERALA_CITIES_BY_DISTRICT).flat();

const locationService = {
  /**
   * Get list of Indian states
   */
  getStates: () => {
    return INDIAN_STATES;
  },

  /**
   * Get districts for a state
   * Currently only Kerala is fully populated
   */
  getDistricts: (state) => {
    if (state === 'Kerala') {
      return KERALA_DISTRICTS;
    }
    // For other states, return empty for now
    // Can be extended with more state data
    return [];
  },

  /**
   * Get cities for a district/state
   * Currently only Kerala is fully populated
   */
  getCities: (state, district = null) => {
    if (state === 'Kerala') {
      if (district && KERALA_CITIES_BY_DISTRICT[district]) {
        return KERALA_CITIES_BY_DISTRICT[district];
      }
      return KERALA_CITIES;
    }
    // For other states, return empty for now
    return [];
  },

  /**
   * Search areas using postal code
   * Uses India Post API
   */
  searchAreasByPincode: async (pincode) => {
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await response.json();
      
      if (data[0]?.Status === 'Success') {
        const postOffices = data[0].PostOffice || [];
        return postOffices.map((po) => ({
          area: po.Name,
          district: po.District,
          city: po.Division,
          state: po.State,
          pincode: po.Pincode,
        }));
      }
      return [];
    } catch (error) {
      console.error('Error fetching pincode data:', error);
      return [];
    }
  },

  /**
   * Get unique areas from existing customers based on state and district
   * Uses backend API to fetch from database
   */
  getAreas: async (state, district = null) => {
    try {
      const { default: apiClient } = await import('./apiClient');
      
      const params = new URLSearchParams({ state });
      if (district) {
        params.append('district', district);
      }
      
      const response = await apiClient.get(`/utilities/areas?${params.toString()}`);
      
      if (response.data.success && response.data.areas) {
        return response.data.areas;
      }
      return [];
    } catch (error) {
      console.error('Error fetching areas:', error);
      return [];
    }
  },

  /**
   * Filter items by search query
   */
  filterBySearch: (items, query) => {
    if (!query) return items;
    const lowerQuery = query.toLowerCase();
    return items.filter((item) =>
      item.toLowerCase().includes(lowerQuery)
    );
  },
};

export default locationService;

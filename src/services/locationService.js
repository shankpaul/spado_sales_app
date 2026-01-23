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
  'Alappuzha',
  'Ernakulam',
  'Idukki',
  'Kannur',
  'Kasaragod',
  'Kollam',
  'Kottayam',
  'Kozhikode',
  'Malappuram',
  'Palakkad',
  'Pathanamthitta',
  'Thiruvananthapuram',
  'Thrissur',
  'Wayanad',
];

// Major Cities in Kerala
export const KERALA_CITIES = [
  'Thiruvananthapuram',
  'Kochi',
  'Kozhikode',
  'Thrissur',
  'Kollam',
  'Palakkad',
  'Alappuzha',
  'Malappuram',
  'Kannur',
  'Kottayam',
  'Manjeri',
  'Thalassery',
  'Ponnani',
  'Vatakara',
  'Kanhangad',
  'Payyanur',
  'Koyilandy',
  'Parappanangadi',
  'Kalamassery',
  'Neyyattinkara',
  'Tanur',
  'Kayamkulam',
  'Thrippunithura',
  'Muvattupuzha',
  'Kothamangalam',
  'Pathanamthitta',
  'Attingal',
  'Cherthala',
  'Perinthalmanna',
  'Chalakudy',
  'Payyoli',
  'Kodungallur',
  'Ottappalam',
  'Tirur',
  'Thodupuzha',
  'Cherpulassery',
  'Perumbavoor',
  'Mattanur',
  'Punalur',
  'Nilambur',
  'Chengannur',
  'Kasaragod',
  'Feroke',
  'Taliparamba',
  'Shornur',
  'Pandalam',
  'Kottakkal',
  'Kunnamkulam',
  'Ottapalam',
  'Tiruvalla',
  'Thalassery',
  'Shoranur',
  'Vatakara',
  'Kalpetta',
  'North Paravur',
  'Haripad',
  'Muvattupuzha',
  'Pala',
  'Changanassery',
  'Guruvayur',
  'Adoor',
  'Varkala',
];

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

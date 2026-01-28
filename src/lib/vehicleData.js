/**
 * Indian Vehicle Database
 * Maps car brands and models to vehicle types
 * Expandable for future additions
 */

export const vehicleData = [
  {
    brand: 'Maruti Suzuki',
    models: [
      { name: 'Alto', type: 'Hatchback' },
      { name: 'WagonR', type: 'Hatchback' },
      { name: 'Swift', type: 'Hatchback' },
      { name: 'Baleno', type: 'Hatchback' },
      { name: 'Celerio', type: 'Hatchback' },
      { name: 'Ignis', type: 'Hatchback' },
      { name: 'Dzire', type: 'Sedan' },
      { name: 'Ciaz', type: 'Sedan' },
      { name: 'Ertiga', type: 'SUV' },
      { name: 'Brezza', type: 'SUV' },
      { name: 'Grand Vitara', type: 'SUV' },
      { name: 'Fronx', type: 'SUV' },
      { name: 'Jimny', type: 'SUV' },
    ],
  },
  {
    brand: 'Hyundai',
    models: [
      { name: 'i10', type: 'Hatchback' },
      { name: 'i20', type: 'Hatchback' },
      { name: 'Santro', type: 'Hatchback' },
      { name: 'Aura', type: 'Sedan' },
      { name: 'Verna', type: 'Sedan' },
      { name: 'Venue', type: 'SUV' },
      { name: 'Creta', type: 'SUV' },
      { name: 'Alcazar', type: 'SUV' },
      { name: 'Tucson', type: 'SUV' },
      { name: 'Exter', type: 'SUV' },
    ],
  },
  {
    brand: 'Tata',
    models: [
      { name: 'Tiago', type: 'Hatchback' },
      { name: 'Altroz', type: 'Hatchback' },
      { name: 'Tigor', type: 'Sedan' },
      { name: 'Punch', type: 'SUV' },
      { name: 'Nexon', type: 'SUV' },
      { name: 'Harrier', type: 'SUV' },
      { name: 'Safari', type: 'SUV' },
      { name: 'Tiago EV', type: 'Hatchback' },
      { name: 'Nexon EV', type: 'SUV' },
    ],
  },
  {
    brand: 'Mahindra',
    models: [
      { name: 'XUV300', type: 'SUV' },
      { name: 'XUV400', type: 'SUV' },
      { name: 'XUV700', type: 'SUV' },
      { name: 'Scorpio', type: 'SUV' },
      { name: 'Scorpio N', type: 'SUV' },
      { name: 'Thar', type: 'SUV' },
      { name: 'Bolero', type: 'SUV' },
      { name: 'Marazzo', type: 'SUV' },
    ],
  },
  {
    brand: 'Honda',
    models: [
      { name: 'Amaze', type: 'Sedan' },
      { name: 'City', type: 'Sedan' },
      { name: 'Elevate', type: 'SUV' },
      { name: 'Jazz', type: 'Hatchback' },
    ],
  },
  {
    brand: 'Toyota',
    models: [
      { name: 'Glanza', type: 'Hatchback' },
      { name: 'Urban Cruiser Hyryder', type: 'SUV' },
      { name: 'Fortuner', type: 'SUV' },
      { name: 'Innova Crysta', type: 'SUV' },
      { name: 'Innova Hycross', type: 'SUV' },
      { name: 'Hilux', type: 'SUV' },
      { name: 'Camry', type: 'Sedan' },
    ],
  },
];

/**
 * Get all unique brands
 * @returns {Array<string>} Array of brand names
 */
export const getBrands = () => {
  return vehicleData.map((vehicle) => vehicle.brand);
};

/**
 * Get models for a specific brand
 * @param {string} brand - Brand name
 * @returns {Array<{name: string, type: string}>} Array of models with types
 */
export const getModelsByBrand = (brand) => {
  const vehicleBrand = vehicleData.find((v) => v.brand === brand);
  return vehicleBrand ? vehicleBrand.models : [];
};

/**
 * Get vehicle type for a specific brand and model
 * @param {string} brand - Brand name
 * @param {string} modelName - Model name
 * @returns {string|null} Vehicle type (Hatchback/Sedan/SUV) or null if not found
 */
export const getVehicleType = (brand, modelName) => {
  const vehicleBrand = vehicleData.find((v) => v.brand === brand);
  if (!vehicleBrand) return null;
  
  const model = vehicleBrand.models.find((m) => m.name === modelName);
  return model ? model.type : null;
};

/**
 * Get all vehicle types
 * @returns {Array<string>} Array of vehicle types
 */
export const getVehicleTypes = () => {
  return ['Hatchback', 'Sedan', 'SUV'];
};

export default vehicleData;

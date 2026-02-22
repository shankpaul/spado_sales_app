import { Car } from 'lucide-react';

/**
 * VehicleIcon Component
 * Displays vehicle-specific SVG icons based on vehicle type
 * Vehicle types: hatchback, sedan, suv, luxury
 */
const VehicleIcon = ({ vehicleType, className = '', size = 32 }) => {
  // Normalize vehicle type to lowercase
  const type = vehicleType?.toLowerCase();

  // Define available vehicle types with icons
  const vehicleIcons = {
    hatchback: '/hatchback.svg',
    sedan: '/sedan.svg',
    suv: '/suv.svg',
    luxury: '/luxury.svg',
  };

  // Get the icon path or use a fallback
  const iconPath = vehicleIcons[type];

  // If no valid type, return a default car icon
  if (!iconPath) {
    return (
      <Car 
        className={className} 
        style={{ width: size, height: size }} 
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        WebkitMaskImage: `url(${iconPath})`,
        maskImage: `url(${iconPath})`,
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        backgroundColor: 'currentColor',
      }}
      role="img"
      aria-label={`${type} vehicle`}
    />
  );
};

export default VehicleIcon;

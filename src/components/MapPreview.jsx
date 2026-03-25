const MapPreview = ({ lat, lng }) => {
  // Validate and sanitize coordinates to prevent XSS
  const sanitizedLat = typeof lat === 'number' ? lat : parseFloat(lat);
  const sanitizedLng = typeof lng === 'number' ? lng : parseFloat(lng);
  
  // Check if coordinates are valid numbers
  if (isNaN(sanitizedLat) || isNaN(sanitizedLng)) {
    return (
      <div className="flex items-center justify-center h-[150px] bg-gray-100 rounded-lg">
        <p className="text-sm text-gray-500">Invalid coordinates</p>
      </div>
    );
  }
  
  // Additional validation: check if coordinates are within valid range
  if (sanitizedLat < -90 || sanitizedLat > 90 || sanitizedLng < -180 || sanitizedLng > 180) {
    return (
      <div className="flex items-center justify-center h-[150px] bg-gray-100 rounded-lg">
        <p className="text-sm text-gray-500">Invalid coordinate range</p>
      </div>
    );
  }
  
  return (
     <iframe
    width="100%"
    height="150"
    loading="lazy"
    style={{ border: 0, borderRadius: "8px" }}
    src={`https://www.google.com/maps?q=${sanitizedLat},${sanitizedLng}&z=16&output=embed`}
  />
  );
};

export default MapPreview;

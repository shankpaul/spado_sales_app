const MapPreview = ({ lat, lng }) => {
  return (
     <iframe
    width="100%"
    height="150"
    loading="lazy"
    style={{ border: 0, borderRadius: "8px" }}
    src={`https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`}
  />
  );
};

export default MapPreview;

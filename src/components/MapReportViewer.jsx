import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Button } from './ui/button';

const getStatusColor = (status, type) => {
  if (type === 'orders') {
    switch (status) {
      case 'completed': return '#10b981'; // Emerald
      case 'confirmed': return '#2563eb'; // Blue
      case 'in_progress': return '#8b5cf6'; // Purple
      case 'tentative': return '#f59e0b'; // Amber
      case 'cancelled': return '#ef4444'; // Red
      default: return '#6b7280';
    }
  } else {
    switch (status) {
      case 'converted': return '#059669'; // Emerald
      case 'interested': return '#4f46e5'; // Indigo
      case 'contacted': return '#2563eb'; // Blue
      case 'needs_followup': return '#d97706'; // Amber
      case 'new': return '#0284c7'; // Sky
      case 'lost': return '#e11d48'; // Rose
      default: return '#6b7280';
    }
  }
};

const createCustomPinIcon = (color) => {
  const svgHtml = `
    <div style="position: relative; width: 30px; height: 38px; display: flex; align-items: center; justify-content: center;">
      <svg width="30" height="38" viewBox="0 0 30 38" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 0C6.71573 0 0 6.71573 0 15C0 26.25 15 38 15 38C15 38 30 26.25 30 15C30 6.71573 23.2843 0 15 0Z" fill="${color}" fill-opacity="0.95" stroke="#ffffff" stroke-width="2"/>
        <circle cx="15" cy="14" r="6" fill="#ffffff"/>
      </svg>
    </div>
  `;
  return L.divIcon({
    html: svgHtml,
    className: 'custom-map-pin',
    iconSize: [30, 38],
    iconAnchor: [15, 38],
    popupAnchor: [0, -34],
  });
};

const MapReportViewer = ({
  points = [],
  viewMode = 'markers', // 'markers', 'heatmap', 'both'
  reportType = 'orders', // 'orders' or 'enquiries'
  onNavigateDetail = null,
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerGroupRef = useRef(null);
  const heatmapLayerGroupRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default center: Cochin / Kerala (9.9312, 76.2673)
      const map = L.map(mapContainerRef.current, {
        center: [9.9312, 76.2673],
        zoom: 11,
        zoomControl: true,
      });

      // Free OpenStreetMap Tile Layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      markersLayerGroupRef.current = L.layerGroup().addTo(map);
      heatmapLayerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Handle Fullscreen Resize
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    if (mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current.invalidateSize();
      }, 200);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  // Update Layers & Bounds when points or viewMode change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const markersGroup = markersLayerGroupRef.current;
    const heatmapGroup = heatmapLayerGroupRef.current;

    markersGroup.clearLayers();
    heatmapGroup.clearLayers();

    const validPoints = points.filter(
      (p) => typeof p.latitude === 'number' && typeof p.longitude === 'number' && p.latitude !== 0 && p.longitude !== 0
    );

    if (validPoints.length === 0) {
      map.setView([9.9312, 76.2673], 11);
      return;
    }

    const bounds = L.latLngBounds();

    // Render Markers
    if (viewMode === 'markers' || viewMode === 'both') {
      validPoints.forEach((point) => {
        const latLng = [point.latitude, point.longitude];
        bounds.extend(latLng);

        const pinColor = getStatusColor(point.status, reportType);
        const icon = createCustomPinIcon(pinColor);

        let popupContent = '';
        if (reportType === 'orders') {
          popupContent = `
            <div style="font-family: system-ui, sans-serif; min-width: 200px; padding: 4px;">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
                <span style="font-weight: 700; color: #1e293b; font-size: 14px;">#${point.order_number || point.id}</span>
                <span style="background-color: ${pinColor}20; color: ${pinColor}; border: 1px solid ${pinColor}40; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; text-transform: uppercase;">
                  ${point.status}
                </span>
              </div>
              <div style="font-size: 13px; font-weight: 600; color: #0f172a; margin-bottom: 2px;">${point.customer_name}</div>
              <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">📞 ${point.contact_phone || 'N/A'}</div>
              <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">📍 ${point.area}${point.city ? ', ' + point.city : ''}</div>
              <div style="display: flex; align-items: center; justify-content: space-between; pt: 6px; border-top: 1px solid #e2e8f0; margin-top: 6px; font-size: 12px;">
                <span style="font-weight: 800; color: #059669;">₹${point.total_amount || 0}</span>
                <span style="color: #64748b; font-size: 10px;">${point.booking_date ? new Date(point.booking_date).toLocaleDateString() : ''}</span>
              </div>
              ${
                onNavigateDetail
                  ? `<button id="popup-btn-${point.id}" style="width: 100%; margin-top: 8px; background: #2563eb; color: #ffffff; border: none; padding: 5px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;">View Order Details</button>`
                  : ''
              }
            </div>
          `;
        } else {
          popupContent = `
            <div style="font-family: system-ui, sans-serif; min-width: 200px; padding: 4px;">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
                <span style="font-weight: 700; color: #1e293b; font-size: 13px;">Enquiry #${point.id}</span>
                <span style="background-color: ${pinColor}20; color: ${pinColor}; border: 1px solid ${pinColor}40; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; text-transform: uppercase;">
                  ${point.status}
                </span>
              </div>
              <div style="font-size: 13px; font-weight: 600; color: #0f172a; margin-bottom: 2px;">${point.contact_name}</div>
              <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">📞 ${point.contact_phone || 'N/A'}</div>
              <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">📍 ${point.area}${point.city ? ', ' + point.city : ''}</div>
              <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">Source: <strong style="color: #334155;">${point.source || 'Direct'}</strong></div>
              ${
                onNavigateDetail
                  ? `<button id="popup-btn-${point.id}" style="width: 100%; margin-top: 6px; background: #2563eb; color: #ffffff; border: none; padding: 5px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;">View Enquiry Details</button>`
                  : ''
              }
            </div>
          `;
        }

        const marker = L.marker(latLng, { icon }).bindPopup(popupContent);

        if (onNavigateDetail) {
          marker.on('popupopen', () => {
            const btn = document.getElementById(`popup-btn-${point.id}`);
            if (btn) {
              btn.onclick = () => onNavigateDetail(point.id);
            }
          });
        }

        markersGroup.addLayer(marker);
      });
    }

    // Render Heatmap (Canvas Density Heat Circles)
    if (viewMode === 'heatmap' || viewMode === 'both') {
      validPoints.forEach((point) => {
        const latLng = [point.latitude, point.longitude];
        bounds.extend(latLng);

        // Density Heat Circle
        const circleColor = reportType === 'orders' ? '#f59e0b' : '#3b82f6';
        const heatCircle = L.circleMarker(latLng, {
          radius: 24,
          fillColor: circleColor,
          fillOpacity: 0.35,
          stroke: true,
          color: circleColor,
          weight: 1,
          opacity: 0.6,
        });

        const innerDot = L.circleMarker(latLng, {
          radius: 6,
          fillColor: '#ef4444',
          fillOpacity: 0.9,
          stroke: true,
          color: '#ffffff',
          weight: 2,
        });

        heatmapGroup.addLayer(heatCircle);
        heatmapGroup.addLayer(innerDot);
      });
    }

    // Adjust map zoom & bounds
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [points, viewMode, reportType, onNavigateDetail]);

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 w-screen h-screen bg-background transition-all duration-300'
          : 'relative w-full h-[480px] rounded-xl overflow-hidden border border-border shadow-sm transition-all duration-300'
      }
    >
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      <div className="absolute top-3 right-3 z-[1000]">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="shadow-md bg-white/90 hover:bg-white text-slate-800 border border-slate-200 backdrop-blur-sm gap-1.5 text-xs font-semibold"
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="h-4 w-4 text-slate-700" />
              Exit Fullscreen
            </>
          ) : (
            <>
              <Maximize2 className="h-4 w-4 text-slate-700" />
              Fullscreen
            </>
          )}
        </Button>
      </div>
      <style>{`
        .custom-map-pin {
          background: none !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
};

export default MapReportViewer;

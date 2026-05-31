import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Marker } from '@/types/api';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MapComponentProps {
  center: [number, number];
  zoom: number;
  markers: Marker[];
  onMarkerClick?: (marker: Marker) => void;
  onMapClick?: (lat: number, lng: number) => void;
}

export default function MapComponent({ center, zoom, markers, onMarkerClick, onMapClick }: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView(center, zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Add click handler
    if (onMapClick) {
      map.on('click', (e) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    }

    mapRef.current = map;
    markersLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [center, zoom, onMapClick]);

  // Update markers (without clustering)
  useEffect(() => {
    if (!markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    markers.forEach((marker) => {
      const isRisk = ['abuse', 'poison', 'trap', 'theft', 'suspicious_vehicle'].includes(marker.category);

      const icon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div class="relative">
            <div class="w-8 h-8 rounded-full ${
              isRisk ? 'bg-red-500' : 'bg-green-500'
            } border-2 border-white shadow-lg flex items-center justify-center text-white text-lg">
              ${isRisk ? '⚠️' : '💚'}
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      const leafletMarker = L.marker([marker.latitude, marker.longitude], { icon })
        .bindPopup(
          `
          <div class="p-2">
            <h3 class="font-bold text-sm mb-1">${marker.title}</h3>
            <p class="text-xs text-gray-600 mb-2">${marker.address}</p>
            <p class="text-xs">
              <span class="font-semibold">状态:</span> ${marker.consensus_status}
            </p>
            <p class="text-xs">
              <span class="font-semibold">置信度:</span> ${(marker.confidence_score * 100).toFixed(0)}%
            </p>
          </div>
        `,
          { maxWidth: 250 }
        )
        .on('click', () => {
          if (onMarkerClick) {
            onMarkerClick(marker);
          }
        });

      markersLayerRef.current?.addLayer(leafletMarker);
    });
  }, [markers, onMarkerClick]);

  return <div ref={mapContainerRef} className="w-full h-full rounded-lg" />;
}

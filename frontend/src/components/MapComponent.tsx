import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Marker } from '@/types/api';
import { getMarkerCategoryTone, isRiskCategory } from '@/utils/markerCategories';

// Fix Leaflet default icon issue
const defaultIconPrototype = L.Icon.Default.prototype as L.Icon.Default & {
  _getIconUrl?: string;
};
delete defaultIconPrototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MapComponentProps {
  center: [number, number];
  zoom: number;
  markers: Marker[];
  theme?: 'dark' | 'light';
  onMarkerClick?: (marker: Marker) => void;
  onMapClick?: (lat: number, lng: number) => void;
}

const tileLayers = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap contributors © CARTO',
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap contributors © CARTO',
  },
};

export default function MapComponent({
  center,
  zoom,
  markers,
  theme = 'dark',
  onMarkerClick,
  onMapClick,
}: MapComponentProps) {
  const { t } = useTranslation();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const initialCenterRef = useRef(center);
  const initialZoomRef = useRef(zoom);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
    }).setView(initialCenterRef.current, initialZoomRef.current);

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
  }, [onMapClick]);

  useEffect(() => {
    if (!mapRef.current) return;

    mapRef.current.setView(center, zoom);
  }, [center, zoom]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }

    const layerConfig = tileLayers[theme];
    tileLayerRef.current = L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution,
      maxZoom: 19,
    }).addTo(mapRef.current);
  }, [theme]);

  // Update markers (without clustering)
  useEffect(() => {
    if (!markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    markers.forEach((marker) => {
      const isRisk = isRiskCategory(marker.category);
      const tone = getMarkerCategoryTone(marker.category);

      const icon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div class="firefly-marker ${isRisk ? 'firefly-marker-risk' : 'firefly-marker-help'}" style="background-color: ${tone.markerColor}">
            <span>${tone.icon}</span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      const leafletMarker = L.marker([marker.latitude, marker.longitude], { icon })
        .bindPopup(
          `
          <div style="min-width: 190px; padding: 12px;">
            <h3 style="margin: 0 0 6px; font-size: 14px; font-weight: 700; color: var(--color-text-strong);">${marker.title}</h3>
            <p style="margin: 0 0 10px; font-size: 12px; color: var(--color-muted);">${marker.address}</p>
            <p style="margin: 0 0 4px; font-size: 12px;">
              <span style="font-weight: 700;">${t('marker.status')}:</span> ${marker.consensus_status}
            </p>
            <p style="margin: 0; font-size: 12px;">
              <span style="font-weight: 700;">${t('mapHome.confidence')}:</span> ${(marker.confidence_score * 100).toFixed(0)}%
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
  }, [markers, onMarkerClick, t]);

  return <div ref={mapContainerRef} className="h-full w-full" />;
}

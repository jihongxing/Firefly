import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { useAppStore } from '@/store/appStore';
import MapComponent from '@/components/MapComponent';
import MarkerList from '@/components/MarkerList';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import type { Marker } from '@/types/api';

export default function MapPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { config, currentLocale } = useAppStore();

  const [mapCenter, setMapCenter] = useState<[number, number]>([39.9042, 116.4074]);
  const [searchRadius, setSearchRadius] = useState(3000);
  const [showList, setShowList] = useState(false);

  const {
    data: markers = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['markers', mapCenter[0], mapCenter[1], searchRadius, currentLocale],
    queryFn: () =>
      apiClient.getMarkers({
        lat: mapCenter[0],
        lng: mapCenter[1],
        radius: searchRadius,
        lang: currentLocale,
        limit: 50,
      }),
    enabled: !!config,
  });

  useEffect(() => {
    if (config?.map_config) {
      setMapCenter([config.map_config.default_center.lat, config.map_config.default_center.lng]);
      setSearchRadius(config.map_config.default_radius);
    }
  }, [config]);

  const handleMarkerClick = (marker: Marker) => {
    navigate(`/markers/${marker.id}`);
  };

  if (!config) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text={t('common.loading')} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Mobile-first Header */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate">{t('app.title')}</h1>
              <p className="text-xs text-gray-600 truncate">{t('app.subtitle')}</p>
            </div>
            <Link
              to="/submit"
              className="ml-3 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium whitespace-nowrap"
            >
              + {t('marker.submit')}
            </Link>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 text-sm">
            <select
              value={searchRadius}
              onChange={(e) => setSearchRadius(Number(e.target.value))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value={1000}>1 km</option>
              <option value={3000}>3 km</option>
              <option value={5000}>5 km</option>
              <option value={10000}>10 km</option>
            </select>
            <button
              onClick={() => refetch()}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition whitespace-nowrap"
            >
              🔄
            </button>
            <button
              onClick={() => setShowList(!showList)}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition whitespace-nowrap"
            >
              {showList ? '🗺️' : '📋'} {markers.length}
            </button>
          </div>

          {/* Language Switcher - Mobile Optimized */}
          <div className="mt-3 flex justify-center">
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative">
        {/* Map View */}
        <div className={`absolute inset-0 ${showList ? 'hidden' : 'block'}`}>
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <LoadingSpinner size="lg" text={t('common.loading')} />
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center p-6">
              <ErrorMessage
                message={(error as Error).message || t('common.error')}
                onRetry={() => refetch()}
              />
            </div>
          ) : (
            <MapComponent
              center={mapCenter}
              zoom={config.map_config.default_zoom}
              markers={markers}
              onMarkerClick={handleMarkerClick}
            />
          )}
        </div>

        {/* List View */}
        <div className={`absolute inset-0 bg-gray-50 overflow-y-auto ${showList ? 'block' : 'hidden'}`}>
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">
              {t('marker.nearby')} ({markers.length})
            </h2>
            <MarkerList
              markers={markers}
              onMarkerClick={handleMarkerClick}
              isLoading={isLoading}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

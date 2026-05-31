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

  const handleMapClick = (lat: number, lng: number) => {
    console.log('Map clicked:', lat, lng);
  };

  if (!config) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text={t('common.loading')} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-4 px-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('app.title')}</h1>
              <p className="text-sm text-gray-600">{t('app.subtitle')}</p>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <Link
                to="/submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                {t('marker.submit')}
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <label className="text-gray-600">搜索半径:</label>
              <select
                value={searchRadius}
                onChange={(e) => setSearchRadius(Number(e.target.value))}
                className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value={1000}>1 km</option>
                <option value={3000}>3 km</option>
                <option value={5000}>5 km</option>
                <option value={10000}>10 km</option>
              </select>
            </div>
            <button
              onClick={() => refetch()}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              🔄 刷新
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="h-[600px]">
                {isLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <LoadingSpinner size="lg" text="加载地图中..." />
                  </div>
                ) : error ? (
                  <div className="h-full flex items-center justify-center p-6">
                    <ErrorMessage
                      message={(error as Error).message || '加载失败'}
                      onRetry={() => refetch()}
                    />
                  </div>
                ) : (
                  <MapComponent
                    center={mapCenter}
                    zoom={config.map_config.default_zoom}
                    markers={markers}
                    onMarkerClick={handleMarkerClick}
                    onMapClick={handleMapClick}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Marker List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-semibold mb-4">
                附近的标记 ({markers.length})
              </h2>
              <div className="max-h-[540px] overflow-y-auto">
                <MarkerList
                  markers={markers}
                  onMarkerClick={handleMarkerClick}
                  isLoading={isLoading}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

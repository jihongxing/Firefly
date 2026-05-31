import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { useAppStore } from '@/store/appStore';
import MapComponent from '@/components/MapComponent';
import MarkerList from '@/components/MarkerList';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import type { Marker } from '@/types/api';

export default function MapPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { config, currentLocale, setLocale } = useAppStore();

  const [mapCenter, setMapCenter] = useState<[number, number]>([39.9042, 116.4074]);
  const [searchRadius, setSearchRadius] = useState(3000);
  const [showList, setShowList] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

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

  const handleLanguageChange = (locale: string) => {
    setLocale(locale);
    i18n.changeLanguage(locale);
    localStorage.setItem('locale', locale);
  };

  const handleApplyFilters = () => {
    setShowFilterPanel(false);
    refetch();
  };

  if (!config) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text={t('common.loading')} />
      </div>
    );
  }

  const languages = [
    { code: 'zh-CN', label: '中文', flag: '🇨🇳' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative">
      {/* Minimal Header - Only App Title */}
      <header className="bg-white shadow-sm">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold text-gray-900">{t('app.title')}</h1>
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
        <div className={`absolute inset-0 bg-gray-50 overflow-y-auto pb-20 ${showList ? 'block' : 'hidden'}`}>
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">
              {t('marker.nearby')} ({markers.length})
            </h2>
            <div className="space-y-3">
              {markers.map((marker) => (
                <div
                  key={marker.id}
                  onClick={() => handleMarkerClick(marker)}
                  className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 flex-1">{marker.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      ['abuse', 'poison', 'trap'].includes(marker.category)
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {t(`marker.categories.${marker.category}`)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{marker.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>📍 {marker.address}</span>
                    {marker.distance_m !== undefined && (
                      <span className="font-medium">
                        {marker.distance_m < 1000
                          ? `${marker.distance_m}m`
                          : `${(marker.distance_m / 1000).toFixed(1)}km`}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Floating Action Buttons */}
      <div className="fixed top-20 right-4 z-30 flex flex-col gap-3">
        {/* Filter Button */}
        <button
          onClick={() => setShowFilterPanel(true)}
          className="w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:shadow-xl transition"
        >
          ⚙️
        </button>
      </div>

      <div className="fixed bottom-6 right-4 z-30">
        {/* Submit Button */}
        <Link
          to="/submit"
          className="w-16 h-16 bg-blue-600 rounded-full shadow-lg flex items-center justify-center text-3xl hover:bg-blue-700 hover:shadow-xl transition"
        >
          ➕
        </Link>
      </div>

      {/* Filter Panel Overlay */}
      {showFilterPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-end" onClick={() => setShowFilterPanel(false)}>
          <div
            className="bg-white rounded-t-3xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">筛选设置</h2>
                <button
                  onClick={() => setShowFilterPanel(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* Search Radius */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {t('marker.searchRadius')}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1000, 3000, 5000, 10000].map((radius) => (
                    <button
                      key={radius}
                      onClick={() => setSearchRadius(radius)}
                      className={`px-4 py-3 rounded-lg text-sm font-medium transition ${
                        searchRadius === radius
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {radius / 1000} km
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  语言 / Language
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`px-4 py-3 rounded-lg text-sm font-medium transition ${
                        currentLocale === lang.code
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span className="mr-1">{lang.flag}</span>
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* View Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  显示模式
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowList(false)}
                    className={`px-4 py-3 rounded-lg text-sm font-medium transition ${
                      !showList
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    🗺️ 地图视图
                  </button>
                  <button
                    onClick={() => setShowList(true)}
                    className={`px-4 py-3 rounded-lg text-sm font-medium transition ${
                      showList
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    📋 列表视图
                  </button>
                </div>
              </div>

              {/* Apply Button */}
              <button
                onClick={handleApplyFilters}
                className="w-full bg-blue-600 text-white py-4 rounded-lg font-medium hover:bg-blue-700 transition"
              >
                应用设置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

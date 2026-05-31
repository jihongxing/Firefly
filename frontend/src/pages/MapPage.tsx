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
      <div className="fixed top-20 right-4 flex flex-col gap-3" style={{ zIndex: 1000 }}>
        {/* Filter Button */}
        <button
          onClick={() => setShowFilterPanel(true)}
          className="w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:shadow-xl transition border-2 border-gray-200"
        >
          ⚙️
        </button>
      </div>

      <div className="fixed bottom-6 right-4" style={{ zIndex: 1000 }}>
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
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end"
          style={{ zIndex: 2000 }}
          onClick={() => setShowFilterPanel(false)}
        >
          <div
            className="bg-white rounded-t-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
            </div>

            <div className="px-6 pb-8 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">筛选设置</h2>
                  <p className="text-sm text-gray-500 mt-1">自定义地图显示</p>
                </div>
                <button
                  onClick={() => setShowFilterPanel(false)}
                  className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
                >
                  <span className="text-xl text-gray-600">✕</span>
                </button>
              </div>

              {/* Search Radius */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">📏</span>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900">
                      {t('marker.searchRadius')}
                    </label>
                    <p className="text-xs text-gray-500">选择搜索范围</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[1000, 3000, 5000, 10000].map((radius) => (
                    <button
                      key={radius}
                      onClick={() => setSearchRadius(radius)}
                      className={`relative px-4 py-4 rounded-2xl text-sm font-semibold transition-all ${
                        searchRadius === radius
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:scale-105'
                      }`}
                    >
                      <div className="text-lg font-bold">{radius / 1000}</div>
                      <div className="text-xs opacity-80">km</div>
                      {searchRadius === radius && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">🌍</span>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900">
                      语言 / Language
                    </label>
                    <p className="text-xs text-gray-500">选择界面语言</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`relative px-4 py-4 rounded-2xl text-sm font-semibold transition-all ${
                        currentLocale === lang.code
                          ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30 scale-105'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:scale-105'
                      }`}
                    >
                      <div className="text-2xl mb-1">{lang.flag}</div>
                      <div className="text-xs">{lang.label}</div>
                      {currentLocale === lang.code && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* View Toggle */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">👁️</span>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900">
                      显示模式
                    </label>
                    <p className="text-xs text-gray-500">切换地图或列表</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowList(false)}
                    className={`relative px-6 py-5 rounded-2xl font-semibold transition-all ${
                      !showList
                        ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30 scale-105'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:scale-105'
                    }`}
                  >
                    <div className="text-3xl mb-2">🗺️</div>
                    <div className="text-sm">地图视图</div>
                    {!showList && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </button>
                  <button
                    onClick={() => setShowList(true)}
                    className={`relative px-6 py-5 rounded-2xl font-semibold transition-all ${
                      showList
                        ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30 scale-105'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:scale-105'
                    }`}
                  >
                    <div className="text-3xl mb-2">📋</div>
                    <div className="text-sm">列表视图</div>
                    {showList && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* Apply Button */}
              <button
                onClick={handleApplyFilters}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-5 rounded-2xl font-bold text-lg hover:shadow-xl hover:shadow-blue-500/30 transition-all active:scale-95"
              >
                ✓ 应用设置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

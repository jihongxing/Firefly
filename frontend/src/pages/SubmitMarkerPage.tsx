import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { useAppStore } from '@/store/appStore';
import MapComponent from '@/components/MapComponent';
import type { SubmitMarkerInput } from '@/types/api';

export default function SubmitMarkerPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { config, currentLocale } = useAppStore();
  const [formData, setFormData] = useState<SubmitMarkerInput>({
    category: 'abuse',
    title: '',
    latitude: 39.9042,
    longitude: 116.4074,
    address: '',
    description: '',
    sourceLocale: currentLocale,
  });
  const [showMap, setShowMap] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, sourceLocale: currentLocale }));
  }, [currentLocale]);

  const submitMutation = useMutation({
    mutationFn: (data: SubmitMarkerInput) => apiClient.submitMarker(data),
    onSuccess: (result) => {
      alert(`${t('common.success')}！ID: ${result.id}`);
      navigate('/');
    },
    onError: (error: Error) => {
      alert(`${t('common.error')}: ${error.message}`);
    },
  });

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('您的浏览器不支持地理定位');
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData({
          ...formData,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setIsGettingLocation(false);
        alert('位置获取成功！');
      },
      (error) => {
        setIsGettingLocation(false);
        alert(`获取位置失败: ${error.message}`);
      }
    );
  };

  const handleMapClick = (lat: number, lng: number) => {
    setFormData({ ...formData, latitude: lat, longitude: lng });
    setShowMap(false);
    alert('位置已选择！');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMutation.mutate(formData);
  };

  const allCategories = config
    ? [...config.marker_categories.risk, ...config.marker_categories.help]
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-first Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-4 py-3">
          <Link to="/" className="text-blue-600 hover:underline text-sm inline-flex items-center mb-2">
            ← {t('nav.backToMap')}
          </Link>
          <h1 className="text-xl font-bold text-gray-900">{t('marker.submit')}</h1>
        </div>
      </header>

      <main className="px-4 py-4 pb-20">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('marker.category')}
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              required
            >
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {t(`marker.categories.${cat}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('marker.title')}
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              required
              maxLength={200}
              placeholder="简短描述事件"
            />
          </div>

          {/* Location Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('marker.location')}
            </label>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={isGettingLocation}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:bg-gray-400"
                >
                  {isGettingLocation ? t('common.loading') : '📍 ' + t('marker.getLocation')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowMap(!showMap)}
                  className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                >
                  🗺️ {showMap ? t('common.close') : t('marker.clickMapToSelect')}
                </button>
              </div>

              {/* Map Picker */}
              {showMap && (
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <div className="h-64">
                    <MapComponent
                      center={[formData.latitude, formData.longitude]}
                      zoom={15}
                      markers={[]}
                      onMapClick={handleMapClick}
                    />
                  </div>
                  <div className="bg-blue-50 p-2 text-xs text-blue-700 text-center">
                    {t('marker.clickMapToSelect')}
                  </div>
                </div>
              )}

              {/* Coordinates Display */}
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">{t('marker.latitude')}:</span>
                  <span className="font-mono font-medium">{formData.latitude.toFixed(6)}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-gray-600">{t('marker.longitude')}:</span>
                  <span className="font-mono font-medium">{formData.longitude.toFixed(6)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('marker.address')}
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              required
              maxLength={500}
              placeholder="详细地址或地标"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('marker.description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              rows={4}
              required
              maxLength={2000}
              placeholder="详细描述事件情况"
            />
          </div>

          {/* Contact Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('marker.contactInfoOptional')}
            </label>
            <input
              type="text"
              value={formData.contactInfo || ''}
              onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              maxLength={500}
              placeholder="微信、电话等"
            />
          </div>

          {/* Submit Buttons */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 space-y-2">
            <button
              type="submit"
              disabled={submitMutation.isPending}
              className="w-full bg-blue-600 text-white px-6 py-4 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 font-medium text-base"
            >
              {submitMutation.isPending ? t('common.loading') : t('common.submit')}
            </button>
            <Link
              to="/"
              className="block w-full bg-gray-200 text-gray-700 px-6 py-4 rounded-lg hover:bg-gray-300 transition text-center font-medium text-base"
            >
              {t('common.cancel')}
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}

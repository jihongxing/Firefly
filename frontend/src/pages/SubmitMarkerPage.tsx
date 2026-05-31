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
      navigate('/', { state: { message: `提交成功！ID: ${result.id}` } });
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
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMutation.mutate(formData);
  };

  const allCategories = config
    ? [...config.marker_categories.risk, ...config.marker_categories.help]
    : [];

  const riskCategories = config?.marker_categories.risk || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Modern Header with Glassmorphism */}
      <header className="sticky top-0 z-10 backdrop-blur-lg bg-white/80 border-b border-gray-200/50">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
            >
              <span className="text-xl">←</span>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{t('marker.submit')}</h1>
              <p className="text-xs text-gray-500">填写标记信息</p>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 pb-32">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
          {/* Category Selection - Card Style */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              📌 {t('marker.category')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {allCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFormData({ ...formData, category: cat })}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    formData.category === cat
                      ? riskCategories.includes(cat)
                        ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30'
                        : 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {t(`marker.categories.${cat}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Title Input */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              ✏️ {t('marker.title')}
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition text-base"
              required
              maxLength={200}
              placeholder="简短描述事件..."
            />
          </div>

          {/* Location Picker - Modern Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              📍 {t('marker.location')}
            </label>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={isGettingLocation}
                className="px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGettingLocation ? '定位中...' : '🎯 自动定位'}
              </button>
              <button
                type="button"
                onClick={() => setShowMap(!showMap)}
                className="px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/30 transition-all"
              >
                {showMap ? '✓ 完成' : '🗺️ 地图选点'}
              </button>
            </div>

            {showMap && (
              <div className="mb-4 rounded-xl overflow-hidden border-2 border-gray-100">
                <div className="h-64">
                  <MapComponent
                    center={[formData.latitude, formData.longitude]}
                    zoom={15}
                    markers={[]}
                    onMapClick={handleMapClick}
                  />
                </div>
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 text-xs text-gray-700 text-center font-medium">
                  点击地图选择位置
                </div>
              </div>
            )}

            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600 font-medium">纬度</span>
                <span className="font-mono font-semibold text-gray-900">{formData.latitude.toFixed(6)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 font-medium">经度</span>
                <span className="font-mono font-semibold text-gray-900">{formData.longitude.toFixed(6)}</span>
              </div>
            </div>
          </div>

          {/* Address Input */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              🏠 {t('marker.address')}
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition text-base"
              required
              maxLength={500}
              placeholder="详细地址或地标..."
            />
          </div>

          {/* Description Textarea */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              📝 {t('marker.description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition text-base resize-none"
              rows={4}
              required
              maxLength={2000}
              placeholder="详细描述事件情况..."
            />
          </div>

          {/* Contact Info */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              📞 {t('marker.contactInfoOptional')}
            </label>
            <input
              type="text"
              value={formData.contactInfo || ''}
              onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition text-base"
              maxLength={500}
              placeholder="微信、电话等（可选）"
            />
          </div>
        </form>
      </main>

      {/* Modern Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200/50 p-4" style={{ zIndex: 100 }}>
        <div className="max-w-2xl mx-auto flex gap-3">
          <Link
            to="/"
            className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition text-center"
          >
            取消
          </Link>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
            className="flex-[2] py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitMutation.isPending ? '提交中...' : '✓ 提交标记'}
          </button>
        </div>
      </div>
    </div>
  );
}

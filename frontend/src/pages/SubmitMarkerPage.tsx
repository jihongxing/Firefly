import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { useAppStore } from '@/store/appStore';
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

  const submitMutation = useMutation({
    mutationFn: (data: SubmitMarkerInput) => apiClient.submitMarker(data),
    onSuccess: (result) => {
      alert(`提交成功！标记 ID: ${result.id}`);
      navigate('/');
    },
    onError: (error: Error) => {
      alert(`提交失败: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMutation.mutate(formData);
  };

  const allCategories = config
    ? [...config.marker_categories.risk, ...config.marker_categories.help]
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-4 px-4">
          <Link to="/" className="text-blue-600 hover:underline mb-2 inline-block">
            ← 返回地图
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{t('marker.submit')}</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto py-6 px-4">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('marker.category')}
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {t(`marker.categories.${cat}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('marker.title')}
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('marker.address')}
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              maxLength={500}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('marker.description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              required
              maxLength={2000}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">纬度</label>
              <input
                type="number"
                step="0.000001"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">经度</label>
              <input
                type="number"
                step="0.000001"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('marker.contactInfo')} (可选)
            </label>
            <input
              type="text"
              value={formData.contactInfo || ''}
              onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={500}
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitMutation.isPending}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
            >
              {submitMutation.isPending ? t('common.loading') : t('common.submit')}
            </button>
            <Link
              to="/"
              className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition text-center"
            >
              {t('common.cancel')}
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}

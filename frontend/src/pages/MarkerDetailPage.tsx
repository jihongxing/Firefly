import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/services/api';
import { useAppStore } from '@/store/appStore';

export default function MarkerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { currentLocale } = useAppStore();

  const { data: marker, isLoading, error } = useQuery({
    queryKey: ['marker', id, currentLocale],
    queryFn: () => apiClient.getMarkerById(Number(id), currentLocale),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">{t('common.loading')}</p>
      </div>
    );
  }

  if (error || !marker) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{t('common.error')}</p>
          <Link to="/" className="text-blue-600 hover:underline">
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-4 px-4">
          <Link to="/" className="text-blue-600 hover:underline mb-2 inline-block">
            ← 返回地图
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{marker.title}</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
              {t(`marker.categories.${marker.category}`)}
            </span>
            {marker.is_translated && (
              <span className="ml-2 inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                已翻译
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-700">地址</h3>
              <p className="text-gray-600">{marker.address}</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700">描述</h3>
              <p className="text-gray-600">{marker.description}</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700">状态</h3>
              <p className="text-gray-600">
                共识状态: {marker.consensus_status} | 置信度: {(marker.confidence_score * 100).toFixed(0)}%
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700">创建时间</h3>
              <p className="text-gray-600">{new Date(marker.created_at).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">社区反馈</h2>
          <p className="text-gray-600">反馈功能将在这里显示</p>
        </div>
      </main>
    </div>
  );
}

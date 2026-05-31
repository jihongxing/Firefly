import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/services/api';
import { useAppStore } from '@/store/appStore';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import FeedbackButtons from '@/components/FeedbackButtons';
import FeedbackSummary from '@/components/FeedbackSummary';

export default function MarkerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { currentLocale } = useAppStore();

  const {
    data: marker,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['marker', id, currentLocale],
    queryFn: () => apiClient.getMarkerById(Number(id), currentLocale),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text={t('common.loading')} />
      </div>
    );
  }

  if (error || !marker) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full p-6">
          <ErrorMessage
            message={(error as Error)?.message || t('common.error')}
            onRetry={() => refetch()}
          />
          <Link to="/" className="block text-center mt-4 text-blue-600 hover:underline">
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

      <main className="max-w-4xl mx-auto py-6 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Marker Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="mb-4 flex items-center gap-2">
                <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {t(`marker.categories.${marker.category}`)}
                </span>
                {marker.is_translated && (
                  <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                    已翻译 ({marker.source_locale} → {marker.locale})
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-1">📍 地址</h3>
                  <p className="text-gray-600">{marker.address}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 mb-1">📝 描述</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{marker.description}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 mb-1">📊 状态</h3>
                  <div className="flex items-center gap-4 text-sm">
                    <span
                      className={`px-3 py-1 rounded-full ${
                        marker.consensus_status === 'verified'
                          ? 'bg-blue-100 text-blue-800'
                          : marker.consensus_status === 'disputed'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      共识: {marker.consensus_status}
                    </span>
                    <span className="text-gray-600">
                      置信度: {(marker.confidence_score * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 mb-1">🕐 创建时间</h3>
                  <p className="text-gray-600">{new Date(marker.created_at).toLocaleString('zh-CN')}</p>
                </div>

                {marker.contact_info && (
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-1">📞 联系方式</h3>
                    <p className="text-gray-600">{marker.contact_info}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Feedback Buttons */}
            <div className="bg-white rounded-lg shadow p-6">
              <FeedbackButtons markerId={marker.id} onSuccess={() => refetch()} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Feedback Summary */}
            <FeedbackSummary markerId={marker.id} />

            {/* Map Preview */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-900 mb-3">位置</h3>
              <div className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
                <p className="text-gray-500 text-sm">地图预览</p>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                坐标: {marker.latitude.toFixed(4)}, {marker.longitude.toFixed(4)}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

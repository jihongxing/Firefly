import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/services/api';
import { useAppStore } from '@/store/appStore';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import FeedbackButtons from '@/components/FeedbackButtons';
import FeedbackSummary from '@/components/FeedbackSummary';
import ReportModal from '@/components/ReportModal';
import { getMarkerCategoryTone, isAdoptionCategory } from '@/utils/markerCategories';

export default function MarkerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { currentLocale } = useAppStore();
  const [showReportModal, setShowReportModal] = useState(false);

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <ErrorMessage
            message={(error as Error)?.message || t('common.error')}
            onRetry={() => refetch()}
          />
          <Link to="/" className="block text-center mt-4 text-blue-600 hover:underline">
            {t('nav.backToMap')}
          </Link>
        </div>
      </div>
    );
  }

  const categoryTone = getMarkerCategoryTone(marker.category);
  const isAdoption = isAdoptionCategory(marker.category);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-first Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-4 py-3">
          <Link to="/" className="text-blue-600 hover:underline text-sm inline-flex items-center mb-2">
            ← {t('nav.backToMap')}
          </Link>
          <h1 className="text-xl font-bold text-gray-900">{marker.title}</h1>
        </div>
      </header>

      <main className="px-4 py-4 pb-20 space-y-4">
        {/* Marker Info Card */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${categoryTone.badgeClass}`}>
              {t(`marker.categories.${marker.category}`)}
            </span>
            {marker.is_translated && (
              <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs">
                {marker.source_locale} → {marker.locale}
              </span>
            )}
          </div>

          <div className="space-y-3">
            {isAdoption && (
              <div className="rounded-lg border border-[#FF9AA8]/50 bg-[#3A2228] p-3">
                <h3 className="font-semibold text-[#F4F7FA] text-sm mb-1">
                  {t('marker.adoption.freeOnlyTitle')}
                </h3>
                <p className="text-[#FFD4DA] text-xs leading-5">
                  {t('marker.adoption.freeOnlyNotice')} {t('marker.adoption.privacyHint')}
                </p>
              </div>
            )}

            <div>
              <h3 className="font-semibold text-gray-700 text-sm mb-1">📍 {t('marker.address')}</h3>
              <p className="text-gray-600 text-sm">{marker.address}</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 text-sm mb-1">📝 {t('marker.description')}</h3>
              <p className="text-gray-600 text-sm whitespace-pre-wrap">{marker.description}</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 text-sm mb-1">📊 {t('marker.status')}</h3>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`px-2 py-1 rounded-full ${
                    marker.consensus_status === 'verified'
                      ? 'bg-blue-100 text-blue-800'
                      : marker.consensus_status === 'disputed'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {t('marker.consensus')}: {marker.consensus_status}
                </span>
                <span className="text-gray-600">
                  {t('marker.confidence')}: {(marker.confidence_score * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 text-sm mb-1">🕐 {t('marker.createdAt')}</h3>
              <p className="text-gray-600 text-xs">{new Date(marker.created_at).toLocaleString(currentLocale)}</p>
            </div>

            {marker.contact_info && (
              <div>
                <h3 className="font-semibold text-gray-700 text-sm mb-1">📞 {t('marker.contactInfo')}</h3>
                <p className="text-gray-600 text-sm">{marker.contact_info}</p>
              </div>
            )}
          </div>
        </div>

        {/* Feedback Summary */}
        <FeedbackSummary markerId={marker.id} />

        {/* Feedback Buttons */}
        <div className="bg-white rounded-lg shadow p-4">
          <FeedbackButtons markerId={marker.id} onSuccess={() => refetch()} />
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-900 text-lg mb-4">更多操作</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowReportModal(true)}
              className="px-4 py-3 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition"
            >
              🚨 举报
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: marker.title,
                    text: marker.description,
                    url: window.location.href,
                  });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert('链接已复制到剪贴板');
                }
              }}
              className="px-4 py-3 bg-blue-50 text-blue-600 rounded-xl font-medium hover:bg-blue-100 transition"
            >
              📤 分享
            </button>
          </div>
        </div>
      </main>

      {/* Report Modal */}
      {showReportModal && (
        <ReportModal markerId={marker.id} onClose={() => setShowReportModal(false)} />
      )}
    </div>
  );
}

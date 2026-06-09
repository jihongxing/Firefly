import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  Flag,
  HandHeart,
  Languages,
  MapPin,
  Send,
  Share2,
  ShieldCheck,
} from 'lucide-react';
import { apiClient } from '@/services/api';
import { useAppStore } from '@/store/appStore';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import FeedbackButtons from '@/components/FeedbackButtons';
import FeedbackSummary from '@/components/FeedbackSummary';
import ReportModal from '@/components/ReportModal';
import { getMarkerCategoryTone, isAdoptionCategory, isRiskCategory } from '@/utils/markerCategories';

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
      <div className="ff-page flex items-center justify-center">
        <LoadingSpinner size="lg" text={t('common.loading')} />
      </div>
    );
  }

  if (error || !marker) {
    return (
      <div className="ff-page flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <ErrorMessage message={(error as Error)?.message || t('common.error')} onRetry={() => refetch()} />
          <Link to="/" className="mt-4 block text-center text-[14px] font-semibold" style={{ color: 'var(--color-primary)' }}>
            {t('nav.backToMap')}
          </Link>
        </div>
      </div>
    );
  }

  const categoryTone = getMarkerCategoryTone(marker.category);
  const isAdoption = isAdoptionCategory(marker.category);
  const isRisk = isRiskCategory(marker.category);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: marker.title,
        text: marker.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert(t('detail.copySuccess'));
    }
  };

  return (
    <div className="ff-page">
      <header className="ff-page-header">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link to="/" className="ff-icon-button shrink-0" aria-label={t('nav.backToMap')}>
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold" style={{ color: isRisk ? 'var(--color-warning)' : 'var(--color-primary)' }}>
              {t(`marker.categories.${marker.category}`)}
            </p>
            <h1 className="line-clamp-2 text-[20px] font-bold leading-7" style={{ color: 'var(--color-text-strong)' }}>
              {marker.title}
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-5 pb-10">
        <section className="ff-panel p-4">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className={categoryTone.badgeClass + ' inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-bold'}>
              {isRisk ? <AlertTriangle size={15} /> : <HandHeart size={15} />}
              {t(`marker.categories.${marker.category}`)}
            </span>
            {marker.is_translated && (
              <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold" style={{ borderColor: 'var(--color-border-soft)', color: 'var(--color-muted)' }}>
                <Languages size={14} />
                {t('detail.translated', { source: marker.source_locale, locale: marker.locale })}
              </span>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatusMetric label={t('marker.consensus')} value={marker.consensus_status} />
            <StatusMetric label={t('marker.confidence')} value={`${(marker.confidence_score * 100).toFixed(0)}%`} />
            <StatusMetric label={t('marker.createdAt')} value={new Date(marker.created_at).toLocaleDateString(currentLocale)} />
          </div>
        </section>

        <section className="ff-panel p-4">
          <div className="mb-3 flex items-center gap-2">
            <MapPin size={18} style={{ color: isRisk ? 'var(--color-warning)' : 'var(--color-primary)' }} />
            <h2 className="text-[16px] font-bold" style={{ color: 'var(--color-text-strong)' }}>
              {t('marker.location')}
            </h2>
          </div>
          <p className="text-[14px] leading-6" style={{ color: 'var(--color-text)' }}>
            {marker.address}
          </p>
          <div className="mt-3 flex items-start gap-2 rounded-lg border p-3" style={{ borderColor: 'var(--color-border-soft)', background: 'var(--color-surface-2)' }}>
            <ShieldCheck size={17} className="mt-0.5 shrink-0" style={{ color: 'var(--color-info)' }} />
            <p className="text-[13px] leading-5" style={{ color: 'var(--color-muted)' }}>
              {t('detail.privacyNotice')}
            </p>
          </div>
        </section>

        <section className="ff-panel p-4">
          <div className="mb-3 flex items-center gap-2">
            <HandHeart size={18} style={{ color: isRisk ? 'var(--color-warning)' : 'var(--color-primary)' }} />
            <h2 className="text-[16px] font-bold" style={{ color: 'var(--color-text-strong)' }}>
              {t('marker.description')}
            </h2>
          </div>
          <p className="whitespace-pre-wrap text-[14px] leading-6" style={{ color: 'var(--color-text)' }}>
            {marker.description}
          </p>

          {isAdoption && (
            <div className="mt-4 rounded-lg border p-3" style={{ borderColor: 'rgba(255, 154, 168, 0.5)', background: 'var(--color-help-soft)' }}>
              <div className="mb-1 flex items-center gap-2 text-[14px] font-bold" style={{ color: 'var(--color-text-strong)' }}>
                <ShieldCheck size={17} style={{ color: 'var(--color-primary)' }} />
                {t('marker.adoption.freeOnlyTitle')}
              </div>
              <p className="text-[13px] leading-5" style={{ color: 'var(--color-muted)' }}>
                {t('marker.adoption.freeOnlyNotice')} {t('marker.adoption.privacyHint')}
              </p>
            </div>
          )}
        </section>

        {marker.contact_info && (
          <section className="ff-panel p-4">
            <div className="mb-2 flex items-center gap-2">
              <Send size={18} style={{ color: 'var(--color-primary)' }} />
              <h2 className="text-[16px] font-bold" style={{ color: 'var(--color-text-strong)' }}>
                {t('marker.contactInfo')}
              </h2>
            </div>
            <p className="text-[14px] leading-6" style={{ color: 'var(--color-text)' }}>
              {marker.contact_info}
            </p>
          </section>
        )}

        <FeedbackSummary markerId={marker.id} />

        <section className="ff-panel p-4">
          <div className="mb-3">
            <h2 className="text-[17px] font-bold" style={{ color: 'var(--color-text-strong)' }}>
              {t('feedback.title')}
            </h2>
            <p className="text-[13px] leading-5" style={{ color: 'var(--color-muted)' }}>
              {t('detail.feedbackPrompt')}
            </p>
          </div>
          <FeedbackButtons markerId={marker.id} onSuccess={() => refetch()} />
        </section>

        <section className="ff-panel p-4">
          <h2 className="mb-3 text-[16px] font-bold" style={{ color: 'var(--color-text-strong)' }}>
            {t('detail.moreActions')}
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShowReportModal(true)}
              className="ff-secondary-action inline-flex items-center justify-center gap-2 px-3 text-[14px]"
              style={{ color: '#E45757' }}
            >
              <Flag size={17} />
              {t('detail.reportAction')}
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="ff-secondary-action inline-flex items-center justify-center gap-2 px-3 text-[14px]"
            >
              <Share2 size={17} />
              {t('detail.shareAction')}
            </button>
          </div>
        </section>
      </main>

      {showReportModal && <ReportModal markerId={marker.id} onClose={() => setShowReportModal(false)} />}
    </div>
  );

  function StatusMetric({ label, value }: { label: string; value: string }) {
    return (
      <div className="rounded-lg border p-3" style={{ borderColor: 'var(--color-border-soft)', background: 'var(--color-surface-2)' }}>
        <div className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: 'var(--color-muted)' }}>
          <CalendarClock size={14} />
          {label}
        </div>
        <div className="text-[15px] font-bold" style={{ color: 'var(--color-text-strong)' }}>
          {value}
        </div>
      </div>
    );
  }
}

import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import type { FeedbackType } from '@/types/api';

interface FeedbackButtonsProps {
  markerId: number;
  onSuccess?: () => void;
}

export default function FeedbackButtons({ markerId, onSuccess }: FeedbackButtonsProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const feedbackMutation = useMutation({
    mutationFn: (feedbackType: FeedbackType['feedbackType']) =>
      apiClient.submitFeedback(markerId, { feedbackType, confidenceLevel: 4 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marker', markerId] });
      queryClient.invalidateQueries({ queryKey: ['feedbackSummary', markerId] });
      onSuccess?.();
    },
  });

  const feedbackGroups = {
    support: ['confirm', 'support', 'helpful'] as FeedbackType['feedbackType'][],
    oppose: ['dispute', 'not_helpful', 'outdated'] as FeedbackType['feedbackType'][],
    status: ['resolved', 'still_active'] as FeedbackType['feedbackType'][],
  };

  const getButtonStyle = (type: FeedbackType['feedbackType']) => {
    if (feedbackGroups.support.includes(type)) {
      return { background: 'rgba(76, 183, 130, 0.16)', borderColor: 'rgba(76, 183, 130, 0.45)', color: 'var(--color-text-strong)' };
    }
    if (feedbackGroups.oppose.includes(type)) {
      return { background: 'rgba(228, 87, 87, 0.14)', borderColor: 'rgba(228, 87, 87, 0.45)', color: 'var(--color-text-strong)' };
    }
    return { background: 'rgba(76, 139, 245, 0.14)', borderColor: 'rgba(76, 139, 245, 0.45)', color: 'var(--color-text-strong)' };
  };

  return (
    <div className="space-y-4">
      {/* Support Group */}
      <div className="space-y-2">
        <h4 className="text-[13px] font-bold" style={{ color: 'var(--color-muted)' }}>
          {t('feedback.support.title')}
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {feedbackGroups.support.map((type) => (
            <button
              key={type}
              onClick={() => feedbackMutation.mutate(type)}
              disabled={feedbackMutation.isPending}
              className="rounded-lg border px-3 py-3 text-[13px] font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50"
              style={getButtonStyle(type)}
            >
              {t(`feedback.support.${type}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Oppose Group */}
      <div className="space-y-2">
        <h4 className="text-[13px] font-bold" style={{ color: 'var(--color-muted)' }}>
          {t('feedback.oppose.title')}
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {feedbackGroups.oppose.map((type) => (
            <button
              key={type}
              onClick={() => feedbackMutation.mutate(type)}
              disabled={feedbackMutation.isPending}
              className="rounded-lg border px-3 py-3 text-[13px] font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50"
              style={getButtonStyle(type)}
            >
              {t(`feedback.oppose.${type}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Status Group */}
      <div className="space-y-2">
        <h4 className="text-[13px] font-bold" style={{ color: 'var(--color-muted)' }}>
          {t('feedback.status.title')}
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {feedbackGroups.status.map((type) => (
            <button
              key={type}
              onClick={() => feedbackMutation.mutate(type)}
              disabled={feedbackMutation.isPending}
              className="rounded-lg border px-3 py-3 text-[13px] font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50"
              style={getButtonStyle(type)}
            >
              {t(`feedback.status.${type}`)}
            </button>
          ))}
        </div>
      </div>

      {feedbackMutation.isSuccess && (
        <div className="rounded-lg border p-3" style={{ borderColor: 'rgba(76, 183, 130, 0.45)', background: 'rgba(76, 183, 130, 0.14)' }}>
          <p className="text-sm" style={{ color: 'var(--color-text-strong)' }}>
            {t('common.success')}
          </p>
        </div>
      )}
      {feedbackMutation.isError && (
        <div className="rounded-lg border p-3" style={{ borderColor: 'rgba(228, 87, 87, 0.45)', background: 'rgba(228, 87, 87, 0.14)' }}>
          <p className="text-sm" style={{ color: 'var(--color-text-strong)' }}>
            {t('common.error')}
          </p>
        </div>
      )}
    </div>
  );
}

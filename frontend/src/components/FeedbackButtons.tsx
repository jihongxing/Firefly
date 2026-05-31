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

  const getButtonColor = (type: FeedbackType['feedbackType']) => {
    if (feedbackGroups.support.includes(type)) {
      return 'bg-green-500 text-white hover:bg-green-600 active:bg-green-700';
    }
    if (feedbackGroups.oppose.includes(type)) {
      return 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700';
    }
    return 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700';
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900 text-lg">{t('feedback.title')}</h3>

      {/* Support Group */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">{t('feedback.support.title')}</h4>
        <div className="grid grid-cols-3 gap-2">
          {feedbackGroups.support.map((type) => (
            <button
              key={type}
              onClick={() => feedbackMutation.mutate(type)}
              disabled={feedbackMutation.isPending}
              className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${getButtonColor(
                type
              )} disabled:opacity-50 disabled:cursor-not-allowed shadow-sm`}
            >
              {t(`feedback.support.${type}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Oppose Group */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">{t('feedback.oppose.title')}</h4>
        <div className="grid grid-cols-3 gap-2">
          {feedbackGroups.oppose.map((type) => (
            <button
              key={type}
              onClick={() => feedbackMutation.mutate(type)}
              disabled={feedbackMutation.isPending}
              className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${getButtonColor(
                type
              )} disabled:opacity-50 disabled:cursor-not-allowed shadow-sm`}
            >
              {t(`feedback.oppose.${type}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Status Group */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">{t('feedback.status.title')}</h4>
        <div className="grid grid-cols-2 gap-2">
          {feedbackGroups.status.map((type) => (
            <button
              key={type}
              onClick={() => feedbackMutation.mutate(type)}
              disabled={feedbackMutation.isPending}
              className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${getButtonColor(
                type
              )} disabled:opacity-50 disabled:cursor-not-allowed shadow-sm`}
            >
              {t(`feedback.status.${type}`)}
            </button>
          ))}
        </div>
      </div>

      {feedbackMutation.isSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-700">✓ {t('common.success')}</p>
        </div>
      )}
      {feedbackMutation.isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">✗ {t('common.error')}</p>
        </div>
      )}
    </div>
  );
}

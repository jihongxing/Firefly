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

  const feedbackTypes: FeedbackType['feedbackType'][] = [
    'confirm',
    'dispute',
    'support',
    'resolved',
    'still_active',
    'outdated',
    'helpful',
    'not_helpful',
  ];

  const getButtonColor = (type: FeedbackType['feedbackType']) => {
    if (type === 'confirm' || type === 'support' || type === 'helpful') {
      return 'bg-green-100 text-green-800 hover:bg-green-200';
    }
    if (type === 'dispute' || type === 'not_helpful' || type === 'outdated') {
      return 'bg-red-100 text-red-800 hover:bg-red-200';
    }
    return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">提交反馈</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {feedbackTypes.map((type) => (
          <button
            key={type}
            onClick={() => feedbackMutation.mutate(type)}
            disabled={feedbackMutation.isPending}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${getButtonColor(
              type
            )} disabled:opacity-50`}
          >
            {t(`feedback.${type}`)}
          </button>
        ))}
      </div>
      {feedbackMutation.isSuccess && (
        <p className="text-sm text-green-600">✓ 反馈提交成功</p>
      )}
      {feedbackMutation.isError && (
        <p className="text-sm text-red-600">✗ 提交失败，请稍后重试</p>
      )}
    </div>
  );
}

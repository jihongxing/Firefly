import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/services/api';

interface FeedbackSummaryProps {
  markerId: number;
}

export default function FeedbackSummary({ markerId }: FeedbackSummaryProps) {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['feedbackSummary', markerId],
    queryFn: () => apiClient.getFeedbackSummary(markerId),
  });

  if (isLoading) {
    return (
      <div className="ff-panel animate-pulse p-4">
        <div className="mb-2 h-4 w-1/2 rounded" style={{ background: 'var(--color-surface-2)' }}></div>
        <div className="h-3 w-3/4 rounded" style={{ background: 'var(--color-surface-2)' }}></div>
      </div>
    );
  }

  if (!data || data.feedback_count === 0) {
    return (
      <div className="ff-panel p-4 text-center">
        <p className="text-[14px]" style={{ color: 'var(--color-muted)' }}>
          {t('feedback.noFeedback')}
        </p>
      </div>
    );
  }

  const { breakdown } = data;
  const types = Object.entries(breakdown).filter(([key]) => key !== 'total');

  return (
    <div className="ff-panel p-4">
      <h3 className="mb-3 text-[16px] font-bold" style={{ color: 'var(--color-text-strong)' }}>
        {t('feedback.summary')} ({data.feedback_count} {t('feedback.count')})
      </h3>
      <div className="space-y-2">
        {types.map(([type, count]) => (
          <div key={type} className="flex items-center justify-between text-sm">
            <span style={{ color: 'var(--color-muted)' }}>{type}</span>
            <span className="font-bold" style={{ color: 'var(--color-text-strong)' }}>
              {count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

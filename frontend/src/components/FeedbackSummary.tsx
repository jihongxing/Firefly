import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api';

interface FeedbackSummaryProps {
  markerId: number;
}

export default function FeedbackSummary({ markerId }: FeedbackSummaryProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['feedbackSummary', markerId],
    queryFn: () => apiClient.getFeedbackSummary(markerId),
  });

  if (isLoading) {
    return (
      <div className="bg-gray-100 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
      </div>
    );
  }

  if (!data || data.feedback_count === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <p className="text-gray-500 text-sm">暂无反馈</p>
      </div>
    );
  }

  const { breakdown } = data;
  const types = Object.entries(breakdown).filter(([key]) => key !== 'total');

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900 mb-3">
        社区反馈统计 ({data.feedback_count} 条)
      </h3>
      <div className="space-y-2">
        {types.map(([type, count]) => (
          <div key={type} className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{type}</span>
            <span className="font-medium text-gray-900">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';

interface ReportModalProps {
  markerId: number;
  onClose: () => void;
}

export default function ReportModal({ markerId, onClose }: ReportModalProps) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');

  const reportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(`/gamification/${markerId}/report`, {
        reason,
        description,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marker', markerId] });
      alert('举报已提交，感谢你的反馈！');
      onClose();
    },
    onError: (error: any) => {
      alert(error.message || '举报失败，请重试');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      alert('请选择举报原因');
      return;
    }
    reportMutation.mutate();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end z-[3000]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">🚨 举报这个标记</h2>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
            >
              <span className="text-xl text-gray-600">✕</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Reason Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                选择举报原因
              </label>
              <div className="space-y-2">
                {[
                  { value: 'false_info', label: '信息不实' },
                  { value: 'duplicate', label: '重复标记' },
                  { value: 'wrong_location', label: '位置错误' },
                  { value: 'malicious', label: '恶意标记' },
                  { value: 'other', label: '其他原因' },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`block p-4 rounded-xl border-2 cursor-pointer transition ${
                      reason === option.value
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={option.value}
                      checked={reason === option.value}
                      onChange={(e) => setReason(e.target.value)}
                      className="sr-only"
                    />
                    <span className="font-medium text-gray-900">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                补充说明（可选）
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-red-500 focus:bg-white transition resize-none"
                rows={4}
                placeholder="请详细描述问题..."
                maxLength={500}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={reportMutation.isPending}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-4 rounded-2xl font-bold text-lg hover:shadow-xl hover:shadow-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {reportMutation.isPending ? '提交中...' : '提交举报'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

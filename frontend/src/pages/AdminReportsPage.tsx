import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/services/api';
import LoadingSpinner from '@/components/LoadingSpinner';

interface AdminReport {
  id: number;
  reason: string;
  description?: string;
  createdAt: string;
  marker: {
    id: number;
    title: string;
    category: string;
    address: string;
  };
  reporter: {
    id: number;
    username: string;
  };
}

const getErrorMessage = (error: unknown, fallback: string) => {
  return error instanceof Error ? error.message : fallback;
};

export default function AdminReportsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [adminNote, setAdminNote] = useState('');
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
    }
  }, [isAdmin, navigate]);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['adminReports'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: AdminReport[] }>('/admin/reports');
      return response.data.data;
    },
    enabled: isAdmin,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ reportId, action }: { reportId: number; action: string }) => {
      const response = await apiClient.post(`/admin/reports/${reportId}/review`, {
        action,
        adminNote,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminReports'] });
      setAdminNote('');
      alert('审核完成！');
    },
    onError: (error: unknown) => {
      alert(getErrorMessage(error, '审核失败'));
    },
  });

  const handleReview = (report: AdminReport, action: string) => {
    if (!confirm(`确定要${action === 'approve' ? '批准' : action === 'reject' ? '拒绝' : '隐藏标记'}吗？`)) {
      return;
    }
    reviewMutation.mutate({ reportId: report.id, action });
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-lg bg-white/80 border-b border-gray-200/50">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
            >
              <span className="text-xl">←</span>
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">举报审核</h1>
              <p className="text-xs text-gray-500">管理员面板</p>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 pb-20 max-w-4xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4">
            <div className="text-3xl font-bold text-red-600">{reports.length}</div>
            <div className="text-sm text-red-700 mt-1">待审核</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
            <div className="text-3xl font-bold text-green-600">0</div>
            <div className="text-sm text-green-700 mt-1">已批准</div>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4">
            <div className="text-3xl font-bold text-gray-600">0</div>
            <div className="text-sm text-gray-700 mt-1">已拒绝</div>
          </div>
        </div>

        {/* Reports List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">没有待审核的举报</h3>
            <p className="text-gray-600">所有举报都已处理完毕</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      {report.marker.title}
                    </h3>
                    <p className="text-sm text-gray-600">{report.marker.address}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                        {report.marker.category}
                      </span>
                      <span className="text-xs text-gray-500">
                        举报者: {report.reporter.username}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full bg-red-100 text-red-800 font-medium">
                    待审核
                  </span>
                </div>

                <div className="bg-red-50 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-red-600 font-semibold">举报原因:</span>
                    <span className="text-red-800">
                      {report.reason === 'false_info' ? '信息不实' :
                       report.reason === 'duplicate' ? '重复标记' :
                       report.reason === 'wrong_location' ? '位置错误' :
                       report.reason === 'malicious' ? '恶意标记' : '其他原因'}
                    </span>
                  </div>
                  {report.description && (
                    <p className="text-sm text-gray-700 mt-2">{report.description}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    提交时间: {new Date(report.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleReview(report, 'approve')}
                    disabled={reviewMutation.isPending}
                    className="px-4 py-3 bg-green-50 text-green-600 rounded-xl font-medium hover:bg-green-100 transition disabled:opacity-50"
                  >
                    ✓ 批准
                  </button>
                  <button
                    onClick={() => handleReview(report, 'reject')}
                    disabled={reviewMutation.isPending}
                    className="px-4 py-3 bg-gray-50 text-gray-600 rounded-xl font-medium hover:bg-gray-100 transition disabled:opacity-50"
                  >
                    ✕ 拒绝
                  </button>
                  <button
                    onClick={() => handleReview(report, 'hide_marker')}
                    disabled={reviewMutation.isPending}
                    className="px-4 py-3 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition disabled:opacity-50"
                  >
                    🚫 隐藏标记
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

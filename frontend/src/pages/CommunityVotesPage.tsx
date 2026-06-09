import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/services/api';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function CommunityVotesPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [voteReason, setVoteReason] = useState('');

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  const { data: votingData, isLoading } = useQuery({
    queryKey: ['communityReports'],
    queryFn: async () => {
      const response = await apiClient.get('/community/reports');
      return response.data;
    },
  });

  const voteMutation = useMutation({
    mutationFn: async ({ reportId, voteType }: { reportId: number; voteType: string }) => {
      const response = await apiClient.post(`/community/reports/${reportId}/vote`, {
        voteType,
        reason: voteReason,
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['communityReports'] });
      setSelectedReport(null);
      setVoteReason('');
      alert(`投票成功！获得 ${data.data.pointsEarned} 积分`);
    },
    onError: (error: any) => {
      alert(error.message || '投票失败');
    },
  });

  const handleVote = (voteType: string) => {
    if (!selectedReport) return;
    voteMutation.mutate({ reportId: selectedReport.id, voteType });
  };

  const reports = votingData?.data || [];
  const canVote = votingData?.canVote || false;
  const userLevel = votingData?.userLevel || 'sprout';

  const levelInfo = {
    angel: { icon: '👑', name: '守护天使', weight: 3, color: 'purple' },
    star: { icon: '⭐', name: '星光守护者', weight: 2, color: 'yellow' },
    firefly: { icon: '🔥', name: '萤火守护者', weight: 1, color: 'orange' },
    sprout: { icon: '🌱', name: '新芽守护者', weight: 0, color: 'green' },
  };

  const currentLevel = levelInfo[userLevel as keyof typeof levelInfo];

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
            <div className="flex-1">
              <h1 className="text-lg font-bold text-gray-900">社区投票</h1>
              <p className="text-xs text-gray-500">参与社区治理，获得积分奖励</p>
            </div>
            <div className={`px-3 py-1 rounded-full bg-${currentLevel.color}-100 text-${currentLevel.color}-800 text-sm font-medium`}>
              {currentLevel.icon} {currentLevel.name}
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 pb-20 max-w-4xl mx-auto">
        {/* Voting Power Card */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-sm border border-purple-100 p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-3">💪 你的投票权重</h3>
          {canVote ? (
            <div>
              <div className="text-4xl font-bold text-purple-600 mb-2">{currentLevel.weight}</div>
              <p className="text-sm text-gray-700">
                你的每一票价值 {currentLevel.weight} 点权重
              </p>
              <p className="text-xs text-gray-600 mt-2">
                投票可获得积分，正确投票额外奖励！
              </p>
            </div>
          ) : (
            <div>
              <p className="text-gray-700 mb-2">
                🌱 你还不能投票
              </p>
              <p className="text-sm text-gray-600">
                需要达到 🔥 萤火守护者（11分）才能参与投票
              </p>
              <button
                onClick={() => navigate('/')}
                className="mt-3 px-4 py-2 bg-purple-500 text-white rounded-xl text-sm font-medium hover:bg-purple-600 transition"
              >
                去提交反馈获得积分
              </button>
            </div>
          )}
        </div>

        {/* Reports List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">暂无待投票举报</h3>
            <p className="text-gray-600">所有举报都已处理完毕</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report: any) => {
              const hoursRemaining = Math.floor(report.seconds_remaining / 3600);
              const minutesRemaining = Math.floor((report.seconds_remaining % 3600) / 60);
              const hasVoted = report.user_vote !== null;
              const reasons = report.reasons || [];
              const reporterCount = report.reporter_count || 1;

              // Count reasons by type
              const reasonCounts = reasons.reduce((acc: any, r: any) => {
                acc[r.reason] = (acc[r.reason] || 0) + 1;
                return acc;
              }, {});

              return (
                <div
                  key={report.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {report.marker_title}
                      </h3>
                      <p className="text-sm text-gray-600">{report.marker_address}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                          {report.marker_category}
                        </span>
                        <span className="text-xs text-gray-500">
                          {reporterCount} 人举报
                        </span>
                      </div>
                    </div>
                    {hasVoted && (
                      <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-800 font-medium">
                        已投票
                      </span>
                    )}
                  </div>

                  <div className="bg-orange-50 rounded-xl p-4 mb-4">
                    <div className="font-semibold text-orange-600 mb-2">
                      举报原因（{reporterCount}人）:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(reasonCounts).map(([reason, count]: [string, any]) => (
                        <span key={reason} className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                          {reason === 'false_info' ? '信息不实' :
                           reason === 'duplicate' ? '重复标记' :
                           reason === 'wrong_location' ? '位置错误' :
                           reason === 'malicious' ? '恶意标记' : '其他原因'}
                          {count > 1 && ` (${count})`}
                        </span>
                      ))}
                    </div>
                    {reasons.length > 0 && reasons[0].description && (
                      <p className="text-sm text-gray-700 mt-3 italic">
                        "{reasons[0].description}"
                      </p>
                    )}
                  </div>

                  {/* Voting Progress */}
                  <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-700">投票进度</span>
                      <span className="text-xs text-gray-500">
                        ⏰ 剩余 {hoursRemaining}小时 {minutesRemaining}分钟
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-green-100 rounded-lg p-3">
                        <div className="text-2xl font-bold text-green-600">
                          {report.support_weight || 0}
                        </div>
                        <div className="text-xs text-green-700">✅ 支持权重</div>
                      </div>
                      <div className="bg-red-100 rounded-lg p-3">
                        <div className="text-2xl font-bold text-red-600">
                          {report.oppose_weight || 0}
                        </div>
                        <div className="text-xs text-red-700">❌ 反对权重</div>
                      </div>
                    </div>
                  </div>

                  {/* Vote Buttons */}
                  {canVote && !hasVoted && (
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          handleVote('support');
                        }}
                        disabled={voteMutation.isPending}
                        className="px-4 py-3 bg-green-50 text-green-600 rounded-xl font-medium hover:bg-green-100 transition disabled:opacity-50"
                      >
                        ✅ 支持
                      </button>
                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          handleVote('oppose');
                        }}
                        disabled={voteMutation.isPending}
                        className="px-4 py-3 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition disabled:opacity-50"
                      >
                        ❌ 反对
                      </button>
                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          handleVote('need_info');
                        }}
                        disabled={voteMutation.isPending}
                        className="px-4 py-3 bg-blue-50 text-blue-600 rounded-xl font-medium hover:bg-blue-100 transition disabled:opacity-50"
                      >
                        🤔 需要更多信息
                      </button>
                    </div>
                  )}

                  {hasVoted && (
                    <div className="text-center py-3 bg-green-50 rounded-xl">
                      <span className="text-sm text-green-700 font-medium">
                        ✓ 你已投票：
                        {report.user_vote === 'support' ? '支持' :
                         report.user_vote === 'oppose' ? '反对' : '需要更多信息'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

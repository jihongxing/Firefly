import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/services/api';
import LoadingSpinner from '@/components/LoadingSpinner';

interface UserMarker {
  id: number;
  title: string;
  address: string;
  consensusStatus?: string;
  consensus_status?: string;
  createdAt?: string;
  created_at?: string;
}

interface UserFeedback {
  id: number;
  markerId?: number;
  marker_id?: number;
  feedbackType?: string;
  feedback_type?: string;
  createdAt?: string;
  created_at?: string;
  comment?: string;
  marker: {
    id: number;
    title: string;
    address: string;
  };
}

interface PointsData {
  points: number;
  level: string;
  levelName: string;
  nextLevel?: string | null;
  nextLevelPoints?: number | null;
  pointsToNextLevel?: number | null;
  stats?: {
    daysActive: number;
    markersSubmitted: number;
    feedbackGiven: number;
    thanksReceived: number;
  };
}

interface BadgeData {
  total: number;
  badges: Array<{
    id: string;
    icon: string;
    name: string;
    description: string;
  }>;
}

const formatDate = (value?: string) => {
  return value ? new Date(value).toLocaleDateString('zh-CN') : '未知日期';
};

const getMarkerStatus = (marker: UserMarker) => {
  return marker.consensusStatus ?? marker.consensus_status ?? 'pending';
};

const getFeedbackType = (feedback: UserFeedback) => {
  return feedback.feedbackType ?? feedback.feedback_type ?? 'feedback';
};

const getFeedbackMarkerId = (feedback: UserFeedback) => {
  return feedback.markerId ?? feedback.marker_id ?? feedback.marker.id;
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const { data: myMarkers = [], isLoading: loadingMarkers } = useQuery({
    queryKey: ['myMarkers', user?.id],
    queryFn: async () => {
      const response = await apiClient.get<{ data: UserMarker[] }>('/users/me/markers');
      return response.data.data;
    },
    enabled: isAuthenticated && !!user,
  });

  const { data: myFeedback = [], isLoading: loadingFeedback } = useQuery({
    queryKey: ['myFeedback', user?.id],
    queryFn: async () => {
      const response = await apiClient.get<{ data: UserFeedback[] }>('/users/me/feedback');
      return response.data.data;
    },
    enabled: isAuthenticated && !!user,
  });

  const { data: pointsData } = useQuery({
    queryKey: ['userPoints', user?.id],
    queryFn: async () => {
      const response = await apiClient.get<{ data: PointsData }>('/gamification/me/points');
      return response.data.data;
    },
    enabled: isAuthenticated && !!user,
  });

  const { data: badgesData } = useQuery({
    queryKey: ['userBadges', user?.id],
    queryFn: async () => {
      const response = await apiClient.get<{ data: BadgeData }>('/gamification/me/badges');
      return response.data.data;
    },
    enabled: isAuthenticated && !!user,
  });

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!isAuthenticated) {
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
              <h1 className="text-lg font-bold text-gray-900">个人中心</h1>
              <p className="text-xs text-gray-500">我的资料和活动</p>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 pb-20 max-w-2xl mx-auto space-y-6">
        {/* User Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                {user?.username.charAt(0).toUpperCase()}
              </div>
              {pointsData && (
                <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full border-2 border-white">
                  {pointsData.level === 'angel' ? '👑' :
                   pointsData.level === 'star' ? '⭐' :
                   pointsData.level === 'firefly' ? '🔥' : '🌱'}
                </div>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">{user?.username}</h2>
              {pointsData && (
                <p className="text-sm text-purple-600 font-medium">{pointsData.levelName}</p>
              )}
              <p className="text-xs text-gray-500">{user?.email || '未设置邮箱'}</p>
            </div>
          </div>

          {/* Points Progress */}
          {pointsData && pointsData.nextLevel && pointsData.nextLevelPoints && (
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">升级进度</span>
                <span className="font-medium text-purple-600">
                  {pointsData.points} / {pointsData.nextLevelPoints} 分
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${(pointsData.points / pointsData.nextLevelPoints) * 100}%`,
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                还需 {pointsData.pointsToNextLevel} 分升级到 {pointsData.nextLevel === 'angel' ? '👑 守护天使' : pointsData.nextLevel === 'star' ? '⭐ 星光守护者' : '🔥 萤火守护者'}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
              <div className="text-3xl font-bold text-blue-600">{pointsData?.points || 0}</div>
              <div className="text-sm text-blue-700 mt-1">守护积分</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
              <div className="text-3xl font-bold text-green-600">{myMarkers.length}</div>
              <div className="text-sm text-green-700 mt-1">我的标记</div>
            </div>
          </div>
        </div>

        {/* Guardian Story */}
        {pointsData?.stats && (
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-sm border border-purple-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">💫 你的守护故事</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">📊 守护天数</span>
                <span className="font-bold text-purple-600">{pointsData.stats.daysActive} 天</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">🐾 提交标记</span>
                <span className="font-bold text-purple-600">{pointsData.stats.markersSubmitted} 个</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">💬 反馈次数</span>
                <span className="font-bold text-purple-600">{pointsData.stats.feedbackGiven} 次</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">💚 获得感谢</span>
                <span className="font-bold text-purple-600">{pointsData.stats.thanksReceived} 次</span>
              </div>
            </div>
          </div>
        )}

        {/* Badge Wall */}
        {badgesData && badgesData.badges.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              🏆 已获得徽章 ({badgesData.total})
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {badgesData.badges.map((badge) => (
                <div
                  key={badge.id}
                  className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-3 text-center"
                >
                  <div className="text-3xl mb-1">{badge.icon}</div>
                  <div className="text-xs font-medium text-gray-900">{badge.name}</div>
                  <div className="text-xs text-gray-600 mt-1">{badge.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Markers */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">📍 我的标记</h3>
          {loadingMarkers ? (
            <div className="py-8 flex justify-center">
              <LoadingSpinner size="md" />
            </div>
          ) : myMarkers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">还没有提交过标记</p>
              <button
                onClick={() => navigate('/submit')}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg transition"
              >
                提交第一个标记
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myMarkers.map((marker) => {
                const status = getMarkerStatus(marker);

                return (
                  <div
                    key={marker.id}
                    onClick={() => navigate(`/markers/${marker.id}`)}
                    className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{marker.title}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        status === 'verified' ? 'bg-blue-100 text-blue-800' :
                        status === 'disputed' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{marker.address}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {formatDate(marker.createdAt ?? marker.created_at)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* My Feedback */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">💬 我的反馈</h3>
          {loadingFeedback ? (
            <div className="py-8 flex justify-center">
              <LoadingSpinner size="md" />
            </div>
          ) : myFeedback.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">还没有提交过反馈</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myFeedback.map((feedback) => {
                const feedbackType = getFeedbackType(feedback);

                return (
                  <div
                    key={feedback.id}
                    onClick={() => navigate(`/markers/${getFeedbackMarkerId(feedback)}`)}
                    className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                        ['confirm', 'support', 'helpful'].includes(feedbackType) ? 'bg-green-100 text-green-800' :
                        ['dispute', 'not_helpful', 'outdated'].includes(feedbackType) ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {feedbackType}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(feedback.createdAt ?? feedback.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 font-medium">{feedback.marker.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{feedback.marker.address}</p>
                    {feedback.comment && (
                      <p className="text-sm text-gray-600 mt-2 italic">"{feedback.comment}"</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Community Voting Link */}
        <button
          onClick={() => navigate('/community/votes')}
          className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl font-bold hover:shadow-xl hover:shadow-blue-500/30 transition-all"
        >
          🗳️ 社区投票
        </button>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl font-bold hover:shadow-xl hover:shadow-red-500/30 transition-all"
        >
          退出登录
        </button>

        {/* Admin Link */}
        {user?.role === 'admin' && (
          <button
            onClick={() => navigate('/admin/reports')}
            className="w-full py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-2xl font-bold hover:shadow-xl hover:shadow-purple-500/30 transition-all"
          >
            👑 管理员面板
          </button>
        )}
      </main>
    </div>
  );
}

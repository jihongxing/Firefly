import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/services/api';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuthStore();

  // Redirect if not authenticated
  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  const { data: myMarkers = [], isLoading: loadingMarkers } = useQuery({
    queryKey: ['myMarkers', user?.id],
    queryFn: async () => {
      const response = await apiClient.get('/users/me/markers');
      return response.data.data;
    },
    enabled: !!user,
  });

  const { data: myFeedback = [], isLoading: loadingFeedback } = useQuery({
    queryKey: ['myFeedback', user?.id],
    queryFn: async () => {
      const response = await apiClient.get('/users/me/feedback');
      return response.data.data;
    },
    enabled: !!user,
  });

  const handleLogout = () => {
    logout();
    navigate('/');
  };

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
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
              {user?.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">{user?.username}</h2>
              <p className="text-sm text-gray-500">{user?.email || '未设置邮箱'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
              <div className="text-3xl font-bold text-blue-600">{user?.reputationScore || 0}</div>
              <div className="text-sm text-blue-700 mt-1">声誉分数</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
              <div className="text-3xl font-bold text-green-600">{myMarkers.length}</div>
              <div className="text-sm text-green-700 mt-1">我的标记</div>
            </div>
          </div>
        </div>

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
              {myMarkers.map((marker: any) => (
                <div
                  key={marker.id}
                  onClick={() => navigate(`/markers/${marker.id}`)}
                  className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{marker.title}</h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      marker.consensusStatus === 'verified' ? 'bg-blue-100 text-blue-800' :
                      marker.consensusStatus === 'disputed' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {marker.consensusStatus}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{marker.address}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(marker.createdAt).toLocaleDateString('zh-CN')}
                  </p>
                </div>
              ))}
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
              {myFeedback.map((feedback: any) => (
                <div
                  key={feedback.id}
                  onClick={() => navigate(`/markers/${feedback.markerId}`)}
                  className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                      ['confirm', 'support', 'helpful'].includes(feedback.feedbackType) ? 'bg-green-100 text-green-800' :
                      ['dispute', 'not_helpful', 'outdated'].includes(feedback.feedbackType) ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {feedback.feedbackType}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(feedback.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 font-medium">{feedback.marker.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{feedback.marker.address}</p>
                  {feedback.comment && (
                    <p className="text-sm text-gray-600 mt-2 italic">"{feedback.comment}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl font-bold hover:shadow-xl hover:shadow-red-500/30 transition-all"
        >
          退出登录
        </button>
      </main>
    </div>
  );
}

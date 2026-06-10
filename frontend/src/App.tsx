import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense, lazy, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ScrollToTop from '@/components/ScrollToTop';
import PwaInstallPrompt from '@/components/PwaInstallPrompt';
import LoadingSpinner from '@/components/LoadingSpinner';
import { apiClient } from '@/services/api';
import { useAppStore } from '@/store/appStore';
import './i18n';

const MapPage = lazy(() => import('@/pages/MapPage'));
const MarkerDetailPage = lazy(() => import('@/pages/MarkerDetailPage'));
const SubmitMarkerPage = lazy(() => import('@/pages/SubmitMarkerPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const AdminReportsPage = lazy(() => import('@/pages/AdminReportsPage'));
const CommunityVotesPage = lazy(() => import('@/pages/CommunityVotesPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

function App() {
  const { i18n } = useTranslation();
  const { setConfig, setLocale, theme } = useAppStore();

  useEffect(() => {
    apiClient.getConfig().then((config) => {
      setConfig(config);
      const savedLocale = localStorage.getItem('locale') || config.default_locale;
      setLocale(savedLocale);
      i18n.changeLanguage(savedLocale);
    });
  }, [setConfig, setLocale, i18n]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = i18n.language || 'zh-CN';
  }, [theme, i18n.language]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollToTop />
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--color-bg)' }}>
              <LoadingSpinner size="lg" />
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<MapPage />} />
            <Route path="/markers/:id" element={<MarkerDetailPage />} />
            <Route path="/submit" element={<SubmitMarkerPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/admin/reports" element={<AdminReportsPage />} />
            <Route path="/community/votes" element={<CommunityVotesPage />} />
          </Routes>
        </Suspense>
        <PwaInstallPrompt />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

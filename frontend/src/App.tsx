import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import MapPage from '@/pages/MapPage';
import MarkerDetailPage from '@/pages/MarkerDetailPage';
import SubmitMarkerPage from '@/pages/SubmitMarkerPage';
import LoginPage from '@/pages/LoginPage';
import ProfilePage from '@/pages/ProfilePage';
import { apiClient } from '@/services/api';
import { useAppStore } from '@/store/appStore';
import './i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  const { i18n } = useTranslation();
  const { setConfig, setLocale } = useAppStore();

  useEffect(() => {
    apiClient.getConfig().then((config) => {
      setConfig(config);
      const savedLocale = localStorage.getItem('locale') || config.default_locale;
      setLocale(savedLocale);
      i18n.changeLanguage(savedLocale);
    });
  }, [setConfig, setLocale, i18n]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/markers/:id" element={<MarkerDetailPage />} />
          <Route path="/submit" element={<SubmitMarkerPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

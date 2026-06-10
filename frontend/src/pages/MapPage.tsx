import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ChevronRight,
  Filter,
  HandHeart,
  Languages,
  List,
  LocateFixed,
  LogIn,
  Map as MapIcon,
  Moon,
  Plus,
  Search,
  Sun,
  User,
  X,
} from 'lucide-react';
import { apiClient } from '@/services/api';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import MapComponent from '@/components/MapComponent';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import type { Marker } from '@/types/api';
import { getMarkerCategoryTone, isRiskCategory } from '@/utils/markerCategories';

const languageLabels: Record<string, string> = {
  'zh-CN': '中文',
  en: 'English',
  hi: 'हिन्दी',
};

type TrackFilter = 'all' | 'risk' | 'help';

export default function MapPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { config, currentLocale, setLocale, theme, setTheme } = useAppStore();
  const { isAuthenticated, user } = useAuthStore();

  const [mapCenter, setMapCenter] = useState<[number, number]>([39.9042, 116.4074]);
  const [searchRadius, setSearchRadius] = useState(3000);
  const [showList, setShowList] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [trackFilter, setTrackFilter] = useState<TrackFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const applyDefaultLocation = useCallback(() => {
    if (!config?.map_config) return;

    setMapCenter([config.map_config.default_center.lat, config.map_config.default_center.lng]);
  }, [config]);

  const requestLocation = useCallback(() => {
    if (!config?.map_config) return;

    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter([position.coords.latitude, position.coords.longitude]);
          setIsLocating(false);
        },
        (error) => {
          if (error.code !== error.PERMISSION_DENIED) {
            console.warn('Geolocation error:', error);
          }
          setMapCenter([config.map_config.default_center.lat, config.map_config.default_center.lng]);
          setIsLocating(false);
        },
        {
          timeout: 5000,
          maximumAge: 300000,
        }
      );
    } else {
      setMapCenter([config.map_config.default_center.lat, config.map_config.default_center.lng]);
      setIsLocating(false);
    }
  }, [config]);

  const {
    data: markers = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['markers', mapCenter[0], mapCenter[1], searchRadius, currentLocale],
    queryFn: () =>
      apiClient.getMarkers({
        lat: mapCenter[0],
        lng: mapCenter[1],
        radius: searchRadius,
        lang: currentLocale,
        limit: 100,
      }),
    enabled: !!config,
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    if (config?.map_config) {
      setSearchRadius(config.map_config.default_radius);
      applyDefaultLocation();
    }
  }, [applyDefaultLocation, config]);

  const filteredMarkers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase();

    return markers.filter((marker) => {
      const isRisk = isRiskCategory(marker.category);
      const matchesTrack =
        trackFilter === 'all' || (trackFilter === 'risk' && isRisk) || (trackFilter === 'help' && !isRisk);

      if (!matchesTrack) return false;
      if (!normalizedSearch) return true;

      const searchable = [
        marker.title,
        marker.description,
        marker.address,
        t(`marker.categories.${marker.category}`),
      ]
        .join(' ')
        .toLocaleLowerCase();

      return searchable.includes(normalizedSearch);
    });
  }, [markers, searchTerm, t, trackFilter]);

  const riskCount = useMemo(() => filteredMarkers.filter((marker) => isRiskCategory(marker.category)).length, [filteredMarkers]);
  const helpCount = filteredMarkers.length - riskCount;

  const handleMarkerClick = (marker: Marker) => {
    navigate(`/markers/${marker.id}`);
  };

  const handleLanguageChange = (locale: string) => {
    setLocale(locale);
    i18n.changeLanguage(locale);
    localStorage.setItem('locale', locale);
  };

  const handleApplyFilters = () => {
    setShowFilterPanel(false);
    refetch();
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const formatDistance = (distance?: number) => {
    if (distance === undefined) return t('mapHome.approximate');
    return distance < 1000 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(1)}km`;
  };

  if (!config) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <LoadingSpinner size="lg" text={t('common.loading')} />
      </div>
    );
  }

  const languages = config.supported_locales.map((code) => ({
    code,
    label: languageLabels[code] || code,
  }));

  return (
    <div className="firefly-map-shell relative flex min-h-screen flex-col overflow-hidden">
      <header className="pointer-events-none fixed inset-x-0 top-0 px-3 pt-3 sm:px-4" style={{ zIndex: 'var(--z-controls)' }}>
        <div className="pointer-events-auto mx-auto flex max-w-5xl items-center gap-2">
          <div className="ff-control flex min-w-0 flex-1 items-center gap-3 px-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: 'var(--color-help-soft)', color: 'var(--color-primary)' }}>
              <HandHeart size={18} strokeWidth={2.4} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-bold leading-5" style={{ color: 'var(--color-text-strong)' }}>
                {t('app.title')}
              </h1>
              <p className="truncate text-[12px] leading-4" style={{ color: 'var(--color-muted)' }}>
                {t('mapHome.communityMode')} · {t('mapHome.live')}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="ff-icon-button shrink-0"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? t('mapHome.theme.switchToLight') : t('mapHome.theme.switchToDark')}
            title={theme === 'dark' ? t('mapHome.theme.switchToLight') : t('mapHome.theme.switchToDark')}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <Link
            to={isAuthenticated ? '/profile' : '/login'}
            className="ff-icon-button shrink-0"
            aria-label={isAuthenticated ? t('mapHome.profile') : t('mapHome.signIn')}
            title={isAuthenticated ? user?.username || t('mapHome.profile') : t('mapHome.signIn')}
          >
            {isAuthenticated ? <User size={18} /> : <LogIn size={18} />}
          </Link>
        </div>

        <div className="pointer-events-auto mx-auto mt-2 flex max-w-5xl gap-2">
          <label className="ff-control flex min-w-0 flex-1 items-center gap-2 px-3">
            <Search size={17} style={{ color: 'var(--color-muted)' }} />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[color:var(--color-muted)]"
              style={{ color: 'var(--color-text-strong)' }}
              placeholder={t('mapHome.searchPlaceholder')}
            />
          </label>
          <button
            type="button"
            className="ff-icon-button shrink-0"
            onClick={requestLocation}
            aria-label={t('mapHome.locate')}
            title={t('mapHome.locate')}
          >
            <LocateFixed size={18} className={isLocating ? 'animate-pulse' : ''} />
          </button>
          <button
            type="button"
            className="ff-icon-button shrink-0"
            onClick={() => setShowFilterPanel(true)}
            aria-label={t('mapHome.filters')}
            title={t('mapHome.filters')}
          >
            <Filter size={18} />
          </button>
        </div>

        <div className="pointer-events-auto mx-auto mt-2 flex max-w-5xl gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            className="ff-chip shrink-0 px-3 text-[13px] font-semibold"
            data-active={trackFilter === 'all'}
            onClick={() => setTrackFilter('all')}
          >
            {t('common.all')}
          </button>
          <button
            type="button"
            className="ff-chip inline-flex shrink-0 items-center gap-1.5 px-3 text-[13px] font-semibold"
            data-active={trackFilter === 'risk'}
            data-tone="risk"
            onClick={() => setTrackFilter('risk')}
          >
            <AlertTriangle size={15} />
            {t('mapHome.riskCount', { count: riskCount })}
          </button>
          <button
            type="button"
            className="ff-chip inline-flex shrink-0 items-center gap-1.5 px-3 text-[13px] font-semibold"
            data-active={trackFilter === 'help'}
            onClick={() => setTrackFilter('help')}
          >
            <HandHeart size={15} />
            {t('mapHome.helpCount', { count: helpCount })}
          </button>
        </div>
      </header>

      <main className="relative flex-1">
        <div className={`absolute inset-0 ${showList ? 'hidden' : 'block'}`}>
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <LoadingSpinner size="lg" text={t('common.loading')} />
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center p-6">
              <ErrorMessage message={(error as Error).message || t('common.error')} onRetry={() => refetch()} />
            </div>
          ) : (
            <MapComponent
              center={mapCenter}
              zoom={config.map_config.default_zoom}
              markers={filteredMarkers}
              theme={theme}
              onMarkerClick={handleMarkerClick}
            />
          )}
        </div>

        <div
          className={`absolute inset-0 overflow-y-auto px-3 pb-44 pt-36 sm:px-4 ${showList ? 'block' : 'hidden'}`}
          style={{ background: 'var(--color-bg)' }}
        >
          <div className="mx-auto max-w-3xl space-y-2">
            {filteredMarkers.length === 0 ? (
              <EmptyState />
            ) : (
              filteredMarkers.map((marker) => (
                <MarkerRow
                  key={marker.id}
                  marker={marker}
                  onOpen={() => handleMarkerClick(marker)}
                  formatDistance={formatDistance}
                />
              ))
            )}
          </div>
        </div>
      </main>

      <section
        className="fixed inset-x-0 bottom-0 px-3 pb-3 sm:px-4"
        style={{ zIndex: 'var(--z-sheet)' }}
        aria-label={t('mapHome.sheetTitle')}
      >
        <div className="mx-auto max-w-5xl rounded-xl border p-3" style={{ borderColor: 'var(--color-border-soft)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-panel)' }}>
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold" style={{ color: 'var(--color-primary)' }}>
                {t('mapHome.nearbySummary', { count: filteredMarkers.length })}
              </p>
              <h2 className="text-[18px] font-bold leading-6" style={{ color: 'var(--color-text-strong)' }}>
                {t('mapHome.sheetTitle')}
              </h2>
              <p className="text-[13px] leading-5" style={{ color: 'var(--color-muted)' }}>
                {t('mapHome.sheetSubtitle')}
              </p>
            </div>
            <div className="flex shrink-0 rounded-lg border p-1" style={{ borderColor: 'var(--color-border-soft)', background: 'var(--color-control)' }}>
              <button
                type="button"
                className="inline-flex h-8 min-w-10 items-center justify-center rounded-md px-2 text-[12px] font-semibold"
                style={{
                  background: !showList ? 'var(--color-surface)' : 'transparent',
                  color: 'var(--color-text-strong)',
                }}
                onClick={() => setShowList(false)}
                aria-label={t('mapHome.view.map')}
              >
                <MapIcon size={16} />
              </button>
              <button
                type="button"
                className="inline-flex h-8 min-w-10 items-center justify-center rounded-md px-2 text-[12px] font-semibold"
                style={{
                  background: showList ? 'var(--color-surface)' : 'transparent',
                  color: 'var(--color-text-strong)',
                }}
                onClick={() => setShowList(true)}
                aria-label={t('mapHome.view.list')}
              >
                <List size={16} />
              </button>
            </div>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2">
            <SummaryTile icon={<AlertTriangle size={17} />} label={t('mapHome.riskCount', { count: riskCount })} tone="risk" />
            <SummaryTile icon={<HandHeart size={17} />} label={t('mapHome.helpCount', { count: helpCount })} tone="help" />
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <p className="rounded-lg border px-3 py-2 text-[13px] leading-5" style={{ borderColor: 'var(--color-border-soft)', color: 'var(--color-muted)' }}>
              {t('mapHome.submitHint')}
            </p>
            <Link to="/submit" className="ff-action inline-flex items-center justify-center gap-2 px-4 text-[15px]">
              <Plus size={18} />
              {t('mapHome.submitAid')}
            </Link>
          </div>
        </div>
      </section>

      {showFilterPanel && (
        <div
          className="fixed inset-0 flex items-end bg-black/55 px-3 pb-3"
          style={{ zIndex: 'var(--z-modal-backdrop)' }}
          onClick={() => setShowFilterPanel(false)}
        >
          <div
            className="mx-auto w-full max-w-xl rounded-xl border p-4"
            style={{ borderColor: 'var(--color-border-soft)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-panel)', zIndex: 'var(--z-modal)' }}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t('mapHome.filterTitle')}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[20px] font-bold leading-7" style={{ color: 'var(--color-text-strong)' }}>
                  {t('mapHome.filterTitle')}
                </h2>
                <p className="text-[13px] leading-5" style={{ color: 'var(--color-muted)' }}>
                  {t('mapHome.filterSubtitle')}
                </p>
              </div>
              <button type="button" className="ff-icon-button" onClick={() => setShowFilterPanel(false)} aria-label={t('common.close')}>
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5">
              <FilterGroup label={t('mapHome.radius')} icon={<LocateFixed size={17} />}>
                <div className="grid grid-cols-4 gap-2">
                  {[1000, 3000, 5000, 10000].map((radius) => (
                    <button
                      key={radius}
                      type="button"
                      onClick={() => setSearchRadius(radius)}
                      className="ff-chip px-2 text-[13px] font-bold"
                      data-active={searchRadius === radius}
                    >
                      {radius / 1000}km
                    </button>
                  ))}
                </div>
              </FilterGroup>

              <FilterGroup label={t('mapHome.language')} icon={<Languages size={17} />}>
                <div className="grid grid-cols-3 gap-2">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => handleLanguageChange(lang.code)}
                      className="ff-chip px-2 text-[13px] font-bold"
                      data-active={currentLocale === lang.code}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </FilterGroup>

              <FilterGroup label={t('mapHome.view.map')} icon={<MapIcon size={17} />}>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowList(false)}
                    className="ff-chip inline-flex items-center justify-center gap-2 px-3 text-[13px] font-bold"
                    data-active={!showList}
                  >
                    <MapIcon size={16} />
                    {t('mapHome.view.map')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowList(true)}
                    className="ff-chip inline-flex items-center justify-center gap-2 px-3 text-[13px] font-bold"
                    data-active={showList}
                  >
                    <List size={16} />
                    {t('mapHome.view.list')}
                  </button>
                </div>
              </FilterGroup>

              <button type="button" onClick={handleApplyFilters} className="ff-action w-full px-4 text-[15px]">
                {t('mapHome.applyFilters')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function EmptyState() {
    return (
      <div className="rounded-lg border p-5 text-center" style={{ borderColor: 'var(--color-border-soft)', background: 'var(--color-surface)' }}>
        <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-lg" style={{ background: 'var(--color-help-soft)', color: 'var(--color-primary)' }}>
          <HandHeart size={22} />
        </div>
        <h2 className="text-[18px] font-bold" style={{ color: 'var(--color-text-strong)' }}>
          {t('mapHome.emptyTitle')}
        </h2>
        <p className="mt-1 text-[14px] leading-6" style={{ color: 'var(--color-muted)' }}>
          {t('mapHome.emptyBody')}
        </p>
        <Link to="/submit" className="ff-action mt-4 inline-flex items-center justify-center gap-2 px-4 text-[14px]">
          <Plus size={17} />
          {t('mapHome.submitAid')}
        </Link>
      </div>
    );
  }

  function MarkerRow({
    marker,
    onOpen,
    formatDistance,
  }: {
    marker: Marker;
    onOpen: () => void;
    formatDistance: (distance?: number) => string;
  }) {
    const tone = getMarkerCategoryTone(marker.category);
    const risk = isRiskCategory(marker.category);

    return (
      <button
        type="button"
        onClick={onOpen}
        className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-[color:var(--color-surface-2)]"
        style={{ borderColor: 'var(--color-border-soft)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
      >
        <div className="flex gap-3">
          <div
            className={`grid h-9 w-9 shrink-0 place-items-center text-[15px] font-black text-white ${risk ? 'rounded-md' : 'rounded-full'}`}
            style={{ background: tone.markerColor }}
          >
            {tone.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-start justify-between gap-2">
              <h3 className="line-clamp-2 text-[15px] font-bold leading-5" style={{ color: 'var(--color-text-strong)' }}>
                {marker.title}
              </h3>
              <ChevronRight size={17} className="mt-0.5 shrink-0" style={{ color: 'var(--color-muted)' }} />
            </div>
            <p className="line-clamp-2 text-[13px] leading-5" style={{ color: 'var(--color-muted)' }}>
              {marker.description}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] font-semibold">
              <span className={tone.badgeClass + ' rounded-full px-2 py-1'}>{t(`marker.categories.${marker.category}`)}</span>
              <span style={{ color: 'var(--color-muted)' }}>{formatDistance(marker.distance_m)}</span>
              <span style={{ color: 'var(--color-muted)' }}>
                {t('mapHome.confidence')} {(marker.confidence_score * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </button>
    );
  }

  function SummaryTile({ icon, label, tone }: { icon: React.ReactNode; label: string; tone: 'risk' | 'help' }) {
    return (
      <div
        className="flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-bold"
        style={{
          borderColor: tone === 'risk' ? 'rgba(213, 139, 42, 0.42)' : 'rgba(255, 107, 87, 0.38)',
          background: tone === 'risk' ? 'var(--color-warning-soft)' : 'var(--color-help-soft)',
          color: 'var(--color-text-strong)',
        }}
      >
        <span style={{ color: tone === 'risk' ? 'var(--color-warning)' : 'var(--color-primary)' }}>{icon}</span>
        <span className="truncate">{label}</span>
      </div>
    );
  }

  function FilterGroup({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
      <section>
        <div className="mb-2 flex items-center gap-2 text-[13px] font-bold" style={{ color: 'var(--color-text-strong)' }}>
          <span style={{ color: 'var(--color-primary)' }}>{icon}</span>
          {label}
        </div>
        {children}
      </section>
    );
  }
}

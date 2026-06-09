import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  HandHeart,
  ImagePlus,
  LocateFixed,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { apiClient } from '@/services/api';
import { useAppStore } from '@/store/appStore';
import MapComponent from '@/components/MapComponent';
import ImageUpload from '@/components/ImageUpload';
import type { SubmitMarkerInput } from '@/types/api';
import { ADOPTION_CATEGORY, isAdoptionCategory, isRiskCategory } from '@/utils/markerCategories';

export default function SubmitMarkerPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { config, currentLocale, theme } = useAppStore();
  const [formData, setFormData] = useState<SubmitMarkerInput>({
    category: 'abuse',
    title: '',
    latitude: 39.9042,
    longitude: 116.4074,
    address: '',
    description: '',
    sourceLocale: currentLocale,
  });
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [showMap, setShowMap] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [freeAdoptionConfirmed, setFreeAdoptionConfirmed] = useState(false);

  const submitMutation = useMutation({
    mutationFn: (data: SubmitMarkerInput) => apiClient.submitMarker(data),
    onSuccess: (result) => {
      navigate('/', { state: { message: t('submitFlow.successMessage', { id: result.id }) } });
    },
    onError: (error: Error) => {
      alert(`${t('common.error')}: ${error.message}`);
    },
  });

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert(t('submitFlow.locationUnsupported'));
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((current) => ({
          ...current,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setIsGettingLocation(false);
      },
      (error) => {
        setIsGettingLocation(false);
        alert(t('submitFlow.locationFailed', { message: error.message }));
      }
    );
  };

  const handleMapClick = (lat: number, lng: number) => {
    setFormData({ ...formData, latitude: lat, longitude: lng });
    setShowMap(false);
  };

  const handleSubmit = (event?: React.FormEvent | React.MouseEvent) => {
    event?.preventDefault();
    if (isAdoptionCategory(formData.category) && !freeAdoptionConfirmed) {
      alert(t('marker.adoption.freeOnlyConfirm'));
      return;
    }
    submitMutation.mutate({ ...formData, sourceLocale: currentLocale });
  };

  const allCategories = config ? [...config.marker_categories.risk, ...config.marker_categories.help] : [];
  const isAdoption = isAdoptionCategory(formData.category);
  const selectedIsRisk = isRiskCategory(formData.category);

  return (
    <div className="ff-page">
      <header className="ff-page-header">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link to="/" className="ff-icon-button shrink-0" aria-label={t('nav.backToMap')}>
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-[19px] font-bold leading-6" style={{ color: 'var(--color-text-strong)' }}>
              {t('marker.submit')}
            </h1>
            <p className="text-[13px] leading-5" style={{ color: 'var(--color-muted)' }}>
              {t('submitFlow.subtitle')}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5 pb-28">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Panel
            title={t('marker.category')}
            hint={t('submitFlow.categoryHint')}
            icon={selectedIsRisk ? <AlertTriangle size={18} /> : <HandHeart size={18} />}
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {allCategories.map((category) => {
                const risk = isRiskCategory(category);
                const active = formData.category === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, category });
                      if (category !== ADOPTION_CATEGORY) {
                        setFreeAdoptionConfirmed(false);
                      }
                    }}
                    className="ff-chip inline-flex items-center justify-center gap-2 px-3 text-[13px] font-bold"
                    data-active={active}
                    data-tone={risk ? 'risk' : 'help'}
                  >
                    {risk ? <AlertTriangle size={15} /> : <HandHeart size={15} />}
                    <span className="truncate">{t(`marker.categories.${category}`)}</span>
                  </button>
                );
              })}
            </div>

            {isAdoption && (
              <div className="mt-4 rounded-lg border p-4" style={{ borderColor: 'rgba(255, 154, 168, 0.5)', background: 'var(--color-help-soft)' }}>
                <div className="mb-1 flex items-center gap-2 text-[14px] font-bold" style={{ color: 'var(--color-text-strong)' }}>
                  <ShieldCheck size={17} style={{ color: 'var(--color-primary)' }} />
                  {t('marker.adoption.freeOnlyTitle')}
                </div>
                <p className="mb-3 text-[13px] leading-5" style={{ color: 'var(--color-muted)' }}>
                  {t('marker.adoption.freeOnlyNotice')}
                </p>
                <label className="flex items-start gap-3 text-[14px] leading-5" style={{ color: 'var(--color-text)' }}>
                  <input
                    type="checkbox"
                    checked={freeAdoptionConfirmed}
                    onChange={(event) => setFreeAdoptionConfirmed(event.target.checked)}
                    className="mt-1 h-4 w-4 accent-[#FF6B57]"
                    required={isAdoption}
                  />
                  <span>{t('marker.adoption.freeOnlyConfirm')}</span>
                </label>
              </div>
            )}
          </Panel>

          <Panel title={t('marker.title')} icon={<Check size={18} />}>
            <input
              type="text"
              value={formData.title}
              onChange={(event) => setFormData({ ...formData, title: event.target.value })}
              className="ff-field"
              required
              maxLength={200}
              placeholder={isAdoption ? t('marker.adoption.titlePlaceholder') : t('submitFlow.titlePlaceholder')}
            />
          </Panel>

          <Panel title={t('marker.location')} hint={t('submitFlow.locationHint')} icon={<MapPin size={18} />}>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={isGettingLocation}
                className="ff-secondary-action inline-flex items-center justify-center gap-2 px-3 text-[14px] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LocateFixed size={17} className={isGettingLocation ? 'animate-pulse' : ''} />
                {isGettingLocation ? t('submitFlow.locating') : t('submitFlow.useCurrentLocation')}
              </button>
              <button
                type="button"
                onClick={() => setShowMap(!showMap)}
                className="ff-secondary-action inline-flex items-center justify-center gap-2 px-3 text-[14px]"
              >
                <MapPin size={17} />
                {showMap ? t('submitFlow.donePicking') : t('submitFlow.pickOnMap')}
              </button>
            </div>

            {showMap && (
              <div className="mb-3 overflow-hidden rounded-lg border" style={{ borderColor: 'var(--color-border-soft)' }}>
                <div className="h-64">
                  <MapComponent
                    center={[formData.latitude, formData.longitude]}
                    zoom={15}
                    markers={[]}
                    theme={theme}
                    onMapClick={handleMapClick}
                  />
                </div>
                <div className="p-3 text-center text-[13px] font-semibold" style={{ background: 'var(--color-surface-2)', color: 'var(--color-muted)' }}>
                  {t('marker.clickMapToSelect')}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 rounded-lg border p-3" style={{ borderColor: 'var(--color-border-soft)', background: 'var(--color-surface-2)' }}>
              <Coordinate label={t('marker.latitude')} value={formData.latitude.toFixed(6)} />
              <Coordinate label={t('marker.longitude')} value={formData.longitude.toFixed(6)} />
            </div>
          </Panel>

          <Panel title={t('marker.address')} icon={<MapPin size={18} />}>
            <input
              type="text"
              value={formData.address}
              onChange={(event) => setFormData({ ...formData, address: event.target.value })}
              className="ff-field"
              required
              maxLength={500}
              placeholder={t('submitFlow.addressPlaceholder')}
            />
          </Panel>

          <Panel title={t('marker.description')} icon={<HandHeart size={18} />}>
            <textarea
              value={formData.description}
              onChange={(event) => setFormData({ ...formData, description: event.target.value })}
              className="ff-field min-h-32 resize-none"
              rows={5}
              required
              maxLength={2000}
              placeholder={isAdoption ? t('marker.adoption.descriptionPlaceholder') : t('submitFlow.descriptionPlaceholder')}
            />
            {isAdoption && (
              <p className="mt-2 text-[13px] leading-5" style={{ color: 'var(--color-muted)' }}>
                {t('marker.adoption.privacyHint')}
              </p>
            )}
          </Panel>

          <Panel title={t('marker.contactInfoOptional')} hint={t('detail.privacyNotice')} icon={<ShieldCheck size={18} />}>
            <input
              type="text"
              value={formData.contactInfo || ''}
              onChange={(event) => setFormData({ ...formData, contactInfo: event.target.value })}
              className="ff-field"
              maxLength={500}
              placeholder={isAdoption ? t('marker.adoption.contactPlaceholder') : t('submitFlow.contactPlaceholder')}
            />
          </Panel>

          <Panel title={t('submitFlow.uploadMedia')} icon={<ImagePlus size={18} />}>
            <ImageUpload onUploadSuccess={(urls) => setImageUrls(urls)} maxFiles={5} />
            {imageUrls.length > 0 && (
              <div className="mt-3 text-[13px] font-semibold" style={{ color: 'var(--color-success)' }}>
                {t('submitFlow.uploadReady', { count: imageUrls.length })}
              </div>
            )}
          </Panel>
        </form>
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t p-4" style={{ zIndex: 'var(--z-sheet)', borderColor: 'var(--color-border-soft)', background: 'var(--color-surface)' }}>
        <div className="mx-auto flex max-w-2xl gap-3">
          <Link to="/" className="ff-secondary-action flex flex-1 items-center justify-center px-4 text-[15px]">
            {t('common.cancel')}
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
            className="ff-action flex-[2] px-4 text-[15px] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitMutation.isPending ? t('submitFlow.submitting') : t('submitFlow.submitReport')}
          </button>
        </div>
      </div>
    </div>
  );

  function Panel({
    title,
    hint,
    icon,
    children,
  }: {
    title: string;
    hint?: string;
    icon: React.ReactNode;
    children: React.ReactNode;
  }) {
    return (
      <section className="ff-panel p-4">
        <div className="mb-3 flex items-start gap-2">
          <span className="mt-0.5" style={{ color: selectedIsRisk ? 'var(--color-warning)' : 'var(--color-primary)' }}>
            {icon}
          </span>
          <div>
            <h2 className="text-[15px] font-bold leading-5" style={{ color: 'var(--color-text-strong)' }}>
              {title}
            </h2>
            {hint && (
              <p className="mt-0.5 text-[13px] leading-5" style={{ color: 'var(--color-muted)' }}>
                {hint}
              </p>
            )}
          </div>
        </div>
        {children}
      </section>
    );
  }

  function Coordinate({ label, value }: { label: string; value: string }) {
    return (
      <div>
        <div className="text-[12px] font-semibold" style={{ color: 'var(--color-muted)' }}>
          {label}
        </div>
        <div className="font-mono text-[13px] font-bold" style={{ color: 'var(--color-text-strong)' }}>
          {value}
        </div>
      </div>
    );
  }
}

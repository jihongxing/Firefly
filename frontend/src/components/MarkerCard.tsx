import { useTranslation } from 'react-i18next';
import type { Marker } from '@/types/api';
import { getMarkerCategoryTone, isAdoptionCategory } from '@/utils/markerCategories';

interface MarkerCardProps {
  marker: Marker;
  onClick?: () => void;
}

export default function MarkerCard({ marker, onClick }: MarkerCardProps) {
  const { t } = useTranslation();

  const tone = getMarkerCategoryTone(marker.category);

  return (
    <div
      onClick={onClick}
      className="bg-[#1D2632] rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer p-4 border border-[#435064]"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-[#F4F7FA] flex-1">{marker.title}</h3>
        <span className={`text-xs px-2 py-1 rounded-full ${tone.badgeClass}`}>
          {t(`marker.categories.${marker.category}`)}
        </span>
      </div>

      {isAdoptionCategory(marker.category) && (
        <p className="text-xs text-[#FF9AA8] mb-2">{t('marker.adoption.freeOnlyNotice')}</p>
      )}

      <p className="text-sm text-[#D8DEE7] mb-2 line-clamp-2">{marker.description}</p>

      <div className="flex items-center justify-between text-xs text-[#8C98A8]">
        <span>📍 {marker.address}</span>
        {marker.distance_m !== undefined && (
          <span className="font-medium">
            {marker.distance_m < 1000
              ? `${marker.distance_m}m`
              : `${(marker.distance_m / 1000).toFixed(1)}km`}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs">
        <span
          className={`px-2 py-1 rounded ${
            marker.consensus_status === 'verified'
              ? 'bg-blue-950/50 text-blue-200'
              : marker.consensus_status === 'disputed'
              ? 'bg-amber-950/50 text-amber-200'
              : 'bg-[#273241] text-[#D8DEE7]'
          }`}
        >
          {marker.consensus_status}
        </span>
        <span className="text-[#8C98A8]">置信度: {(marker.confidence_score * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

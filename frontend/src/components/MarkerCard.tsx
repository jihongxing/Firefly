import { useTranslation } from 'react-i18next';
import type { Marker } from '@/types/api';

interface MarkerCardProps {
  marker: Marker;
  onClick?: () => void;
}

export default function MarkerCard({ marker, onClick }: MarkerCardProps) {
  const { t } = useTranslation();

  const getCategoryColor = (category: string) => {
    const riskCategories = ['abuse', 'poison', 'trap', 'theft', 'missing_pet', 'suspicious_vehicle'];
    return riskCategories.includes(category) ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer p-4 border border-gray-200"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-gray-900 flex-1">{marker.title}</h3>
        <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(marker.category)}`}>
          {t(`marker.categories.${marker.category}`)}
        </span>
      </div>

      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{marker.description}</p>

      <div className="flex items-center justify-between text-xs text-gray-500">
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
              ? 'bg-blue-100 text-blue-800'
              : marker.consensus_status === 'disputed'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {marker.consensus_status}
        </span>
        <span className="text-gray-600">置信度: {(marker.confidence_score * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

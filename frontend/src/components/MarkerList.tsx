import type { Marker } from '@/types/api';
import MarkerCard from './MarkerCard';

interface MarkerListProps {
  markers: Marker[];
  onMarkerClick: (marker: Marker) => void;
  isLoading?: boolean;
}

export default function MarkerList({ markers, onMarkerClick, isLoading }: MarkerListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (markers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500">附近没有找到标记</p>
        <p className="text-sm text-gray-400 mt-2">尝试移动地图或扩大搜索范围</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {markers.map((marker) => (
        <MarkerCard key={marker.id} marker={marker} onClick={() => onMarkerClick(marker)} />
      ))}
    </div>
  );
}

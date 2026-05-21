interface MapPanelProps {
  selectedPlaceName?: string;
}

export default function MapPanel({ selectedPlaceName }: MapPanelProps) {
  return (
    <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center gap-3 relative">
      <span className="text-6xl">🗺️</span>
      <p className="text-sm font-medium text-gray-500">지도 영역 (Google Maps 연동 예정)</p>

      {selectedPlaceName && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2.5 bg-white rounded-xl border border-orange-200 shadow-md">
          <p className="text-sm font-semibold text-orange-600 whitespace-nowrap">
            📍 {selectedPlaceName}
          </p>
        </div>
      )}
    </div>
  );
}

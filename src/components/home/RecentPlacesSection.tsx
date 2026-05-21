const recentPlaces = [
  {
    id: 1,
    name: "하이어그라운드",
    category: "Cafe",
    categoryIcon: "☕",
    area: "유성구",
    bgColor: "from-amber-100 to-orange-50",
    conditions: [
      { label: "실내", value: "확인 필요", status: "warning" as const },
      { label: "이동장", value: "필요", status: "bad" as const },
    ],
    verifiedAt: "2026.05.20",
  },
  {
    id: 2,
    name: "카페몽",
    category: "Cafe",
    categoryIcon: "☕",
    area: "서구",
    bgColor: "from-sky-100 to-blue-50",
    conditions: [
      { label: "실내", value: "가능", status: "good" as const },
      { label: "이동장", value: "불필요", status: "good" as const },
    ],
    verifiedAt: "2026.05.18",
  },
  {
    id: 3,
    name: "대전 산책지",
    category: "Travel Spot",
    categoryIcon: "🌿",
    area: "유성구",
    bgColor: "from-green-100 to-emerald-50",
    conditions: [
      { label: "크기", value: "전체 가능", status: "good" as const },
    ],
    verifiedAt: "2026.05.17",
  },
];

const statusIcon = { good: "✅", warning: "⚠️", bad: "❌" } as const;
const statusColor = {
  good: "text-green-700",
  warning: "text-amber-700",
  bad: "text-red-600",
} as const;

export default function RecentPlacesSection() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">
          대전에서 최근 확인된 장소
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentPlaces.map((place) => (
            <div
              key={place.id}
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-orange-200 transition-all cursor-pointer"
            >
              <div
                className={`w-full h-44 bg-gradient-to-br ${place.bgColor} flex items-center justify-center`}
              >
                <span className="text-6xl">{place.categoryIcon}</span>
              </div>
              <div className="p-5">
                <p className="text-xs text-gray-400 mb-0.5">
                  {place.category} · {place.area}
                </p>
                <h3 className="font-bold text-gray-900 text-base mb-3">
                  {place.name}
                </h3>
                <div className="space-y-1.5">
                  {place.conditions.map((c) => (
                    <div key={c.label} className="flex items-center gap-1.5 text-sm">
                      <span>{statusIcon[c.status]}</span>
                      <span className="text-gray-500">{c.label}:</span>
                      <span className={`font-medium ${statusColor[c.status]}`}>
                        {c.value}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  확인일: {place.verifiedAt}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-10">
          <button className="px-8 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 active:bg-orange-700 transition-colors">
            지도에서 전체 장소 보기
          </button>
        </div>
      </div>
    </section>
  );
}

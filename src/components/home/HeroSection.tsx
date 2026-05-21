export default function HeroSection() {
  return (
    <section className="bg-gradient-to-b from-orange-50 via-amber-50 to-white pt-16 pb-14">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-5">
          반려견과 갈 수 있는 장소를
          <br />
          지도에서 쉽게 확인하세요
        </h1>
        <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-10">
          카페, 음식점, 여행지, 동물병원을 카테고리별로 찾고
          <br className="hidden sm:block" />
          실내 가능 여부, 이동장 조건, 강아지 크기 제한,
          <br className="hidden sm:block" />
          유의사항을 방문 전에 확인할 수 있습니다.
        </p>

        {/* Illustration */}
        <div className="flex justify-center mb-10">
          <div className="w-64 h-44 bg-white rounded-3xl shadow-md border border-orange-100 flex flex-col items-center justify-center gap-2">
            <div className="flex items-end gap-2">
              <span className="text-5xl">🐕</span>
              <span className="text-4xl mb-1">🗺️</span>
            </div>
            <p className="text-sm text-gray-400 font-medium">강아지 + 지도 일러스트</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-2 max-w-xl mx-auto mb-6">
          <input
            type="text"
            placeholder="대전 카페, 유성구 음식점, 근처 동물병원 검색"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
          <button className="px-5 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 active:bg-orange-700 transition-colors shrink-0">
            검색
          </button>
        </div>

        {/* Quick buttons */}
        <div className="flex flex-wrap justify-center gap-2">
          {[
            { icon: "☕", label: "카페 찾기" },
            { icon: "🍽️", label: "음식점 찾기" },
            { icon: "🌿", label: "여행지 찾기" },
            { icon: "🏥", label: "동물병원" },
          ].map(({ icon, label }) => (
            <button
              key={label}
              className="px-5 py-2.5 border-2 border-orange-200 text-orange-700 bg-white rounded-xl text-sm font-medium hover:bg-orange-50 transition-colors"
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

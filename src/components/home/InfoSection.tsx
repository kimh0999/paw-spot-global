const infoItems = [
  {
    icon: "🏠",
    title: "실내 동반 가능 여부",
    description: "실내 가능인지, 야외석만 가능한지",
  },
  {
    icon: "🧳",
    title: "이동장/유모차 조건",
    description: "이동장이나 유모차가 필요한지 확인",
  },
  {
    icon: "📏",
    title: "강아지 크기 제한",
    description: "소형견, 중형견, 대형견 가능 여부 확인",
  },
  {
    icon: "⚠️",
    title: "유의사항",
    description: "목줄, 배변봉투, 입장 제한 조건 확인",
  },
  {
    icon: "📅",
    title: "마지막 확인일",
    description: "언제, 어떤 방식으로 확인했는지 표시",
  },
];

export default function InfoSection() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">
          방문 전 확인할 정보
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {infoItems.map((item) => (
            <div
              key={item.title}
              className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-orange-200 transition-colors"
            >
              <div className="text-2xl mb-3">{item.icon}</div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                {item.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

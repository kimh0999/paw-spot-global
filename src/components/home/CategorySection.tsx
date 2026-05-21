import Link from "next/link";

const categories = [
  {
    icon: "☕",
    title: "카페",
    description: "주변 반려견 동반 카페를 지도에서 확인",
    href: "/places?category=cafe",
    label: "카페 보기",
  },
  {
    icon: "🍽️",
    title: "음식점",
    description: "반려견과 식사 가능한 장소를 조건별로 확인",
    href: "/places?category=restaurant",
    label: "음식점 보기",
  },
  {
    icon: "🌿",
    title: "여행지",
    description: "산책지, 공원, 관광지 정보를 확인",
    href: "/places?category=travel",
    label: "여행지 보기",
  },
  {
    icon: "🏥",
    title: "동물병원",
    description: "가까운 동물병원과 전화번호를 확인",
    href: "/vets",
    label: "동물병원 보기",
  },
];

export default function CategorySection() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">
          카테고리로 주변 장소 찾기
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.title}
              className="bg-gray-50 rounded-2xl p-6 hover:bg-orange-50 transition-colors group"
            >
              <div className="text-3xl mb-3">{cat.icon}</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {cat.title}
              </h3>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                {cat.description}
              </p>
              <Link
                href={cat.href}
                className="text-sm font-semibold text-orange-600 group-hover:text-orange-700 transition-colors"
              >
                {cat.label} →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

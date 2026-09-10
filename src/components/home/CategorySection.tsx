import CategoryPlaceTabs from "@/components/home/CategoryPlaceTabs";
import type { CategoryPlacesResult } from "@/types/place";

interface CategorySectionProps {
  initialResult: CategoryPlacesResult;
  favoritePlaceIds: string[];
}

/**
 * 홈의 장소 탐색 영역.
 *
 * 제목·장소 개수·전체 보기는 **한 덩어리의 머리말**이고, 그 개수는 고른 카테고리에 따라
 * 바뀐다. 그래서 머리말은 이 서버 컴포넌트가 아니라 탭 상태를 가진 쪽이 그린다 — 여기서
 * 제목만 따로 그리면 같이 읽어야 할 세 정보가 탭을 사이에 두고 갈라진다(DESIGN.md §5 Home).
 */
export default async function CategorySection({
  initialResult,
  favoritePlaceIds,
}: CategorySectionProps) {
  return (
    // `#categories`는 예전 헤더 메뉴가 가리키던 앵커다. 기존 링크가 깨지지 않도록 남긴다.
    <section id="categories" className="scroll-mt-16 bg-surface py-10 lg:py-12">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <CategoryPlaceTabs
          initialResult={initialResult}
          favoritePlaceIds={favoritePlaceIds}
          referenceDate={new Date()}
        />
      </div>
    </section>
  );
}

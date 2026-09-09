import { getTranslations } from "next-intl/server";

import CategoryPlaceTabs from "@/components/home/CategoryPlaceTabs";
import type { CategoryPlacesResult } from "@/types/place";

interface CategorySectionProps {
  initialResult: CategoryPlacesResult;
  favoritePlaceIds: string[];
}

export default async function CategorySection({
  initialResult,
  favoritePlaceIds,
}: CategorySectionProps) {
  const t = await getTranslations("home.categories");

  return (
    // `#categories`는 예전 헤더 메뉴가 가리키던 앵커다. 기존 링크가 깨지지 않도록 남긴다.
    <section id="categories" className="scroll-mt-16 bg-surface py-10 lg:py-12">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <h2 className="mb-5 text-xl font-bold text-content">{t("title")}</h2>

        <CategoryPlaceTabs
          initialResult={initialResult}
          favoritePlaceIds={favoritePlaceIds}
          referenceDate={new Date()}
        />
      </div>
    </section>
  );
}

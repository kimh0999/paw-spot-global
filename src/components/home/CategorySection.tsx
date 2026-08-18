import { getTranslations } from "next-intl/server";

import CategoryPlaceTabs from "@/components/home/CategoryPlaceTabs";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getFavoritePlaceIds } from "@/lib/favorites/queries";
import { getCategoryPlaces } from "@/lib/places/queries";

export default async function CategorySection() {
  const t = await getTranslations("home.categories");

  // 첫 화면은 `전체` 탭이므로 그만큼만 서버에서 조회한다. 나머지 탭은 선택할 때 Server Action으로 가져온다.
  const user = await getCurrentUser();
  const [initialResult, favoritePlaceIds] = await Promise.all([
    getCategoryPlaces("all"),
    user ? getFavoritePlaceIds(user.id) : Promise.resolve<string[]>([]),
  ]);

  return (
    <section id="categories" className="scroll-mt-16 bg-surface py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-content">{t("title")}</h2>

        <CategoryPlaceTabs
          initialResult={initialResult}
          favoritePlaceIds={favoritePlaceIds}
          referenceDate={new Date()}
        />
      </div>
    </section>
  );
}

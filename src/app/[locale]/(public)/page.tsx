import { getTranslations } from "next-intl/server";

import Header from "@/components/Header";
import HeroSection from "@/components/home/HeroSection";
import CategorySection from "@/components/home/CategorySection";
import InfoSection from "@/components/home/InfoSection";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getFavoritePlaceIds } from "@/lib/favorites/queries";
import { getCategoryPlaces } from "@/lib/places/queries";

export default async function Home() {
  const t = await getTranslations("home");

  // 첫 화면은 `전체` 탭이므로 그만큼만 서버에서 조회한다. 나머지 탭은 선택할 때 Server Action으로 가져온다.
  // 히어로의 장소 수와 목록이 같은 조회 결과를 쓰도록 여기서 한 번만 부른다.
  const user = await getCurrentUser();
  const [initialResult, favoritePlaceIds] = await Promise.all([
    getCategoryPlaces("all"),
    user ? getFavoritePlaceIds(user.id) : Promise.resolve<string[]>([]),
  ]);

  return (
    <>
      <Header />
      <main id="main-content" tabIndex={-1}>
        <HeroSection placeCount={initialResult.totalCount} />
        <CategorySection
          initialResult={initialResult}
          favoritePlaceIds={favoritePlaceIds}
        />
        <InfoSection />
      </main>
      <footer className="border-t border-border bg-surface py-8">
        <p className="mx-auto max-w-[1200px] px-4 text-xs text-content-muted sm:px-6">
          {t("footer")}
        </p>
      </footer>
    </>
  );
}

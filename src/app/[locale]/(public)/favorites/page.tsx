import { getTranslations } from "next-intl/server";
import { PawPrint } from "lucide-react";

import Header from "@/components/Header";
import { requireUser } from "@/lib/auth/current-user";
import { getUserDogs } from "@/lib/dogs/queries";
import { getFavoritePlaces } from "@/lib/favorites/queries";
import { isSupportedLocale } from "@/lib/i18n/locale";
import { toDogSizeFilter } from "@/lib/places/eligibility";

import FavoritesList from "./FavoritesList";

interface FavoritesPageProps {
  params: { locale: string };
}

export default async function FavoritesPage({ params }: FavoritesPageProps) {
  const locale = isSupportedLocale(params.locale) ? params.locale : "en";
  const t = await getTranslations({ locale, namespace: "favorites" });

  const user = await requireUser(locale, `/${locale}/favorites`);
  const [places, dogs] = await Promise.all([
    getFavoritePlaces(user.id),
    getUserDogs(user.id),
  ]);
  // 즐겨찾기는 먼저 등록한 반려견 기준으로 방문 가능 여부를 안내한다.
  const dogSize = dogs.length > 0 ? toDogSizeFilter(dogs[0].size) : "all";

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-bold text-content">{t("title")}</h1>

        {places.length > 0 ? (
          <FavoritesList places={places} dogSize={dogSize} />
        ) : (
          <div className="py-20 text-center text-content-muted">
            <PawPrint
              className="mx-auto mb-3 w-6 h-6 text-content-muted"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <p className="text-sm">{t("empty")}</p>
          </div>
        )}
      </main>
    </>
  );
}

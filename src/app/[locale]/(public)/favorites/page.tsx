import { getTranslations } from "next-intl/server";

import Header from "@/components/Header";
import { requireUser } from "@/lib/auth/current-user";
import { getFavoritePlaces } from "@/lib/favorites/queries";
import { isSupportedLocale } from "@/lib/i18n/locale";

import FavoritesList from "./FavoritesList";

interface FavoritesPageProps {
  params: { locale: string };
}

export default async function FavoritesPage({ params }: FavoritesPageProps) {
  const locale = isSupportedLocale(params.locale) ? params.locale : "en";
  const t = await getTranslations({ locale, namespace: "favorites" });

  const user = await requireUser(locale, `/${locale}/favorites`);
  const places = await getFavoritePlaces(user.id);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">{t("title")}</h1>

        {places.length > 0 ? (
          <FavoritesList places={places} />
        ) : (
          <div className="py-20 text-center text-gray-400">
            <p className="mb-3 text-4xl">🐾</p>
            <p className="text-sm">{t("empty")}</p>
          </div>
        )}
      </main>
    </>
  );
}

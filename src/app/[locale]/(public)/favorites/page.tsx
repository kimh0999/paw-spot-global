import { getTranslations } from "next-intl/server";
import { Heart } from "lucide-react";

import Header from "@/components/Header";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { getUserDogs } from "@/lib/dogs/queries";
import { getFavoritePlaces } from "@/lib/favorites/queries";
import { isSupportedLocale } from "@/lib/i18n/locale";
import { toDogSizeFilter } from "@/lib/places/eligibility";

import FavoritesList from "./FavoritesList";
import { noIndexMetadata } from "@/lib/seo/page-metadata";

interface FavoritesPageProps {
  params: Promise<{ locale: string }>;
}


/** 검색 결과에 뜰 이유가 없는 화면. 표시 정책일 뿐이고 권한은 기존 인증·인가가 맡는다. */
export const metadata = noIndexMetadata;

export default async function FavoritesPage({ params: paramsPromise }: FavoritesPageProps) {
  // Next 15부터 params/searchParams는 Promise다. 기존 참조를 그대로 두기 위해 풀어서 같은 이름에 담는다.
  const params = await paramsPromise;
  const locale = isSupportedLocale(params.locale) ? params.locale : "en";
  const t = await getTranslations({ locale, namespace: "favorites" });

  const user = await requireUser(locale, `/${locale}/favorites`);
  const [places, dogs] = await Promise.all([
    getFavoritePlaces(user.id),
    getUserDogs(user.id),
  ]);
  // 즐겨찾기는 먼저 등록한 반려견 기준으로 방문 가능 여부를 안내한다.
  // **누구 기준인지 이름을 함께 넘긴다** — 여러 마리를 등록한 사용자에게 이름 없는 판정은
  // 어느 아이 이야기인지 알 수 없는 문장이 된다.
  const referenceDog = dogs.length > 0 ? dogs[0] : null;
  const dogSize = referenceDog ? toDogSizeFilter(referenceDog.size) : "all";

  return (
    <>
      <Header />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6"
      >
        <h1 className="text-2xl font-bold text-content">{t("title")}</h1>
        {places.length > 0 && (
          <p className="mt-1.5 text-sm text-content-secondary">
            {t("count", { count: places.length })}
          </p>
        )}

        <div className="mt-6">
          {places.length > 0 ? (
            <FavoritesList
              places={places}
              dog={referenceDog ? { size: dogSize, name: referenceDog.name } : undefined}
            />
          ) : (
            // 저장한 것이 없다는 사실만 말하고, 저장할 곳으로 보낸다.
            // 채울 것이 없다고 가짜 추천 목록을 만들지 않는다.
            <div className="rounded-card border border-dashed border-border-strong px-6 py-16 text-center">
              <Heart
                className="mx-auto h-6 w-6 text-content-muted"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <p className="mt-3 text-sm text-content-secondary">{t("empty")}</p>
              <Link
                href="/places"
                className="mt-4 inline-flex h-11 items-center rounded-lg border border-border-control bg-surface px-4 text-sm font-semibold text-content outline-none transition-colors hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t("browsePlaces")}
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

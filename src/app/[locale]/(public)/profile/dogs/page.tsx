import { getTranslations } from "next-intl/server";

import Header from "@/components/Header";
import DogsManager from "@/components/dogs/DogsManager";
import { requireUser } from "@/lib/auth/current-user";
import { getUserDogs } from "@/lib/dogs/queries";
import { isSupportedLocale } from "@/lib/i18n/locale";
import { noIndexMetadata } from "@/lib/seo/page-metadata";

interface ProfileDogsPageProps {
  params: Promise<{ locale: string }>;
}


/** 검색 결과에 뜰 이유가 없는 화면. 표시 정책일 뿐이고 권한은 기존 인증·인가가 맡는다. */
export const metadata = noIndexMetadata;

export default async function ProfileDogsPage({ params: paramsPromise }: ProfileDogsPageProps) {
  // Next 15부터 params/searchParams는 Promise다. 기존 참조를 그대로 두기 위해 풀어서 같은 이름에 담는다.
  const params = await paramsPromise;
  const locale = isSupportedLocale(params.locale) ? params.locale : "en";
  const t = await getTranslations({ locale, namespace: "dogs" });

  // 비로그인 상태에서는 로그인 후 이 화면으로 돌아온다.
  const user = await requireUser(locale, `/${locale}/profile/dogs`);
  const dogs = await getUserDogs(user.id);

  return (
    <>
      <Header />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-content">{t("title")}</h1>
        <p className="mt-2 text-sm text-content-secondary">{t("description")}</p>

        <div className="mt-6">
          <DogsManager dogs={dogs} />
        </div>
      </main>
    </>
  );
}

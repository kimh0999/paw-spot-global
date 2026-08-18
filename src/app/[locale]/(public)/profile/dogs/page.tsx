import { getTranslations } from "next-intl/server";

import Header from "@/components/Header";
import DogsManager from "@/components/dogs/DogsManager";
import { requireUser } from "@/lib/auth/current-user";
import { getUserDogs } from "@/lib/dogs/queries";
import { isSupportedLocale } from "@/lib/i18n/locale";

interface ProfileDogsPageProps {
  params: { locale: string };
}

export default async function ProfileDogsPage({ params }: ProfileDogsPageProps) {
  const locale = isSupportedLocale(params.locale) ? params.locale : "en";
  const t = await getTranslations({ locale, namespace: "dogs" });

  // 비로그인 상태에서는 로그인 후 이 화면으로 돌아온다.
  const user = await requireUser(locale, `/${locale}/profile/dogs`);
  const dogs = await getUserDogs(user.id);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-content">{t("title")}</h1>
        <p className="mt-2 text-sm text-content-secondary">{t("description")}</p>

        <div className="mt-6">
          <DogsManager dogs={dogs} />
        </div>
      </main>
    </>
  );
}

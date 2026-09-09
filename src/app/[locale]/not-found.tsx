import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/**
 * `notFound()`가 호출됐을 때의 화면. 공개 장소 상세와 관리자 수정 화면이 함께 쓴다.
 *
 * Next가 not-found에는 `params`를 넘기지 않아 다른 페이지처럼 locale을 직접 받을 수 없다.
 * 루트 레이아웃과 같이 요청 설정(`requestLocale`)이 정한 locale을 그대로 따른다.
 */
export default async function LocaleNotFound() {
  const t = await getTranslations("common.notFound");

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-12">
      <section className="w-full rounded-card border border-border bg-surface p-8 text-center">
        <h1 className="text-2xl font-bold text-content">{t("title")}</h1>
        <p className="mt-2 text-sm text-content-secondary">{t("description")}</p>

        <div className="mt-6 flex justify-center gap-3">
          <Button asChild>
            <Link href="/places">{t("browsePlaces")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">{t("backHome")}</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

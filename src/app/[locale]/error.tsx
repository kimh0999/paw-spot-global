"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/**
 * 공개·관리자 라우트 공통 오류 경계.
 *
 * 실패를 빈 화면으로 넘기지 않고 "다시 시도"를 준다. 원인 문구는 보여주지 않는다 —
 * 방문자가 할 수 있는 일이 없고 내부 정보가 새기 때문이다. 진단용 digest만 남긴다.
 *
 * `redirect()`·`notFound()`는 Next 내부 오류라 이 경계를 통과한다. 로그인 리다이렉트나
 * 404가 오류 화면으로 바뀌지 않는다.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");

  useEffect(() => {
    console.error("[route error]", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-12">
      <section className="w-full rounded-card border border-border bg-surface p-8 text-center">
        <h1 className="text-2xl font-bold text-content">{t("errorPage.title")}</h1>
        <p className="mt-2 text-sm text-content-secondary">
          {t("errorPage.description")}
        </p>

        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={reset}>{t("retry")}</Button>
          <Button asChild variant="outline">
            <Link href="/">{t("errorPage.backHome")}</Link>
          </Button>
        </div>

        {error.digest && (
          <p className="mt-4 text-xs text-content-muted">{error.digest}</p>
        )}
      </section>
    </main>
  );
}

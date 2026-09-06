"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/**
 * 관리자 라우트 오류 경계.
 *
 * 바깥 경계(`[locale]/error.tsx`)도 이 오류를 잡을 수 있지만, 운영자에게는 "저장한 값은
 * 그대로"라는 사실과 목록으로 돌아가는 길이 필요해 문구와 링크를 따로 둔다.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("admin.error");
  const tCommon = useTranslations("common");

  useEffect(() => {
    console.error("[admin route error]", error);
  }, [error]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <section className="rounded-xl border border-border bg-surface p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-content">{t("title")}</h1>
        <p className="mt-2 text-sm text-content-secondary">{t("description")}</p>

        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={reset}>{tCommon("retry")}</Button>
          <Button asChild variant="outline">
            <Link href="/admin/places">{t("backToList")}</Link>
          </Button>
        </div>

        {error.digest && (
          <p className="mt-4 text-xs text-content-muted">{error.digest}</p>
        )}
      </section>
    </main>
  );
}

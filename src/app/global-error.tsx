"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

import "./globals.css";

/**
 * 루트 레이아웃이 실패했을 때의 마지막 경계.
 *
 * 이 화면은 `app/layout.tsx`를 **대체하므로** `<html>`·`<body>`와 전역 스타일을 직접 들고 온다.
 * 같은 이유로 `NextIntlClientProvider`도 없어 번역을 쓸 수 없다 — 여기서 `useTranslations`를
 * 부르면 오류 화면 자체가 다시 터진다. 그래서 문구는 기본 로케일(en)로 고정한다.
 * `common.errorPage`와 내용이 겹치지만 키를 공유하려면 provider가 필요하므로 두지 않는다.
 *
 * 링크도 `@/i18n/navigation`이 아닌 순수 `<a>`다. `/`로 보내면 미들웨어가 locale을 협상한다.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-12">
          <section className="w-full rounded-xl border border-border bg-surface p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-content">Something went wrong</h1>
            <p className="mt-2 text-sm text-content-secondary">
              This may be temporary. If it keeps happening, please try again in a
              little while.
            </p>

            <div className="mt-6 flex justify-center gap-3">
              <Button onClick={reset}>Retry</Button>
              <Button asChild variant="outline">
                <a href="/">Go home</a>
              </Button>
            </div>

            {error.digest && (
              <p className="mt-4 text-xs text-content-muted">{error.digest}</p>
            )}
          </section>
        </main>
      </body>
    </html>
  );
}

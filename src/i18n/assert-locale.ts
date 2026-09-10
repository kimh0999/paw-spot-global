import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";

import { routing } from "./routing";
import type { SupportedLocale } from "@/lib/constants";

/**
 * `[locale]` 세그먼트에 들어온 값이 실제 지원 locale인지 확인한다.
 *
 * **왜 필요한가.** i18n 미들웨어의 matcher는 점이 든 경로(`.*\..*`)를 건너뛰는데, 그건
 * 미들웨어만 건너뛴다는 뜻이고 라우트는 그대로 매칭된다. 그래서 `/nope.ico` 같은 요청이
 * `locale="nope.ico"`로 이 세그먼트에 들어와 홈이 통째로 서버 렌더됐다 — 잘못된 locale로
 * 번역이 깨지고(`IntlError`), 장소 조회까지 실행됐다.
 *
 * **어디서 부르는가.** `[locale]/layout.tsx` 한 곳이다. 레이아웃이 `notFound()`를 던지면
 * 자식 페이지 함수가 호출되지 않아 조회도 일어나지 않는다 — 추정이 아니라 요청별
 * `prisma:query` 수를 세어 확인했다(`/nope.ico`: 4건 → 0건). 페이지마다 같은 검사를
 * 반복해 넣지 않는다.
 *
 * 프로덕션 빌드에서는 `dynamicParams = false`가 한 겹 앞에서 같은 요청을 끊는다.
 * dev 서버는 모든 라우트를 동적으로 렌더해 그 설정이 적용되지 않으므로, 두 환경에서
 * 같은 결과를 만드는 것은 이 함수다.
 */
export function assertSupportedLocale(locale: string): SupportedLocale {
  if (!hasLocale(routing.locales, locale)) notFound();
  return locale;
}

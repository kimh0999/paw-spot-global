import type { MetadataRoute } from "next";

import { SUPPORTED_LOCALES } from "@/lib/constants";
import { getSitemapPlaces } from "@/lib/places/queries";
import { localeHref, siteOrigin } from "@/lib/seo/site";
import { getSitemapVetClinics } from "@/lib/vets/queries";

/**
 * **요청 시점에 만든다.** 기본값(정적)이면 이 파일이 `next build` 중에 실행된다.
 *
 * 그 기본값이 두 가지를 낳았다.
 *
 * 1. **빌드가 DB에 의존한다.** 빌드 환경에 `DATABASE_URL`이 없으면 여기서 던지고
 *    빌드 전체가 멈춘다. Vercel preview 배포에서 실제로 그렇게 깨졌다 —
 *    `Export encountered an error on /sitemap.xml/route, exiting the build.`
 * 2. **내용이 배포 시점에 고정된다.** 장소를 새로 공개해도 재배포 전까지
 *    sitemap에 들어가지 않는다.
 *
 * `revalidate`를 쓰지 않은 이유는 그것도 빌드 때 초기 생성을 시도해 1번이 남기 때문이다.
 *
 * 조회 실패를 삼키지 않는다. 실패하면 sitemap 요청이 실패해야 한다 —
 * 빈 sitemap을 200으로 내보내면 색인에서 조용히 사라진다.
 */
export const dynamic = "force-dynamic";

/**
 * 공개된 URL만 담는다.
 *
 * 장소·병원은 **화면과 같은 공개 조건**을 재사용한다 — 장소는 `VISIBLE` + 검증 이력 1건 이상,
 * 병원은 `VISIBLE`. 비공개·임시저장 데이터가 sitemap으로 새어 나가면 조회에서 막아 둔 것이
 * 무의미해진다.
 *
 * 로그인·즐겨찾기·내 반려견·관리자처럼 **개인화되거나 권한이 필요한 경로는 넣지 않는다.**
 *
 * 각 항목에 `alternates.languages`를 달아 locale 쌍을 명시한다. 두 locale이 모두 실제로
 * 존재하는 URL이다 — 없는 번역 페이지를 등록하지 않는다.
 */
const STATIC_PATHS = ["/", "/places", "/vets"] as const;

function languagesFor(path: string): Record<string, string> {
  const origin = siteOrigin();
  return Object.fromEntries(
    SUPPORTED_LOCALES.map((l) => [l, `${origin}${localeHref(l, path)}`]),
  );
}

function entriesFor(path: string, lastModified?: Date): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  return SUPPORTED_LOCALES.map((locale) => ({
    url: `${origin}${localeHref(locale, path)}`,
    lastModified,
    alternates: { languages: languagesFor(path) },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [places, clinics] = await Promise.all([
    getSitemapPlaces(),
    getSitemapVetClinics(),
  ]);

  return [
    ...STATIC_PATHS.flatMap((path) => entriesFor(path)),
    ...places.flatMap((p) => entriesFor(`/places/${p.id}`, p.updatedAt)),
    ...clinics.flatMap((c) => entriesFor(`/vets/${c.id}`, c.updatedAt)),
  ];
}

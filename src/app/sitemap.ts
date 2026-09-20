import type { MetadataRoute } from "next";

import { SUPPORTED_LOCALES } from "@/lib/constants";
import { getSitemapPlaces } from "@/lib/places/queries";
import { localeHref, siteOrigin } from "@/lib/seo/site";
import { getSitemapVetClinics } from "@/lib/vets/queries";

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

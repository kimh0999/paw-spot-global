import type { Metadata } from "next";
import type { SupportedLocale } from "@/lib/constants";
import { absoluteUrl, alternatesFor } from "./site";

/**
 * 공개 페이지 하나의 metadata.
 *
 * canonical·hreflang·OG URL이 **같은 경로**에서 나오도록 한곳에서 만든다. 셋이 어긋나면
 * 검색엔진이 어느 URL을 정본으로 볼지 알 수 없다.
 */
export function publicPageMetadata(params: {
  locale: SupportedLocale;
  path: string;
  title: string;
  description: string;
  siteName: string;
}): Metadata {
  const { locale, path, title, description, siteName } = params;
  const url = absoluteUrl(locale, path);

  return {
    title,
    description,
    alternates: alternatesFor(locale, path),
    openGraph: {
      type: "website",
      siteName,
      locale,
      url,
      title: `${title} · ${siteName}`,
      description,
    },
    twitter: { card: "summary", title: `${title} · ${siteName}`, description },
  };
}

/**
 * 검색 노출에서 빼는 페이지.
 *
 * 로그인·계정·관리자처럼 **색인될 이유가 없는** 경로에 붙인다. 이것은 표시 정책일 뿐이고
 * 접근 통제가 아니다 — 권한은 기존 인증·인가가 그대로 맡는다. `robots.txt`의 `Disallow`도
 * 마찬가지로 크롤러에게 보내는 요청이지 자물쇠가 아니다.
 */
export const noIndexMetadata: Metadata = {
  robots: { index: false, follow: false },
};

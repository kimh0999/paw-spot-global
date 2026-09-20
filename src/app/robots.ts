import type { MetadataRoute } from "next";

import { siteOrigin } from "@/lib/seo/site";

/**
 * 크롤러에게 보내는 **요청**이지 접근 통제가 아니다.
 *
 * `/admin`·`/login`·계정 경로를 막는 것은 검색 결과에 뜰 이유가 없기 때문이고, 권한은
 * 기존 인증·인가가 그대로 맡는다. `Disallow`를 믿고 서버 검사를 빼지 않는다 — robots.txt는
 * 누구나 읽을 수 있고 따르지 않는 크롤러도 있다.
 *
 * 경로는 locale 접두사 뒤에 오므로 `/*` 와일드카드로 두 locale을 함께 덮는다.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/*/admin",
        "/*/login",
        "/*/favorites",
        "/*/my-dog",
        "/*/profile",
        "/*/forbidden",
        "/api/",
      ],
    },
    sitemap: `${siteOrigin()}/sitemap.xml`,
  };
}

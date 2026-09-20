import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/constants";

/**
 * 값이 없거나 형식이 틀릴 때 떨어지는 개발 기본값. 임의의 도메인을 만들어 내지 않는다.
 *
 * 저장소에는 운영 도메인이 없다(`.env.example`·`.env.local` 모두 localhost). 배포 환경에
 * 설정돼 있는지는 **이 저장소에서 확인할 수 없다** — 없다고 단정하지 않는다.
 */
const FALLBACK_ORIGIN = "http://localhost:3000";

/** 로컬 전용 호스트. 운영 배포에서 이 주소가 SEO URL로 나가면 안 된다. */
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

function isLocalOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname.replace(/^\[|\]$/g, "");
    return LOCAL_HOSTNAMES.has(host) || host.endsWith(".local");
  } catch {
    return true;
  }
}

/**
 * **실제 운영 배포**인지 판정한다.
 *
 * `NODE_ENV === "production"`만으로는 못 가른다 — 로컬 `next build`와 preview 배포도
 * production이다. 그 둘까지 실패시키면 검증이 불가능해진다.
 *
 * **우선순위가 중요하다.** 플랫폼이 "이건 운영 배포다"라고 말하면 그 판정이 **가장 세다** —
 * 환경변수로 끌 수 없다. 끌 수 있게 두면 운영에 잘못된 canonical을 내보내는 문 하나를
 * 열어 두는 셈이다.
 *
 * 1. 플랫폼이 production이라고 말함 → **무조건 강제** (`SEO_REQUIRE_PUBLIC_ORIGIN`로 해제 불가)
 * 2. `SEO_REQUIRE_PUBLIC_ORIGIN=1` → 강제 (플랫폼 신호가 없는 호스팅에서 쓰는 수단)
 * 3. 그 외(로컬 빌드 · preview · 미지의 환경) → 강제하지 않음
 *
 * 3번이 기본값인 이유는 모르는 환경에서 빌드를 깨는 쪽이 더 나쁘기 때문이다.
 */
function isProductionDeployment(): boolean {
  // Vercel: production | preview | development / Netlify: production | deploy-preview | branch-deploy
  if (process.env.VERCEL_ENV === "production") return true;
  if (process.env.CONTEXT === "production") return true;

  // 플랫폼 신호가 없는 곳에서 검증을 켜는 수단. 반대로 끄는 값은 두지 않는다 —
  // 위의 플랫폼 판정을 덮을 수 있으면 장치가 의미를 잃는다.
  if (process.env.SEO_REQUIRE_PUBLIC_ORIGIN === "1") return true;

  return false;
}

/**
 * 절대 URL의 **유일한 출처**.
 *
 * 운영 도메인을 코드에 적지 않는다. 값은 `NEXT_PUBLIC_SITE_URL` 하나에서만 온다.
 *
 * **주의 — 이 값은 빌드 시점에 고정된다.** `NEXT_PUBLIC_` 변수는 번들에 인라인되므로
 * 배포된 서버의 환경변수만 바꾸고 재시작해도 canonical·sitemap·robots는 바뀌지 않는다.
 * 도메인을 바꾸려면 **새 값으로 다시 빌드**해야 한다(로컬에서 실측으로 확인함).
 *
 * 요청의 `Host` 헤더를 쓰지 않는다 — 헤더는 위조할 수 있고, 그걸 canonical로 삼으면
 * 공격자가 정본 주소를 바꿀 수 있다.
 */
export function siteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  let origin = FALLBACK_ORIGIN;

  if (raw) {
    try {
      origin = new URL(raw).origin;
    } catch {
      origin = FALLBACK_ORIGIN;
    }
  }

  // 운영 배포인데 로컬 주소가 잡히면 조용히 넘어가지 않는다. 잘못된 canonical을
  // 내보내는 것보다 빌드가 깨지는 편이 낫다 — 빌드 중 이 함수가 먼저 불린다.
  if (isProductionDeployment() && isLocalOrigin(origin)) {
    throw new Error(
      `[seo] 운영 배포인데 NEXT_PUBLIC_SITE_URL이 로컬 주소다(${origin}). ` +
        "운영 도메인을 넣고 **다시 빌드**한다. 빌드 후 변수만 바꾸면 반영되지 않는다.",
    );
  }

  return origin;
}

/** `localePrefix: "always"`라 모든 공개 경로에 locale 세그먼트가 붙는다. */
export function localeHref(locale: SupportedLocale, path = "/"): string {
  const suffix = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${suffix}`;
}

export function absoluteUrl(locale: SupportedLocale, path = "/"): string {
  return `${siteOrigin()}${localeHref(locale, path)}`;
}

/**
 * canonical과 hreflang을 한 번에 만든다.
 *
 * canonical은 **지금 보고 있는 locale의 URL**이다 — 한국어 페이지가 영어 URL을
 * 정본으로 가리키면 안 된다. `languages`에는 실제로 존재하는 locale만 넣는다
 * (`SUPPORTED_LOCALES` = en·ko). 없는 번역 URL은 등록하지 않는다.
 *
 * `x-default`는 `DEFAULT_LOCALE`(en)을 가리킨다 — 협상 실패 시 서버가 내는 것과 같다.
 */
export function alternatesFor(locale: SupportedLocale, path = "/") {
  const languages: Record<string, string> = {};
  for (const l of SUPPORTED_LOCALES) languages[l] = localeHref(l, path);
  languages["x-default"] = localeHref(DEFAULT_LOCALE, path);

  return { canonical: localeHref(locale, path), languages };
}

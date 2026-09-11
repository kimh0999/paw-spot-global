import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Content-Security-Policy — **아직 보고 전용이다.**
 *
 * `Content-Security-Policy-Report-Only`로 내보내므로 무엇도 차단하지 않는다.
 * 위반만 브라우저 콘솔에 남긴다. 강제로 바꾸기 전에 남은 조건은
 * `docs/02-design/CSP-적용-현황.md`에 적었다.
 *
 * 출처는 코드에서 실제로 불러오는 것만 넣었다.
 * - `script-src`: 우리 번들과 Google Maps JS(`@googlemaps/js-api-loader`가
 *   `maps.googleapis.com`에서 스크립트를 붙인다). **`unsafe-inline`·`unsafe-eval`을 넣지 않았다** —
 *   위반을 지우려고 넣으면 CSP를 두는 이유가 없어진다. Next의 하이드레이션 인라인
 *   스크립트가 여기서 걸리며, 그것이 nonce가 필요한지 판단할 근거다.
 * - `style-src`에만 `unsafe-inline`을 둔다. Tailwind·Next·Maps가 인라인 스타일을 쓰고,
 *   스타일 인라인은 스크립트 인라인과 위험이 다르다.
 * - `img-src`에 `https:`를 연 것은 장소 사진(`thumbnailUrl`)이 관리자가 넣는 외부 주소라
 *   호스트를 미리 셀 수 없기 때문이다. 스킴은 `lib/validation/url.ts`가 http/https로 막는다.
 * - `font-src`는 `'self'`면 충분하다. `next/font/google`이 빌드 때 내려받아
 *   `/_next/static/media`에서 직접 서빙한다(빌드 CSS에 외부 폰트 URL이 없다).
 *   `fonts.gstatic.com`은 Maps가 Roboto를 부를 때만 쓰인다.
 * - `frame-ancestors 'none'`으로 다른 사이트가 이 화면을 감싸지 못하게 한다.
 */
const cspReportOnly = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://accounts.google.com",
  "script-src 'self' https://maps.googleapis.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' https://maps.googleapis.com",
  "frame-src 'self' https://accounts.google.com",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
          // CSP를 모르는 브라우저를 위한 최소한의 보완. `frame-ancestors`와 같은 뜻이다.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);

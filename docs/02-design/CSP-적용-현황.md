# CSP 적용 현황

작성 2026-09-11 · 갱신 2026-09-11(브라우저 실측 반영) · 정책 정의 `next.config.mjs`

> **지금은 관찰 단계다. 차단하지 않는다.**
> 헤더 이름이 `Content-Security-Policy-Report-Only`이므로 브라우저는 위반을 **보고만 하고
> 요청·실행을 그대로 통과시킨다.** 실측한 위반 이벤트의 `disposition`이 전부 `"report"`인 것으로
> 확인했다(§3-2). 즉 **현재 CSP는 공격을 막고 있지 않다.** 막는 것은 §3의 조건이 풀려
> `Content-Security-Policy`로 바꾼 뒤부터다.

## 1. 이전 상태

`next.config.mjs`는 `const nextConfig = {}`였다. 헤더 설정이 **저장소 어디에도 없었다** —
미들웨어(`src/middleware.ts`)는 next-intl 전용이고, `vercel.json`·`Dockerfile`·프록시 설정도
없다. 즉 CSP·`X-Frame-Options`·`nosniff`·`Referrer-Policy` 모두 없었다.

**운영 응답 헤더는 확인하지 못했다.** 저장소에 배포 URL이 없다. `.env.local`의
`NEXT_PUBLIC_SITE_URL`·`AUTH_URL`은 둘 다 `http://localhost:3000`이고, 배포 설정 파일도 없다.
`https://pawspot.global`이 **폐기된 개발명세서 v1**(`docs/Paw_Spot_Global_개발명세서.md:1945`)에
한 번 나오지만, 이것이 실제 배포처라는 근거가 저장소에 없어 조회하지 않았다.
운영에 이미 다른 CSP가 걸려 있는지는 **미확인**이다.

## 2. 지금 내보내는 것

로컬 production 빌드(`next start`)에서 `/ko/places` 응답 헤더로 확인했다.

| 헤더 | 값 |
|---|---|
| `Content-Security-Policy-Report-Only` | 아래 정책 |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |

정책의 각 출처는 **코드에서 실제로 불러오는 것**만 넣었다.

| 지시어 | 값 | 근거 |
|---|---|---|
| `script-src` | `'self' https://maps.googleapis.com` | `@googlemaps/js-api-loader`가 `maps.googleapis.com`에서 스크립트를 붙인다. **`unsafe-inline`·`unsafe-eval`을 넣지 않았다** |
| `style-src` | `'self' 'unsafe-inline' https://fonts.googleapis.com` | Tailwind·Next·Maps가 인라인 스타일을 쓴다. 스타일 인라인은 스크립트 인라인과 위험이 다르다 |
| `img-src` | `'self' data: blob: https:` | 장소 사진(`thumbnailUrl`)이 관리자가 넣는 **외부 주소**라 호스트를 미리 셀 수 없다. 스킴은 `lib/validation/url.ts`가 http/https로 막는다 |
| `font-src` | `'self' https://fonts.gstatic.com` | `next/font/google`이 빌드 때 내려받아 `/_next/static/media`에서 서빙한다(빌드 CSS에 외부 폰트 URL이 0건). `fonts.gstatic.com`은 Maps가 Roboto를 부를 때만 |
| `connect-src` | `'self' https://maps.googleapis.com` | 타일·라이브러리 요청 |
| `frame-src`·`form-action` | `+ https://accounts.google.com` | Google OAuth |
| `frame-ancestors` | `'none'` | 클릭재킹 |
| `default-src`·`base-uri` | `'self'` / `object-src 'none'` | 나머지는 열지 않는다 |

## 3. 강제로 바꾸기 전 남은 조건

### 3-1. 인라인 스크립트 — nonce가 필요하다 (막는 조건)

로컬 production 빌드의 HTML을 그대로 읽어 세어 본 결과다.

| 경로 | nonce 없는 인라인 `<script>` |
|---|---|
| `/ko/places` | 20개 |
| `/en/places` | 20개 |
| `/ko/vets` | 16개 |
| `/ko/login` | 14개 |

내용은 React 스트리밍 보조 함수(`$RS`·`$RB`·`$RV`)와 RSC 하이드레이션 페이로드
(`self.__next_f.push(...)`)다. 우리가 쓴 코드가 아니라 **프레임워크가 만드는 것**이라
지울 수 없다. 지금 정책을 강제로 바꾸면 `script-src 'self'`에 걸려 **모든 화면의
하이드레이션이 깨진다.**

풀 방법은 두 가지고, 지금은 어느 쪽도 고르지 않았다.

1. **nonce** — 미들웨어에서 요청마다 nonce를 만들어 CSP 헤더에 넣는다.
   **대가: 정적 생성을 잃는다.** nonce는 요청마다 달라야 하므로 해당 경로가 동적 렌더로
   바뀐다. 지금 빌드는 28개 페이지를 미리 만든다(`Generating static pages (28/28)`).
   `/ko/places`·`/en/places`·`/ko/vets`·`/ko/login` 등 `●(SSG)` 경로가 전부 여기 해당한다.
   캐시·응답 속도에 영향이 가므로 **이 교환을 먼저 결정해야 한다.**
2. **`'unsafe-inline'`을 넣는다** — 위반은 사라지지만 CSP가 XSS를 막는 힘도 같이 사라진다.
   이 문서는 이 선택을 권하지 않는다.

### 3-2. 브라우저 실행 확인 — 완료 (2026-09-11)

Chrome 확장이 연결되지 않아 `playwright-core`로 **설치된 Chrome을 직접 구동**해
production 빌드(`next start`, 격리 DB)에서 10개 화면을 열고 측정했다.
`playwright-core`는 `--no-save`로 설치했고 `package.json`에 넣지 않았다.

| 화면 | HTTP | 콘솔 오류 | 페이지 예외 | 하이드레이션 오류 | CSP 위반 |
|---|---|---|---|---|---|
| `/ko`, `/en` | 200 | 0 | 0 | **0** | 40 / 42 |
| `/ko/places`, `/en/places` | 200 | **1씩** | 0 | **0** | 21 / 21 |
| `/ko/vets`, `/en/vets` | 200 | 0 | 0 | **0** | 17 / 17 |
| `/ko/vets/{id}`, `/en/vets/{id}` | 200 | 0 | 0 | **0** | 25 / 26 |
| `/ko/login`, `/en/login` | 200 | 0 | 0 | **0** | 14 / 14 |

**콘솔 오류 2건의 정체**: 장소 목록의 `Google Maps JavaScript API error: BillingNotEnabledMapError`.
**기존에 알려진 Google Cloud 결제 설정 문제**이며 CSP와 무관하다. 지도 스크립트 자체는
`maps.googleapis.com`에서 정상적으로 로드됐다 — 정책의 Maps 출처는 맞게 잡혀 있다.

**네트워크 실패 36건**은 전부 `ERR_ABORTED`이고 30건이 `?_rsc=` 프리페치다. Next가
링크 프리페치를 중간에 취소한 것으로, 기능 실패가 아니다.

**CSP 위반 235건의 내역** (전부 `disposition: "report"` — 차단되지 않았다)

| 지시어 | 건수 | 정체 |
|---|---|---|
| `script-src-elem` ← `inline` | 231 | 프레임워크가 만드는 인라인 스크립트 (§3-1) |
| `script-src` ← `eval` | 6 | **zod** — 페이지당 정확히 1건 |

`eval` 위반의 출처를 청크에서 직접 확인했다(`_next/static/chunks/7788-*.js`, "zod" 문자열 347개).
코드는 다음 형태다.

```js
if (jitless || navigator?.userAgent?.includes("Cloudflare")) return false;
try { return Function(""), true } catch (e) { return false }
```

zod 4가 **JIT를 쓸 수 있는 환경인지 떠보는 탐지 코드**이고, `try/catch`로 감싸여 있다.
CSP가 막으면 예외가 잡혀 `false`가 되고 zod는 느린 경로로 돌아간다.
**`'unsafe-eval'`을 넣을 이유가 아니다.** (Google Maps가 `unsafe-eval`을 요구하는지가
이전 숙제였는데, **요구하지 않는다** — `eval` 위반은 지도가 없는 `/ko/vets`에서도 똑같이 1건 난다.)

### 3-3. "강제했다면 무엇이 깨지는가" — 실측 (2026-09-11)

앱은 그대로 두고 **브라우저에서만** 응답 헤더를 `Report-Only` → 강제로 바꿔 측정했다.

| 조건 | 결과 |
|---|---|
| **A. 지금 정책 그대로 강제** | 인라인 스크립트 20/17건 차단 → **하이드레이션 실패**(React 루트가 붙지 않음). 예상대로 §3-1이 유일한 차단 요인이다 |
| **B. 강제 + `script-src`에 `'unsafe-inline'`** | **하이드레이션 성공**, Google Maps 로드 성공, 남은 위반은 zod `eval` 1건뿐. `/ko/vets`는 **콘솔 오류 0건** |

**이 시뮬레이션으로 말할 수 있는 것과 없는 것**

- 말할 수 있는 것: `script-src`의 **인라인 차단이 하이드레이션을 깨뜨리는 유일한 확인된 요인**이고,
  `'unsafe-eval'`은 필요 없다(zod의 `eval`은 막혀도 degrade한다).
- **말할 수 없는 것**: 조건 B는 `'unsafe-inline'`을 넣은 상태다. 이것은 **엄격한 CSP가 정상
  동작한다는 증거가 아니다.** nonce 기반 엄격 정책에서는 nonce 전파·스트리밍 청크·`next/script`
  동작이 새로 개입하므로 **따로 확인해야 한다.**
- 또한 아래 §3-5처럼 **지도가 실제로 동작하는 상태를 확인하지 못했다.** 타일·WebGL·추가
  출처는 지도가 살아 있을 때만 요청되므로 `img-src`·`connect-src`가 충분한지는 **미확인**이다.

따라서 "남은 문제는 nonce 하나뿐"이라고 결론짓지 않는다.

### 3-4. 관리자 화면 실측 (2026-09-11 추가) · 지도는 동작하지 않는 상태

ADMIN 세션으로 `/ko/admin/places/new`(LocationPickerMap 포함)를 열어 측정했다.

| 지시어 ← 차단 대상 | disposition | 건수 | 화면 |
|---|---|---|---|
| `script-src-elem` ← `inline` | report | 16 | 관리자 장소 등록 |
| `script-src` ← `eval` | report | 1 | 관리자 장소 등록 |

**새로운 유형의 위반은 없었다.** 공개 화면과 같은 두 종류뿐이다.
Google 관련 네트워크 응답 27건이 **전부 200**이었고 `img-src`·`connect-src` 위반은 0건이다.

> **반복 횟수는 취약점 개수가 아니다.** 위 16건은 한 페이지가 내보내는 인라인 스크립트
> 개수이지 서로 다른 문제 16개가 아니다. 확인된 **유형은 2가지**다.

**다만 이 측정은 "지도가 실패한 상태"에서 이뤄졌다.** `BillingNotEnabledMapError`로
타일이 그려지지 않으므로(§3-5) 타일 요청·WebGL·추가 출처가 아예 발생하지 않았다.
**지도가 정상 동작할 때의 CSP 적합성은 미확인이다.**

### 3-5. Google Maps 실동작 — 실패 (외부 설정)

| 확인 | 공개 `/ko/places` | 관리자 `/ko/admin/places/new` |
|---|---|---|
| `.gm-style` 컨테이너 | 생성됨 | 생성됨 |
| Google 네트워크 응답 | **전부 200**(31건) | **전부 200**(27건) |
| 콘솔 오류 | `Google Maps JavaScript API error: BillingNotEnabledMapError` | 같음 |
| 화면 오버레이 | **`Google 지도를 제대로 로드할 수 없습니다.`** | 같음 |
| 지도 클릭 → 위도·경도 폼 반영 | — | **반영되지 않음** (클릭 전후 모두 빈 값) |

**스크립트가 200으로 내려오는 것은 지도가 동작한다는 증거가 아니다.** SDK는 정상적으로
로드된 뒤 인증·결제 단계에서 거부되고, 타일 없는 오류 오버레이를 남긴다.

**코드 문제가 아니라 외부 설정 문제다.** 확인할 곳과 순서:

1. Google Cloud Console → 해당 프로젝트의 **결제(Billing) 계정 연결** 여부
2. **Maps JavaScript API** 사용 설정 여부
3. API 키의 **HTTP 리퍼러 제한**에 `http://localhost:*`(개발)과 실제 배포 도메인이 들어 있는지
4. 콘솔에서 볼 항목: 브라우저 콘솔의 `BillingNotEnabledMapError` 문자열,
   그리고 `maps.googleapis.com/maps/api/js` 응답의 상태

**해결 후 재검증할 동작** (지금은 전부 미검증/실패):
지도 타일 표시 · 장소 마커 렌더 · 마커 클릭 → 목록 카드 선택 ·
관리자 지도 클릭 → **위도·경도 입력칸 자동 반영** · `내 위치` 이동.

> 모킹은 쓰지 않았다. 위 수치는 **실제 Google Maps 연동 결과**다.

**부수 관찰(코드)**: `window.gm_authFailure` 훅은 `MapPanel.tsx`에만 있고
`LocationPickerMap.tsx`에는 없다. 그래서 공개 화면은 앱이 만든 설명을 낼 수 있지만
관리자 화면은 Google이 그린 오버레이만 보인다. 보안 문제는 아니고 UX 개선 항목이다.


### 3-6. 권한 분기 실측 (2026-09-11)

격리 DB에 테스트 계정을 만들고 **테스트 전용 `AUTH_SECRET`** 으로 세션 토큰을 발급해 확인했다.
운영 비밀값은 쓰지 않았다.

| 세션 | `/ko/admin/vets` · `/ko/admin/places` · `/ko/admin/vets/new` |
|---|---|
| 없음 | 307 → `/ko/login?callbackUrl=…` |
| `USER`(비관리자) | **307 → `/ko/forbidden`** |
| `ADMIN` | 200 |
| 서명을 훼손한 토큰 | 307 → `/ko/login` (세션 없음과 동일 처리) |

`USER` 세션으로 `/ko`·`/ko/places`·`/ko/vets`는 200 — 공개 화면 회귀 없음.

### 3-7. 보고 수집처 — 없다

`report-uri`/`report-to`를 **넣지 않았다.** 수집할 엔드포인트가 없다
(`NEXT_PUBLIC_SENTRY_DSN`은 비어 있고 Sentry도 미설치다 — `PROJECT_STATUS.md` §20).

**구분해야 할 두 가지다.**

| | 지금 상태 |
|---|---|
| **브라우저 콘솔에서 위반 보기** | 된다. 화면을 여는 사람만 볼 수 있다 |
| **서버에서 위반 보고 수집** | **안 된다.** 실제 사용자가 겪는 위반은 아무 데도 쌓이지 않는다 |

즉 지금의 "보고 전용"은 **개발자가 직접 열어 봐야만 보이는 관찰**이다. 운영에서
실사용자 기준의 위반을 모으려면 수집 엔드포인트를 먼저 만들어야 한다.

### 3-8. 아직 확인하지 못한 흐름

- **실제 Google 계정 로그인 왕복**: OAuth **시작**은 확인했다 — 로그인 버튼이
  `303 → 302 → accounts.google.com/o/oauth2/v2/auth`로 이어져 Google 로그인 화면까지 도달한다.
  그 뒤 계정 인증·callback 복귀·세션 생성은 **실제 계정이 필요해 하지 못했다**.
- 지도가 정상 동작할 때의 CSP 적합성 (§3-5 해결 후).

## 4. 전환 절차

| # | 단계 | 상태 |
|---|---|---|
| 1 | ko/en × (홈·목록·상세·로그인) 위반 수집 | ✅ 완료 (§3-2) |
| 2 | 관리자 화면(LocationPickerMap 포함) 위반 수집 | ✅ 완료 (§3-4) — **새 유형 없음** |
| 3 | **지도가 정상 동작하는 상태에서 재수집** | ❌ **불가 — 결제 설정 문제로 지도가 뜨지 않는다**(§3-5). 타일·WebGL 출처가 검증되지 않았다 |
| 4 | 실제 Google 로그인 왕복 중 위반 수집 | ⬜ 미완 — OAuth 시작까지만 확인(§3-8) |
| 5 | 위반 중 정당한 출처만 정책에 반영. 와일드카드로 덮지 않는다 | ⬜ **판단 보류.** 지금까지 추가할 출처가 나오지 않았지만 3·4가 남아 단정할 수 없다 |
| 6 | **nonce ↔ 정적 생성 28페이지의 교환 결정** | ⬜ 미결 |
| 7 | nonce를 고르면 미들웨어에 붙이고, 렌더 방식 변화를 빌드 출력(`● SSG` → `ƒ Dynamic`)으로 확인. **nonce 전파·스트리밍·`next/script` 동작을 새로 확인해야 한다** | ⬜ 미완 |
| 8 | 위반 수집 엔드포인트 마련 (§3-7) | ⬜ 미완 |
| 9 | 헤더 이름을 `Content-Security-Policy`로 변경 | ⬜ 미완 |

### 4-1. nonce가 영향을 주는 경로

지금 빌드가 미리 만드는 28개 페이지가 대상이다. `●(SSG)` 경로 —
`/[locale]`(홈) · `/[locale]/places` · `/[locale]/vets` · `/[locale]/login` ·
`/[locale]/favorites` · `/[locale]/my-dog` · `/[locale]/profile/dogs` ·
`/[locale]/forbidden` · `/[locale]/admin/*` — 이 ko/en 두 벌로 만들어진다.

nonce를 헤더에 넣으려면 요청마다 값이 달라져야 하므로 이 경로들이 `ƒ(Dynamic)`으로 바뀐다.
**영향은 두 가지다** — 빌드 시점에 만들어 두던 HTML을 요청마다 만들게 되고(응답 지연·서버 부하),
CDN 앞단에서 전체 HTML을 캐시하기 어려워진다(`/[locale]/vets/[id]`·`/[locale]/places/[id]`는
원래 `ƒ`라 변화 없음).

**이번 작업에서는 적용하지 않았다.** 검토 사항으로만 남긴다.

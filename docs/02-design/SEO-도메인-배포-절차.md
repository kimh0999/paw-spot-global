# SEO 절대 URL — 도메인 설정과 배포 절차

canonical·hreflang·OG URL·sitemap·`robots.txt`의 Sitemap 줄은 전부
`src/lib/seo/site.ts`의 `siteOrigin()` **한 곳**에서 나온다. 값의 출처는
`NEXT_PUBLIC_SITE_URL` 하나뿐이고, 운영 도메인을 코드에 적지 않는다.

요청의 `Host` 헤더는 쓰지 않는다 — 위조할 수 있고, 그걸 canonical로 삼으면 공격자가
정본 주소를 바꿀 수 있다.

## 1. 지금 확인된 것과 확인되지 않은 것

| 항목 | 상태 |
|---|---|
| 저장소의 값 | `.env.local`·`.env.example` 모두 `http://localhost:3000`. `AUTH_URL`도 같다 |
| 저장소 안의 운영 도메인 근거 | **없다** |
| **배포 환경의 설정값** | **미확인.** 확인할 수단이 이 저장소에 없다 |

배포 설정에 접근할 수 없다는 것과 운영 도메인이 존재하지 않는다는 것은 **다른 말이다.**
아래가 없어서 확인하지 못했을 뿐이며, 도메인이 없다고 단정하지 않는다.

- 배포 설정 파일 없음 (`vercel.json`·`netlify.toml`·`Procfile`·Docker 설정 모두 없음)
- `.vercel/` 같은 링크 디렉터리 없음
- CI 설정 없음 (`.github/workflows` 없음)
- `vercel`·`gh` CLI 모두 설치돼 있지 않음

확인하려면 **호스팅 대시보드의 환경변수** 또는 **배포된 사이트의 실제 주소**가 필요하다.

## 2. 값은 빌드 시점에 고정된다 (실측)

`NEXT_PUBLIC_` 변수는 번들에 인라인된다. **배포된 서버의 환경변수만 바꾸고 재시작해도
반영되지 않는다.**

로컬에서 직접 확인했다 — `localhost:3000`으로 빌드한 산출물을 다른 값으로 기동했더니:

| 출력 | 기동 시 넘긴 값 | 실제 응답 |
|---|---|---|
| `robots.txt`의 Sitemap | `https://runtime-override.test` | `http://localhost:3000/sitemap.xml` |
| `sitemap.xml`의 첫 `<loc>` | 〃 | `http://localhost:3000/en` |
| `/ko`의 canonical | 〃 | `http://localhost:3000/ko` |

`.next/server/app/sitemap.xml.body`·`robots.txt.body`가 빌드 때 값이 박힌 채 미리
생성되고, 서버 청크에도 문자열이 인라인돼 있다.

**따라서 도메인을 바꾸려면 새 값으로 다시 빌드해 배포해야 한다.**

## 3. 잘못된 주소가 나가는 것을 막는 장치

`siteOrigin()`이 **실제 운영 배포**에서 로컬 주소를 발견하면 예외를 던져 빌드를 세운다.
잘못된 canonical을 조용히 내보내는 것보다 빌드가 깨지는 편이 낫다.

운영 배포 판정은 `NODE_ENV`로 하지 않는다 — 로컬 `next build`와 preview 배포도
production이라 그 둘까지 실패시키면 아무도 빌드를 검증할 수 없다.

**우선순위가 핵심이다. 플랫폼의 production 판정이 가장 세며 환경변수로 끌 수 없다.**

| 순위 | 조건 | 결과 |
|---|---|---|
| 1 | `VERCEL_ENV=production` 또는 `CONTEXT=production` | **무조건 강제** (`SEO_REQUIRE_PUBLIC_ORIGIN`로 해제 불가) |
| 2 | `SEO_REQUIRE_PUBLIC_ORIGIN=1` | 강제 (플랫폼 신호가 없는 호스팅에서 켜는 수단) |
| 3 | 그 외 — 로컬 빌드 · preview · 미지의 환경 | 강제하지 않음 |

3번이 기본값인 이유는 모르는 환경에서 빌드를 깨는 쪽이 더 나쁘기 때문이다.
**검증을 끄는 값은 두지 않는다** — 1번을 덮을 수 있으면 장치가 의미를 잃는다.

실측으로 확인한 조합:

| 조합 | 빌드 |
|---|---|
| `VERCEL_ENV=production` + `SEO_REQUIRE_PUBLIC_ORIGIN=0` + localhost | **종료코드 1 (차단)** |
| `VERCEL_ENV=preview` + `SEO_REQUIRE_PUBLIC_ORIGIN=0` + localhost | 종료코드 0 (통과) |
| 신호 없음(로컬 빌드) + localhost | 종료코드 0 (통과) |

실제로 `VERCEL_ENV=production` + localhost로 빌드하면 다음 메시지와 함께 종료 코드 1로
멈춘다(실측):

```
[seo] 운영 배포인데 NEXT_PUBLIC_SITE_URL이 로컬 주소다(http://localhost:3000).
운영 도메인을 넣고 **다시 빌드**한다. 빌드 후 변수만 바꾸면 반영되지 않는다.
```

## 4. 배포 절차

1. 호스팅의 빌드 환경변수에 `NEXT_PUBLIC_SITE_URL`을 **운영 도메인**으로 넣는다
   (`https://` 포함, 경로 없이 origin만 쓰면 된다 — 경로는 버려진다).
2. **다시 빌드한다.** 변수만 바꾸고 재시작하는 것으로는 바뀌지 않는다(§2).
3. 배포 후 확인한다.
   - `/robots.txt`의 `Sitemap:` 줄이 운영 도메인인가
   - `/sitemap.xml`의 `<loc>`에 `localhost`가 0건인가
   - `/ko`·`/en`의 canonical이 각자 자기 locale을 가리키는가

**세 가지를 혼동하지 않는다.** 배포 후 확인할 때 아래는 서로 다른 사실이며, 하나를
확인했다고 나머지가 따라오지 않는다.

| 확인 대상 | 방법 | 알 수 있는 것 |
|---|---|---|
| 공개 응답의 실제 SEO URL | 배포된 사이트에 GET | 사용자·크롤러가 보는 값 |
| 호스팅 환경변수 설정값 | 대시보드 확인 | 다음 빌드에 쓰일 값 |
| 이번 변경 코드의 배포 여부 | 배포 커밋·버전 확인 | 가드가 실제로 동작하는지 |

도메인을 공급했을 때 다섯 출력이 서로 어긋나지 않는 것은 로컬에서 확인해 두었다
(placeholder 도메인으로 빌드해 canonical·hreflang·og:url·sitemap·robots가 모두 같은
origin을 쓰고 `localhost` 잔존이 0인 것을 확인). **실제 운영 배포에서의 확인은 아니다.**

# Paw Spot Global — 개발명세서 v2

> **참조 기획서**: `docs/Paw_Spot_Global_기획서_v3.md`
> **이전 문서**: `docs/Paw_Spot_Global_개발명세서.md` (Dev Spec v1) — 과거 기록으로 보존. 충돌 시 본 문서가 우선한다.
> **진행 상황 추적**: `docs/PROJECT_STATUS.md`
>
> ⛔ **디자인 기준 아님.** 색상·타이포·간격·radius·z-index·모션·아이콘·문구 톤 등 모든 디자인 결정의 유일한 기준은 루트 **`DESIGN.md`** 다. 본 문서는 라우팅·데이터·API·상태·접근성 구현·보안·일정만 다루며, 디자인 규칙을 중복 기술하지 않는다.
> 프론트엔드 코딩 규칙은 `src/CLAUDE.md`를 따른다.

**작성 기준일**: 2026-08-13
**기준 브랜치**: `chore/project-foundation`

---

## 0. 표기 규칙

각 항목에 다음 상태를 붙인다. **아직 없는 기능을 구현된 것처럼 쓰지 않는다.**

| 표기 | 뜻 |
|---|---|
| ✅ **구현** | 코드에 존재하고 동작 경로가 확인됨 |
| 🟡 **부분 구현** | 일부만 존재. 남은 범위를 함께 기술 |
| ❌ **미구현** | 코드에 존재하지 않음 |
| 📋 **계획** | v3 정책으로 확정됐으나 아직 착수 전 |
| ❓ **확인 필요** | 런타임·외부 환경 확인이 필요해 문서만으로 단정 불가 |

---

## 1. 기술 스택 (실제 `package.json` 기준) ✅

| 영역 | 채택 | 비고 |
|---|---|---|
| 프레임워크 | Next.js `14.2.35` (App Router) | Pages Router 미사용 |
| 언어 | TypeScript `^5`, `strict` | |
| UI | React 18, Tailwind CSS `^3.4`, shadcn `^4.7`, `radix-ui` `^1.4` | 토큰은 `DESIGN.md` 참조 |
| 아이콘 | `lucide-react` `^1.16` | 단일 셋 |
| i18n | `next-intl` `^4.12` | |
| 인증 | `next-auth` `5.0.0-beta.31` (Auth.js v5) | Google 단독 |
| ORM | `@prisma/client` `^7.8` + `@prisma/adapter-pg` + `pg` | PostgreSQL + PostGIS |
| 검증 | `zod` `^4.4` | |
| 지도 | `@googlemaps/js-api-loader` `^2.0` | |
| 토스트 | `sonner` `^2.0` | |

**v1 명세와 달라진 점**

| v1 명세 | 실제 | 판단 |
|---|---|---|
| `react-hook-form` + `@hookform/resolvers` | 미설치. `useFormState`/`FormData` + 서버 zod 검증 | 의도된 변경. v2 기준 |
| `@sentry/nextjs` | 미설치 | ❌ 미구현 → P1 |
| `vitest`, `@testing-library/react` | 미설치 | ❌ 미구현 → P1 |
| Prisma 5 / Next 14.2 / zod 3 | Prisma 7 / Next 14.2.35 / zod 4 | 버전 갱신 |
| — | `next-themes` `^0.4.6` 설치됨 | ⚠️ `DESIGN.md` §4는 라이트 모드 전용. **제거 대상** |

---

## 2. 라우트 구조 (실제) ✅

```
src/app/
├── layout.tsx                       # RootLayout: <html lang>, Inter, Toaster
├── globals.css                      # DESIGN.md 토큰 정의
├── api/auth/[...nextauth]/route.ts  # Auth.js handler
└── [locale]/
    ├── layout.tsx                   # NextIntlClientProvider + SessionProvider
    ├── (public)/
    │   ├── page.tsx                 # 홈
    │   ├── places/
    │   │   ├── page.tsx             # 탐색 (Server) → PlacesClient
    │   │   ├── PlacesClient.tsx     # 목록·미리보기·지도·Bottom Sheet
    │   │   └── [id]/page.tsx        # 장소 상세
    │   ├── favorites/
    │   │   ├── page.tsx             # 로그인 필요 (requireUser)
    │   │   └── FavoritesList.tsx
    │   ├── my-dog/page.tsx          # 대표 반려견 (로그인 필요)
    │   ├── login/page.tsx
    │   └── forbidden/page.tsx
    └── (admin)/admin/
        ├── layout.tsx               # requireAdminPage 가드
        └── places/
            ├── page.tsx             # 장소 목록 + 통계
            ├── new/{page,actions}.tsx
            └── [id]/edit/{page,actions}.tsx
```

**v1 명세와의 차이 (문서 노후 → v2에서 실제 구조로 확정)**

| v1 | 실제 | 상태 |
|---|---|---|
| `(auth)/login`, `(user)/**` 라우트 그룹 | 전부 `(public)` 아래. 인증은 페이지 내부 `requireUser`로 처리 | ✅ 확정 |
| `/profile`, `/profile/dogs/**` | `/my-dog` 단일 라우트 | ✅ 확정 (기획서 v3 §6-5) |
| `/emergency`, `/about` | 없음 | ❌ 미구현 (P1 / 미계획) |
| `/admin`(대시보드), `/admin/candidates`, `/admin/reports` | 없음 | ❌ 미구현 → P1 |
| `api/places/search`, `api/health`, `api/webhooks/sentry` | 없음 | ❌ 미구현 |
| `loading.tsx` / `error.tsx` / `not-found.tsx` | **프로젝트 전체에 0개** | ❌ 미구현 → **P0** |
| `robots.ts` / `sitemap.ts` / `manifest.ts` | 없음 | ❌ 미구현 → P1 |

**미들웨어** — `src/middleware.ts`는 `next-intl` 로케일 처리만 수행한다. 인증 가드는 미들웨어가 아니라 페이지·액션 단위다. ✅ 확정 (v1의 "middleware로 protected route 가드"는 폐기)

---

## 3. 데이터 모델 (실제 `prisma/schema.prisma` 기준)

### 3-1. 존재하는 모델 ✅

```prisma
model User {
  id, email(unique), name?, image?, role(Role @default(USER)),
  locale(@default("en")), createdAt
  dogs Dog[]  favorites Favorite[]
}

model Place {
  id, tourApiId?(unique), nameKr, nameEn?, category(Category),
  address, location Unsupported("geography(Point, 4326)"),
  phone?, website?, instagram?, thumbnailUrl?,
  visibility(PlaceVisibility @default(DRAFT)),
  createdAt, updatedAt
  condition PlaceCondition?  verifications Verification[]  favorites Favorite[]
  @@index([category]) @@index([visibility])
}

model PlaceCondition {
  id, placeId(unique), indoor(IndoorPolicy),
  carrierStrollerPolicy(@default UNKNOWN), maxDogSize(@default UNKNOWN),
  leash(@default UNKNOWN), muzzle(@default UNKNOWN),
  vaccinationCertificatePolicy(@default UNKNOWN),
  breedRestrictions?, requiredItems String[], cautions?, updatedAt
}

model Verification {
  id, placeId, verifiedBy(String), method(VerificationMethod),
  verifiedAt, note?, createdAt
  @@index([placeId])
}

model Dog { id, userId, name, size(DogSize), breed?, createdAt }

model Favorite { id, userId, placeId, createdAt @@unique([userId, placeId]) @@index([userId]) }
```

**Enum**

| Enum | 값 |
|---|---|
| `Role` | USER, ADMIN |
| `Category` | RESTAURANT, CAFE, TRAVEL, ETC |
| `IndoorPolicy` | ALLOWED, OUTDOOR_ONLY, PARTIAL_AREA, NOT_ALLOWED, UNKNOWN |
| `CarrierStrollerPolicy` | NOT_REQUIRED, REQUIRED_INDOOR, REQUIRED_ALWAYS, UNKNOWN |
| `MaxDogSize` | SMALL, MEDIUM, LARGE, UNKNOWN |
| `LeashPolicy` | REQUIRED, NOT_REQUIRED, PARTIAL_AREA, UNKNOWN |
| `MuzzlePolicy` | REQUIRED, NOT_REQUIRED, CONDITIONAL, UNKNOWN |
| `VaccinationCertificatePolicy` | REQUIRED, NOT_REQUIRED, UNKNOWN |
| `VerificationMethod` | PHONE, DM, WEBSITE, ON_SITE, USER_REPORT |
| `PlaceVisibility` | VISIBLE, HIDDEN, DRAFT |
| `DogSize` | SMALL, MEDIUM, LARGE (UNKNOWN 없음 — 의도적) |
| `CarrierPolicy` | ⚠️ **어떤 모델도 참조하지 않는 잔존 enum.** 별도 마이그레이션으로 제거 예정 |

**v1 명세 대비 변경 (의도된 개선 — v2가 기준)**

| v1 | v2 (실제) | 근거 |
|---|---|---|
| `allowedSizes DogSize[]` | `maxDogSize MaxDogSize` 단일 상한 | 매장 정책은 상한으로 표현됨. 반려견 크기 비교가 자명해짐 |
| `carrier CarrierPolicy` + `strollerAllowed Boolean` | `carrierStrollerPolicy` 3상태 + UNKNOWN | "실내에서만 필요" 케이스 표현 가능 |
| `requiredItems`에 LEASH/CARRIER/STROLLER/MUZZLE 포함 | 전용 enum 필드로 승격. `requiredItems`는 `POOP_BAG` 하나만 | 준비물이 아니라 입장 조건이기 때문 |
| — | `vaccinationCertificatePolicy` 추가 | 매장 정책 저장용. **판정·필터에 미사용** (§7-4) |
| `IndoorPolicy`에 `PARTIAL_AREA` 없음 | 추가 | 실사용 케이스 |

### 3-2. 존재하지 않는 모델 ❌

| 모델 | v1 명세 | 현재 | v3 처리 |
|---|---|---|---|
| `Review` | 정의됨 | 없음 | **P2로 이동** (기획서 v3 §11) |
| `Report` | 정의됨 | 없음. 단 `REPORT_REASONS` / `REPORT_STATUS` 상수만 `src/lib/constants.ts`에 잔존 | **P1** |
| `Account` / `Session` / `VerificationToken` | Auth.js 표준 | 없음 | JWT 전략이라 불필요. 단 provider 추가 시 재검토 |
| `Place.hours` | `Json?` | 필드 없음 | **P0** (기획서 v3 P0-15). 구조 확정 → 아래 §3-4 |
| 후보(Candidate) 저장소 | `admin/candidates` 전제 | 없음 | **별도 모델을 만들지 않는다** (결정 D-05). `Place` + `visibility=DRAFT`로 저장 → §12 |

### 3-3. 마이그레이션 이력 ✅

```
20260522041432_init
20260529000000_condition_v2
20260615000000_add_vaccination_policy
20260706000000_carrier_stroller_3state
20260724000000_favorite
```

❓ **확인 필요**: PostGIS extension 활성화 여부는 실제 DB 인스턴스에서만 확인 가능하다. `location` 컬럼이 `Unsupported("geography(Point,4326)")`이고 raw SQL에서 `ST_X/ST_Y/ST_Distance`를 사용하므로 extension이 없으면 모든 장소 조회가 실패한다.

### 3-4. 운영시간 스키마 📋 계획 (결정 D-04)

`Place`에 두 필드를 추가한다.

```prisma
model Place {
  // ...
  hours     Json?     // 요일별 영업시간. 아래 OperatingHours 형태
  hoursNote String?   // 짧은 운영시간 메모 1줄 (브레이크타임 등)
}
```

```ts
// 요일별 영업시간. null = 휴무
interface OperatingHours {
  mon: DayHours | null;
  tue: DayHours | null;
  wed: DayHours | null;
  thu: DayHours | null;
  fri: DayHours | null;
  sat: DayHours | null;
  sun: DayHours | null;
}

interface DayHours {
  open: string;   // "09:00"  24시간 표기
  close: string;  // "21:00"
}
```

**설계 근거와 제약**

| 항목 | 결정 |
|---|---|
| 자유 텍스트 단독 저장 | **금지.** 운영자가 한국어로 적으면 영어 UI 사용자가 읽을 수 없어 서비스 전제가 무너진다 |
| 브레이크타임·정기휴무 구조화 | MVP 범위 밖. `hoursNote` 한 줄로 대신한다 (예: `Break 15:00-17:00`) |
| `hoursNote` 길이 | 최대 100자 권장. 짧은 보조 정보용이며 운영시간 본체를 대신하지 않는다 |
| `hoursNote` 언어 | 영어 입력을 원칙으로 한다. 관리자 폼에 안내 문구를 둔다 |
| 요일 표시 | UI에서 locale에 맞는 요일명으로 렌더한다. DB에는 요일 키만 저장한다 |
| "지금 영업 중" 표시 | MVP 범위 밖. 이 구조로 P1 이후 확장 가능 |
| 검증 | zod: `open`/`close`는 `HH:MM` 정규식, `open < close` |

**미해결 엣지 케이스**: 자정을 넘겨 영업하는 매장(예: 18:00–02:00)은 `open < close` 규칙에 걸린다. 해당 매장은 `close`를 `23:59`로 두고 `hoursNote`에 실제 마감을 적는 것으로 처리한다.

---

## 4. 도메인 타입 (실제 `src/types/place.ts`) ✅

```ts
type PlaceCategory      = "cafe" | "restaurant" | "travel";
type CategoryFilterValue= "all" | PlaceCategory;
type IndoorFilter       = "all" | "indoor" | "outdoor" | "partial-area" | "exclude-unknown";
type CarrierFilter      = "all" | "not-required" | "can-bring";
type DogSizeFilter      = "all" | "small" | "medium" | "large";
type RecentFilter       = "all" | "30days" | "90days";
type SortOption         = "distance" | "recent" | "indoor-first" | "no-carrier-first";
type ConditionStatus    = "good" | "warning" | "bad" | "neutral";

interface PlaceListItem {
  id; nameKr; nameEn|null; category: "cafe"|"restaurant"|"travel"|"etc";
  address; phone|null;
  location: {lat,lng} | null;
  distanceMeters: number | null;
  thumbnailUrl | null;
  indoor: "allowed"|"outdoor_only"|"partial_area"|"not_allowed"|"unknown"|null;
  carrierStrollerPolicy: "not_required"|"required_indoor"|"required_always"|"unknown"|null;
  maxDogSize: "small"|"medium"|"large"|"unknown"|null;
  leash: "required"|"not_required"|"partial_area"|"unknown"|null;
  muzzle: "required"|"not_required"|"conditional"|"unknown"|null;
  caution: string | null;
  latestVerifiedAt: string | null;     // "YYYY.MM.DD" 문자열
  verificationMethod: string | null;   // "Phone" | "DM" | ... 안정 라벨
}

interface CategoryPlacesResult { places: PlaceListItem[]; totalCount: number; }
type HomePlaceItem = Pick<PlaceListItem, ...10개>;   // ⚠️ 홈 통합 후 제거 대상 (§7-1)
interface PlaceDetail { ...PlaceListItem 일부 + website, instagram,
  condition: { ..., vaccinationCertificatePolicy, breedRestrictions, requiredItems, cautions } | null,
  latestVerification: { verifiedAt, method, note } | null }
```

**주의 — `latestVerifiedAt`는 문자열이다.** DB `Date`를 `"YYYY.MM.DD"`로 포맷해 클라이언트로 넘기고, 비교가 필요할 때 `parseVerifiedAt()`으로 되돌린다. 로케일별 날짜 표기(`DESIGN.md` §10)를 적용하려면 이 계약을 `Date`나 ISO 문자열로 바꿔야 한다. 📋 계획.

---

## 5. 조회 계층과 캐시

### 5-1. 조회 함수 (`src/lib/places/queries.ts`) ✅

| 함수 | 용도 | 범위 |
|---|---|---|
| `getPlaces({lat,lng,sort})` | 탐색 화면 | `visibility=VISIBLE` **AND** `category IN (RESTAURANT,CAFE,TRAVEL)` 전체. `take` 없음 |
| `getCategoryPlaces(category)` | 홈 카테고리 탭 | 위 조건 + 카테고리 필터, `take 8`, `count` 동시 반환 |
| `getHomePlaces()` | 홈 Recent 섹션 | ⚠️ `visibility=VISIBLE`만. **ETC 포함 — 위 두 함수와 범위 불일치** |
| `getPlaceById(id)` | 상세 | `VISIBLE`이 아니면 `null` |
| `getAdminPlaces()` / `getAdminPlaceById(id)` | 관리자 | 전체 상태 |

**좌표·거리 처리** ✅

- 좌표는 Prisma가 다루지 못하므로 `$queryRaw`로 `ST_Y/ST_X`를 별도 조회하고 `id`로 join한다.
- `lat/lng`가 주어지면 같은 쿼리에서 `ST_Distance(location, ST_SetSRID(ST_MakePoint(lng,lat),4326)::geography)`를 계산한다.
- 위치가 없으면 `distanceMeters = null`이며, UI는 거리를 아예 표시하지 않는다 (`DESIGN.md` §3.4 준수).

**미구현 / 계획**

| 항목 | 상태 | 내용 |
|---|---|---|
| 서버 페이징 (커서) | ❌ | v1 명세 G-07. 현재 전량 로드 |
| 반경 필터 (`ST_DWithin`) | ❌ | 전량에 대해 거리 계산 중 |
| 지도 Bounds 검색 | ❌ | **P2, 전국 확장 선행 조건** |
| 안전 상한 (`take` 가드) | ❌ | 📋 전량 조회를 임시 허용하는 대신 상한을 두는 것을 권장 |
| **검증 완료 장소만 공개** | ❌ | 📋 **P0.** 현재 `visibility`만 확인. `verifications: { some: {} }` 조건 추가 필요 |

**공개 조건 확정 (결정 D-07)**

모든 사용자 대상 조회는 다음 두 조건을 **함께** 만족해야 한다.

```ts
where: {
  visibility: "VISIBLE",
  verifications: { some: {} },   // 검증 이력 1건 이상
  // ...기존 카테고리 조건
}
```

적용 대상: `getPlaces` · `getCategoryPlaces` · `getPlaceById` · `getFavoritePlaces`

**데이터 마이그레이션은 수행하지 않는다.**

- 검증 이력이 없는 공개 장소가 있다면 조회 결과에서 빠질 뿐이다. 임시 확인일이나 확인 방법을 생성하지 않는다. (`DESIGN.md` §12 "검증일이나 확인 방법이 없으면 임의로 생성하지 않는다")
- 코드 근거상 영향 범위는 작을 가능성이 높다. `createPlaceRecord`가 `Place`·`Condition`·`Verification`을 항상 함께 기록하고(`lib/places/create-place.ts:54-62`), `placeInputSchema`가 `verification`을 필수로 요구하며(`lib/validation/place.ts:74-76`), `updatePlaceRecord`는 검증 이력을 삭제하지 않는다(`lib/places/update-place.ts:76-86`). 즉 **관리자 폼으로 등록된 장소는 영구적으로 검증 이력을 갖는다.**
✅ **영향 범위 확인 완료 (2026-08-13, DB 읽기 전용 조회)**

| 항목 | 값 |
|---|---|
| 전체 장소 | 4건 (모두 `VISIBLE`, `DRAFT`·`HIDDEN` 0건) |
| **검증 이력 없는 `VISIBLE` 장소 (D-07 대상)** | **0건** |
| 조건(`PlaceCondition`) 없는 `VISIBLE` 장소 | 0건 |
| 마지막 확인일 90일 초과 `VISIBLE` 장소 | 0건 |

→ **공개 조건을 추가해도 현재 노출 장소에 변화가 없다.** DRAFT 전환이나 별도 조치 대상이 없으므로, T-01은 조회 조건 추가만으로 완결된다.

향후 검증 이력 없는 공개 장소가 생기면 운영자가 실제로 확인한 뒤 검증 이력을 남겨 다시 공개한다. 어떤 경우에도 임시 이력을 만들지 않는다.

### 5-2. 캐시 ❌ 대부분 미구현

| 자원 | v1 명세 | 실제 |
|---|---|---|
| 홈 Featured | `revalidate 1800` + tag | 태그·revalidate 없음 |
| 장소 목록 | `no-store` | 명시 없음 (Prisma 호출로 사실상 동적) |
| 장소 상세 | ISR 3600 + `revalidateTag('place:id')` | 없음 |

**실제로 존재하는 무효화**: Server Action에서 `revalidatePath`만 사용한다.

- `createPlace` / `updatePlace` → `/{locale}`, `/{locale}/admin/places`, `/{locale}/places`, `/{locale}/places/{id}`
- `toggleFavorite` → `/{locale}/favorites`
- `upsertDog` → `/{locale}/my-dog`, `/{locale}/places`

📋 **계획**: 태그 기반 무효화 도입은 P1. 현 단계에서는 `revalidatePath`로 충분하며, 억지로 ISR을 붙이면 검증 데이터의 신선도 표시와 충돌한다.

### 5-3. 클라이언트 필터·정렬 (`src/lib/places/filtering.ts`) ✅

서버는 카테고리 범위와 공개 여부만 거르고, **나머지 필터·검색·정렬은 클라이언트에서 수행**한다.

- `filterPlaces()` — 카테고리, 검색어(nameKr/nameEn/address), indoor 5택, carrier 3택, dogSize, recent(30/90일)
- `sortPlaces()` — distance / recent / indoor-first / no-carrier-first
- `getActiveFilterCount()` — 필터 배지 숫자

**미확인 값 처리 규칙 (결정 D-03 — 코드 수정 필요)**

목표 규칙: **긍정 조건 필터는 `UNKNOWN`/`null`을 제외한다.**

| 필터 | 현재 동작 | 목표 동작 |
|---|---|---|
| `indoor = "indoor"` (실내 가능) | `unknown`/`null` **통과** ❌ | **제외** |
| `indoor = "outdoor"` / `"partial-area"` | `unknown`/`null` **통과** ❌ | **제외** |
| `indoor = "exclude-unknown"` | 미확인만 제외하는 별도 옵션 | **옵션 자체를 삭제** (D-12) |
| `carrier = "not-required"` | `unknown`/`null` 제외 ✅ | 유지 |
| `carrier = "can-bring"` | `unknown`/`null` 제외 ✅ | 유지 |
| `dogSize` | 상한 미달만 제외, `unknown` 통과 | **유지** — 크기 필터는 `EligibilityBanner`가 `Size limit unconfirmed`로 별도 단언하므로 목록에서 지우지 않는다 |
| `recent` | 확인일 없으면 제외 ✅ | 유지 |

근거: `lib/places/eligibility.ts`의 원칙("확인되지 않은 조건을 가능한 조건처럼 보이게 하지 않는다")을 필터에도 동일하게 적용한다. 사용자가 특정 조건으로 걸렀는데 미확인 장소가 섞여 나오는 것이 신뢰를 가장 크게 훼손한다.

**`exclude-unknown` 옵션 제거 (결정 D-12)**

모든 긍정 조건 필터가 같은 규칙으로 동작하므로 실내 전용 옵션은 불필요하다. **전역 "확인된 조건만 보기" 토글도 MVP에 넣지 않는다.**

제거 시 함께 정리할 대상:

| 위치 | 대상 |
|---|---|
| `src/types/place.ts` | `IndoorFilter` union에서 `"exclude-unknown"` 제거 |
| `src/lib/places/filtering.ts` | `filters.indoor === "exclude-unknown"` 분기 제거 |
| `src/components/places/FilterModal.tsx` | `INDOOR_OPTIONS`에서 해당 항목 제거 |
| `messages/en.json` · `messages/ko.json` | `places.filters.indoor.excludeUnknown` 키 제거 (양쪽 동시) |

---

## 6. Server Action

### 6-1. 현재 존재하는 Action ✅

| 파일 | 함수 | 인가 | 반환 형태 |
|---|---|---|---|
| `lib/places/actions.ts` | `fetchCategoryPlaces(category)` | 없음(공개) | `CategoryPlacesResult` (순수 값) |
| `lib/favorites/actions.ts` | `toggleFavorite(placeId)` | `getCurrentUser()` | `{favorited} \| {error:"AUTH_REQUIRED"}` |
| `lib/dogs/actions.ts` | `upsertDog(locale, prevState, formData)` | `requireUserAction()` | `DogFormState` |
| `admin/places/new/actions.ts` | `createPlace(...)` | `requireAdminAction()` | `CreatePlaceState` |
| `admin/places/[id]/edit/actions.ts` | `updatePlace(...)` | `requireAdminAction()` | 동일 형태 |

### 6-2. `Result<T, AppError>` 규약 — 폐기 (결정 D-10)

`src/lib/result.ts`와 `src/lib/errors.ts`(에러 코드·HTTP 매핑)는 존재하지만 **어떤 Action도 사용하지 않는다.** 각 Action이 서로 다른 반환 형태를 쓴다.

**확정 사항**

| 대상 | 처리 |
|---|---|
| `src/lib/result.ts` | **제거한다.** 사용처가 없고, 앞으로도 통일하지 않는다 |
| `src/lib/errors.ts` | **유지한다.** 에러 코드와 HTTP 매핑은 REST 엔드포인트를 추가할 때 다시 필요하다 |
| 기존 5개 Action | 현재의 형태별 반환을 **정식 규약으로 인정**한다 |

근거: 폼 액션은 `useFormState` 때문에 `{ fieldErrors }` 형태가 필요하고, 값 반환 액션은 값 자체를 돌려주는 편이 단순하다. 요구 형태가 다른 둘을 하나의 래퍼로 묶으면 호출부가 매번 언랩해야 해 오히려 복잡해진다. (`src/CLAUDE.md` §12.2 "잘못된 추상화보다 약간의 중복이 낫다")

**Action 반환 형태 규약 (확정)**

| 유형 | 형태 | 예 |
|---|---|---|
| 폼 제출 | `{ success?, fieldErrors?, error? }` | `upsertDog`, `createPlace`, `updatePlace` |
| 상태 토글 | `{ 결과값 } \| { error: 코드 }` | `toggleFavorite` |
| 데이터 조회 | 값 자체 (실패는 throw) | `fetchCategoryPlaces` |

### 6-3. 미구현 Action ❌

| 함수 | v1 명세 | v3 우선순위 |
|---|---|---|
| `listPlaces(filters)` 커서 페이징 | 6-2 | P2 |
| `deletePlace(id)` | 6-2 | 미계획 (관리자는 `HIDDEN` 사용) |
| `syncTourCandidates(params)` | 6-2 | **P0** (§12) |
| `createReview` / `deleteMyReview` / `listReviewsForPlace` | 6-4 | P2 |
| `reportPlace` / `listReports` / `resolveReport` | 6-6 | P1 |
| `listMyFavorites(cursor)` | 6-5 | 불필요 (페이지에서 직접 조회) |
| Dog CRUD (`create/update/delete` 분리) | 6-3 | P2 (대표 1마리 upsert로 충분) |

---

## 7. 화면 명세

### 7-1. 홈 `/{locale}` 🟡

**현재 구현**

| 섹션 | 컴포넌트 | 상태 |
|---|---|---|
| Hero | `HeroSection` + `HeroActions` | ✅ 검색 폼 + "Near me". ⚠️ 일러스트는 플레이스홀더 박스 |
| **카테고리 탭** | `CategorySection`(Server) → `CategoryPlaceTabs`(Client) | ✅ |
| 안내 | `InfoSection` | ✅ 확인 항목 5종 |
| Recent Places | `RecentPlacesSection` + `HomePlaceCard` | ⚠️ **제거 대상** |

**카테고리 탭 상세** ✅

- 탭: `all / restaurant / cafe / travel` (Radix `Tabs`)
- 서버에서 `all` 탭 결과만 미리 조회(`getCategoryPlaces("all")`) → 나머지는 탭 선택 시 Server Action `fetchCategoryPlaces`로 지연 로딩
- 이미 받은 카테고리는 `resultsByCategory`에 캐시해 재조회하지 않음
- 빠른 탭 전환 시 늦게 도착한 응답이 현재 탭을 덮지 않도록 `latestRequest` ref로 가드
- 즐겨찾기: 서버에서 `getFavoritePlaceIds(user.id)`를 받아 카드에 전달, `CategoryPlaceCard`가 `FavoriteButton`을 링크 오버레이 위에 배치
- 상태: 로딩(직전 카드 수만큼 스켈레톤) / 빈 상태 / 오류 + `Try again` 모두 구현
- 그리드: 1 / sm 2 / lg 4열

**📋 계획 — 홈 장소 탐색 섹션 단일화 (P0)**

기획서 v3 §6-1에 따라 홈의 장소 탐색 섹션을 하나로 통합한다.

| 조치 | 대상 |
|---|---|
| 유지 | `CategorySection` + `CategoryPlaceTabs` + `CategoryPlaceCard` |
| 제거 | `RecentPlacesSection`, `HomePlaceCard`, `getHomePlaces()`, `HomePlaceItem` 타입, `home.recentPlaces` 메시지 키 |
| 결과 | 홈에서 같은 장소가 두 번 노출되지 않고, `getHomePlaces`의 ETC 포함 범위 불일치도 함께 해소됨 |

**📋 계획 — 카테고리 라벨 변경 (P0)**

영어 라벨 `Travel Spots` → **`Attractions`**. `messages/en.json`의 `home.categories.tabs.travel`, `places.filters.category.travel`, `places.card.category.travel` 문자열만 변경한다. **enum `TRAVEL`과 내부 값 `travel`은 유지**한다.

**❌ 미구현**

- 홈 조회 실패 시 `page.tsx`가 try/catch로 오류를 삼키고 빈 배열로 렌더 → "실패"와 "데이터 없음"이 구분되지 않음. `error.tsx` 필요 (**P0**)

### 7-2. 장소 탐색 `/{locale}/places` ✅ (핵심 부분 구현 완료)

**서버 (`places/page.tsx`)**

- `searchParams`: `lat`, `lng`, `sort`, `category`, `q`
- 좌표는 범위 검증 후 사용, 카테고리는 화이트리스트 파싱
- 로그인 시 `getFavoritePlaceIds` + `getUserDog` 병렬 조회 → 대표 반려견 크기를 `defaultDogSize`로 전달

**클라이언트 (`PlacesClient.tsx`)**

레이아웃 (`DESIGN.md` §5 규정을 그대로 구현):

| 폭 | 목록 | 미리보기 | 지도 |
|---|---|---|---|
| `lg` 미만 | 지도 위 Bottom Sheet | 시트 3단계 안 | 전체 |
| `lg` (1024–1279) | 좌측 340px 컬럼 | **지도 위 오버레이** (`left-[356px]`, 360px) | 나머지 |
| `xl` 이상 (1280+) | 좌측 340px | 3분할 컬럼 380px. **미선택 시 `w-0`으로 접힘** | 나머지 |

모바일 Bottom Sheet 3단계 ✅ (기획서 v3 §6-2와 일치):

| 상태 | 높이 | 조건 |
|---|---|---|
| `peek` | `h-24` | 선택 없음 + 목록 닫힘 |
| `results` | `h-[75vh]` | 목록 열림 |
| `selected` | `h-72` | 장소 선택됨 |

- 시트 상태는 선택 상태에서 **파생**한다(별도 state 아님). 요약을 닫으면 직전 단계로 자연스럽게 복귀.
- 전환 컨트롤은 단일 토글 버튼(`Show list` ↔ `Show map`)이다. `DESIGN.md` §5의 "segmented control" 표현과 다르나, 3단계 시트 구조에서는 토글이 실제 동작에 맞다.

선택 상태 동기화 🟡

| 방향 | 상태 |
|---|---|
| 카드 hover → 마커 강조 | ✅ |
| 카드 선택 → 미리보기 + 마커 선택 | ✅ |
| 마커 선택 → 미리보기 | ✅ |
| **마커 선택 → 목록에서 해당 카드로 스크롤** | ❌ **미구현 (P0)** |

지도 (`MapPanel.tsx`) 🟡

- `apiKey`에만 의존해 **1회 초기화**. 선택/hover 변경 시 마커를 재생성하지 않고 `setIcon`/`setZIndex`만 갱신 → `DESIGN.md` §12 "재마운트 금지" 준수 ✅
- 중심 우선순위 (현재): 사용자 위치 → 선택 장소 → **목록의 첫 장소** → `SEOUL_CITY_HALL`
  - 최종 fallback(`SEOUL_CITY_HALL`)은 **공개 장소가 0건일 때만** 실제로 쓰인다. 장소가 있으면 첫 장소 좌표가 먼저 선택된다.
  - 📋 **D-11에 따라 최종 fallback을 대전 좌표로 교체한다.**
- 마커 색상은 `getComputedStyle`로 CSS 토큰을 읽어 사용 ✅
- ⚠️ deprecated `google.maps.Marker` 사용 중. `importLibrary("marker")`를 호출하지만 `AdvancedMarkerElement`는 쓰지 않음 → 📋 마이그레이션 필요
- ❌ 로딩/오류/키 없음 문구가 **영어 하드코딩**, 재시도 수단 없음 (**P0**)

필터·정렬 🟡

- `FilterModal` — 우측 Drawer. 실내(5택) / 이동장(3택) / 크기(4택) / 신선도(30·90일)
- `SortDropdown` — 4종. 위치 없으면 거리순 `disabled`
- ❌ 필터·정렬·카테고리 변경이 **URL에 반영되지 않는다.** 초기값만 `searchParams`에서 읽고 이후는 `useState`. `src/CLAUDE.md` §14.3 위반 → **P0**
- ❌ `FilterModal`에 focus trap / ESC / `role="dialog"` 없음 → **P0** (프로젝트에 `components/ui/sheet.tsx`, `dialog.tsx`가 이미 존재하나 미사용)

위치 (`useUserLocationQuery.ts`) ✅

- Geolocation 성공 → `lat`/`lng`/`sort=distance`를 URL에 반영(`router.replace`, scroll 유지)
- 거부/차단을 구분해 각각 다른 안내 배너 노출
- ⚠️ v1 명세의 "서울시청 fallback + 거리 표시"는 채택하지 않았다. **위치가 없으면 거리를 표시하지 않는다** (`DESIGN.md` §3.4 준수). 좌표 fallback은 지도 중심 결정에만 쓴다. ✅ v2 기준으로 확정

**서비스 범위 안내 📋 계획 (결정 D-11)**

대전 단독 공개 기간(기획서 v3 §9) 동안 다른 지역 사용자가 겪는 상태를 명시적으로 처리한다.

| 항목 | 규격 |
|---|---|
| 기본 지도 중심 | `SEOUL_CITY_HALL` → **대전 좌표**로 교체. 위치 권한이 없거나 거부된 경우 대전 지도를 표시 |
| 서비스 범위 배너 | 초기 서비스 범위가 대전임을 알리는 안내를 탐색 화면에 노출 |
| 범위 밖 사용자 | 사용자 위치가 서비스 범위 밖이면 **`현재 대전 지역만 지원합니다`** 안내 + **`대전 장소 보기`** 버튼. 사용자가 허용한 위치를 말없이 무시하고 지도를 옮기지 않는다. 이동은 버튼으로 사용자가 선택한다 |
| 범위 판정 | 지역 필드를 만들지 않는다(기획서 v3 §9-5). **공개 장소 중 최단 거리**가 임계값을 넘으면 범위 밖으로 본다. 임계값은 구현 시 결정하되 기본 50 km를 권장 |

**빈 상태 2종 분리 (결정 D-11)**

원인이 다르면 다음 행동도 달라야 한다. 현재는 `list.empty` 하나로 뭉뚱그려져 있다.

| 상태 | 조건 | 문구 | 액션 |
|---|---|---|---|
| 서비스 범위 밖 | 사용자 위치 기준 최단 거리 > 임계값 | `현재 대전 지역만 지원합니다` | `대전 장소 보기` |
| 필터 결과 0건 | 필터 적용 후 결과 없음 (위치 무관) | 조건에 맞는 장소가 없다는 안내 | **`필터 초기화`** |

- 두 상태가 동시에 성립하면 **서비스 범위 밖을 우선** 표시한다. 필터를 아무리 풀어도 결과가 나오지 않는 상황이므로 `필터 초기화`를 권하면 사용자를 헛돌게 한다.
- 문구는 `DESIGN.md` §7 States와 §9 Voice를 따른다. 신규 i18n 키는 en/ko 동시에 추가한다.

### 7-3. 선택 장소 미리보기 (`PlacePreviewCard.tsx`) 🟡

구조: header(고정) / body(스크롤) / footer(고정) — `DESIGN.md` §6 준수 ✅

| 영역 | 내용 | 상태 |
|---|---|---|
| header | 카테고리 아이콘 · 장소명 · 카테고리 · 거리 · **전체 주소** · 닫기 | ✅ |
| body | 방문 가능 상태 단언 + 확인일·확인 방법 → 허용 조건 배지 → 지켜야 할 조건 목록 → 주의사항(3줄 클램프 + 더보기) | ✅ |
| footer | 즐겨찾기 · 길찾기 · 상세 보기 | 🟡 |

- 선택이 바뀌면 제목에 `focus()`를 옮겨 스크린리더가 변경을 인지하게 함 ✅
- 대표 이미지·운영시간·연락처·문의 문구를 넣지 않음 — `DESIGN.md` §6 준수 ✅
- ❌ **Primary Action이 규정과 반대다.** 현재 길찾기가 `default`(파랑), 상세 보기가 `outline`. 기획서 v3 §6-3은 **`상세 보기`가 Primary**, 길찾기는 Secondary. → **P0** (`PlacePreviewCard.tsx`의 `detailsVariant` 로직 반전)

**판정 로직 (`lib/places/eligibility.ts`)** ✅ — 이 파일이 조건 해석의 단일 출처다. 카드·미리보기·홈 카드가 모두 여기를 호출하며 각자 조건을 재해석하지 않는다.

| 함수 | 역할 |
|---|---|
| `getVisitEligibility(place, dogSize)` | 대표 반려견 기준 판정. `dogSize="all"`(프로필 없음)이면 `null` → 배너 미표시 |
| `getPlaceConditionBreakdown(place)` | 조건을 `allowances`(확실히 허용) / `conditions`(지켜야 함)로 분리. **`unknown`·`null`은 어느 쪽에도 넣지 않는다** |
| `getVisitStatus(place, dogSize)` | `notAllowed` → `confirm`(핵심 3조건 중 미확인 존재) → `conditional` → `available` 순으로 판정 |

### 7-4. 장소 상세 `/{locale}/places/[id]` 🟡

**현재 순서**

```
뒤로 가기
대표 이미지 (없으면 카테고리 아이콘)
카테고리 배지 · 장소명 · 보조명 · 주소 · 확인일
Before You Go            ← BeforeYouGoCard
디스클레이머 (1문장)
Place Info               ← 전화 / 웹사이트 / 인스타그램 / Google Maps 링크
Verification Info        ← 확인일 · 확인 방법 · 메모
Ask the store in Korean  ← 영어 로케일에서만
```

**`DESIGN.md` §6 규정 대비 차이**

| 규정 순서 | 현재 | 상태 |
|---|---|---|
| 거리 표시 | 없음 | ❌ |
| 길찾기·전화·공유 액션 영역 | 전화는 본문 링크, **길찾기·공유·즐겨찾기 버튼 없음** | ❌ **P0** |
| `Before You Go`를 이미지 바로 아래 | ✅ | ✅ |
| 확인일·확인방법·디스클레이머 | 디스클레이머는 앞, 검증 정보는 연락처 뒤 → 순서 어긋남 | 🟡 |
| 운영시간 | **전 계층 없음.** 스키마 확정됨 → §3-4 | ❌ **P0** |
| `Ask the store in Korean` | 구현됨, EN 전용 | ⚠️ **제거 대상** (아래) |
| 신고 | 없음 | ❌ P1 |

**`BeforeYouGoCard`** ✅ — 실내 / 이동장·유모차 / 최대 크기 / 목줄 / 입마개 / 예방접종 6행 + 주의사항(경고 박스) + 준비물 + 견종 제한.

📋 **계획 — 예방접종 행 조건부 숨김 (P0)**
기획서 v3 §6-4에 따라 `vaccinationCertificatePolicy`가 `unknown`/`null`이면 해당 행을 **렌더링하지 않는다.** 현재는 `Check with store`로 항상 표시된다.

📋 **계획 — `Ask the store in Korean` 비노출 (P0)**
기획서 v3 §11에 따라 MVP에서 제외한다.
- **코드를 삭제하지 않는다.** `places/[id]/page.tsx`의 `{safeLocale === "en" && <KoreanInquiryBox />}` 렌더 분기를 제거해 화면에 노출되지 않게만 한다.
- `KoreanInquiryBox.tsx`와 `places.detail.koreanInquiry` 메시지 키는 P1 동적 재도입을 위해 보존한다.
- **문서 정합성 처리 완료 (결정 D-01)**: `DESIGN.md` v1.2 §6의 Korean Inquiry Box 절과 `Included Components` 목록, `Place Detail Page` 표시 순서 7번에 **MVP 제외 / P1 재도입 예정** 표기가 반영되었다. 규정 자체는 재도입 시점의 기준으로 보존한다.

**❌ 미구현 — SEO 일체**
`generateMetadata`, JSON-LD(LocalBusiness), Open Graph, hreflang, canonical, `sitemap.ts`, `robots.ts` 모두 없다. 루트 `layout.tsx`에 한국어 고정 metadata 1개뿐. → P1

**❌ 미구현 — 이미지 최적화**
`next.config.mjs`에 `images.remotePatterns` 설정이 없어 모든 `<Image>`가 `unoptimized`다. 외부 이미지 도메인을 등록해야 한다. → P1

### 7-5. 즐겨찾기 `/{locale}/favorites` ✅

- `requireUser`로 로그인 강제 (미로그인 시 `callbackUrl` 보존 리다이렉트)
- `getFavoritePlaces(userId)` — `place.visibility=VISIBLE`인 것만, 최신순
- `FavoritesList`는 **탐색 화면과 동일한 `PlaceCard`를 재사용**한다 (`action="openDetails"`) ✅ v1 명세 3-8 준수
- 대표 반려견 크기를 전달해 카드에 방문 가능 여부 배너 표시 ✅
- 빈 상태 처리 ✅
- `FavoriteButton`: 낙관적 토글 + 실패 시 롤백 + 비로그인 시 로그인 유도 ✅
  - ⚠️ i18n 키가 `places.selectedPlacePanel.favorite.*`를 참조한다. `SelectedPlacePanel.tsx`는 이미 삭제된 컴포넌트다 → 키 이름 정리 필요

### 7-6. 인증 ✅

- Auth.js v5, **Google 단독**, `session.strategy = "jwt"` — 기획서 v3 §6 확정
- Adapter를 쓰지 않고 `signIn` 콜백에서 `prisma.user.upsert`로 직접 동기화한다. `Account`/`Session` 테이블 없음.
- 인가 헬퍼

| 헬퍼 | 용도 |
|---|---|
| `getCurrentUser()` | 세션에서 사용자 추출 (없으면 `null`) |
| `requireUser(locale, callbackPath)` | 페이지용. 미인증 시 로그인으로 redirect |
| `requireUserAction()` | Action용. `UserAuthorizationError` throw |
| `requireAdminPage(locale, ...)` | 관리자 페이지. 미인증 → 로그인 / 비관리자 → `/forbidden` |
| `requireAdminAction()` | 관리자 Action. `AUTH_REQUIRED` / `FORBIDDEN` 구분 |

- `getSafeCallbackUrl()`로 Open Redirect 방어 ✅
- ❌ **버그**: `src/auth.ts`의 `pages.signIn`/`pages.error`가 `"/en/login"`으로 하드코딩되어 한국어 사용자가 영어 로그인 페이지로 이동한다 → **P0**

### 7-7. 대표 반려견 `/{locale}/my-dog` ✅

- 로그인 필수. `getUserDog(userId)`는 `findFirst`(가장 오래된 1건) — 실질적으로 대표 1마리
- `upsertDog` Server Action: 존재하면 update, 없으면 create → **1마리 정책이 코드로 강제됨**
- 저장 후 `/{locale}/my-dog`, `/{locale}/places` 재검증 → 필터 기본값 즉시 반영
- 입력: 이름 / 크기(SMALL·MEDIUM·LARGE) / 견종(선택), zod 검증 + 필드별 오류
- ❌ 비회원 localStorage 저장, 여러 마리 CRUD 없음 → **의도된 제외** (기획서 v3 §6-5, P2)

### 7-8. 관리자 🟡

**장소 목록 `/{locale}/admin/places`** ✅

- 통계 6종: 전체 / 공개 / 초안 / 숨김 / **조건 미입력** / **미검증**
- 데스크톱 테이블 + 모바일 카드 이중 레이아웃
- 조건 요약 3줄(실내·이동장·최대 크기), 검증일, 상태 배지
- ❌ 상태별 필터, 페이지네이션, 정렬 없음

**장소 등록/수정 `/admin/places/new`, `/[id]/edit`** ✅

- 단일 스크롤 폼, 5개 섹션: 기본 정보 / 연락처 / 조건 / 검증 / 외부 데이터
  - v1 명세의 `Tabs (Basic·Conditions·Hours·Verification)` 구조는 채택하지 않았다. **v2에서는 단일 스크롤 폼을 기준으로 한다.**
- `LocationPickerMap`으로 지도 클릭 좌표 입력 ✅ (v1의 지오코딩보다 실용적)
- 검증: `placeInputSchema`(생성, verification **필수**) / `placeUpdateSchema`(수정, verification 선택 + 교차 필드 검증)
  - 미래 날짜 검증일은 KST 기준으로 거부 ✅
  - 생성 시 항상 `Verification` 1건이 함께 기록된다 → 기획서 v3 §4-1의 "검증 완료" 정의와 정합
- `createPlaceRecord`는 PostGIS 컬럼 때문에 `$executeRaw` + 트랜잭션으로 Place/Condition/Verification을 함께 기록 ✅
- ⚠️ 폼 옵션 라벨(`INDOOR_LABELS` 등)이 **한국어 하드코딩**. i18n 미적용 → P1

**❌ 미구현**: 관리자 대시보드(통계 화면), 후보 목록, 신고 처리 → P1
**❌ 미구현**: 운영시간 입력 → **P0** (기획서 v3 P0-15). 구조는 §3-4에 확정되어 있다 (D-04). 관리자 폼에는 요일별 시작·종료 7행 + `hoursNote` 1줄을 추가한다.

---

## 8. 컴포넌트 인벤토리 (실제)

### 8-1. 존재하는 도메인 컴포넌트 ✅

| 컴포넌트 | 유형 | 역할 |
|---|---|---|
| `places/PlaceCard` | Client | 목록·즐겨찾기용 밀도형 카드 (이미지 없음) |
| `places/PlaceConditionSummary` | Client | 조건 요약. `compact`(3개) / `detailed` |
| `places/EligibilityBanner` | Client | 대표 반려견 기준 방문 가능 여부 단언 |
| `places/ConditionBadge` | — | 조건 값 배지 |
| `places/PlacePreviewCard` | Client | 선택 장소 미리보기 |
| `places/BeforeYouGoCard` | Server | 상세 조건 표 |
| `places/KoreanInquiryBox` | Client | 한국어 문의 문구 (**MVP 비노출 예정**) |
| `places/FavoriteButton` | Client | 낙관적 즐겨찾기 토글 |
| `places/MapPanel` | Client | Google Maps + 마커 |
| `places/FilterModal` | Client | 우측 Drawer 필터 |
| `places/SortDropdown` | Client | 정렬 |
| `home/CategoryPlaceTabs` / `CategoryPlaceCard` | Client | 홈 카테고리 탭·카드 |
| `home/HomePlaceCard` / `RecentPlacesSection` | Server | **제거 대상** (§7-1) |
| `home/HeroSection` / `HeroActions` / `InfoSection` / `CategorySection` | 혼합 | 홈 섹션 |
| `admin/PlaceForm` / `admin/LocationPickerMap` | Client | 관리자 폼 |
| `dogs/DogProfileForm` | Client | 대표 반려견 폼 |
| `i18n/LocaleSwitcher`, `Header` | Client | 공통 |
| `ui/*` | — | button, badge, card, dialog, dropdown-menu, input, sheet, skeleton, sonner |

### 8-2. `DESIGN.md` "Included Components" 중 독립 컴포넌트로 존재하지 않는 것

`SearchField`, `FilterChip`, `CategoryTab`, `SortControl`, `ConditionRow`, `VerificationStatus`, `MapMarker`, `IconButton`, `LocationPermissionBanner`, `EmptyState`, `Snackbar`, `Drawer`, `BottomSheet`, `AdminTable`

→ 대부분 페이지/패널 안에 인라인으로 구현되어 있다. 📋 반복 사용이 3회를 넘는 것부터 추출한다(`src/CLAUDE.md` §12.2). 지금 일괄 추출하지 않는다.

### 8-3. 미사용 코드 ⚠️

| 파일/심볼 | 상태 |
|---|---|
| `src/lib/mock-places.ts` | 참조 0건 |
| `lib/geo/distance.ts`의 `haversineDistance`, `formatWalkingTime` | 참조 0건 |
| `src/lib/result.ts` | 정의만, 사용 0건 |
| `CarrierPolicy` enum | 모델 미참조 |
| `places.selectedPlacePanel.*` 메시지 키 | 컴포넌트 삭제됨, `FavoriteButton`만 참조 |
| `REPORT_REASONS` / `REPORT_STATUS` 상수 | 모델·UI 없음 (P1 신고 기능에서 사용 예정) |

---

## 9. i18n ✅

- `next-intl` v4, `locales = ["en","ko"]`, `defaultLocale = "en"`, `localePrefix = "always"`
- 미들웨어가 로케일 라우팅 담당
- **메시지 키 374개, en/ko 완전 일치. 누락 0건** ✅
- 최상위 네임스페이스: `home`, `places`, `header`, `favorites`, `myDog`, `common`, `auth`, `admin`
- 장소명 표기 (`lib/i18n/locale.ts`) — `DESIGN.md` §10 준수 ✅
  - `en`: primary = `nameEn ?? nameKr`, secondary = `nameKr`
  - `ko`: primary = `nameKr`, secondary = `nameEn`

**미구현 / 미준수**

| 항목 | 상태 |
|---|---|
| 지도 오류·로딩 문구 | ❌ 영어 하드코딩 (`MapPanel.tsx`) → P0 |
| 관리자 폼 옵션 라벨 | ❌ 한국어 하드코딩 (`PlaceForm.tsx`) → P1 |
| 날짜 로케일 표기 | ❌ 항상 `YYYY.MM.DD`. `DESIGN.md` §10은 `Checked on July 20, 2026` / `7월 20일 확인` → P1 |
| 거리 표기 | 🟡 `formatDistance`는 m/km 구분은 하나 **10 m 단위 반올림 미적용**, ko는 공백 없음(`350m`) → P1 |
| 폰트 | ⚠️ `Inter` latin subset only. **한글 서브셋 없음** → P1 |
| `Accept-Language` 협상 | ❓ next-intl 기본 동작에 의존. 명시 코드 없음 |

---

## 10. 오류 · 로딩 · 빈 상태

| 화면 | 로딩 | 빈 상태 | 오류 |
|---|---|---|---|
| 홈 카테고리 탭 | ✅ 스켈레톤 | ✅ | ✅ 재시도 버튼 |
| 홈 Recent | ❌ | ✅ | ❌ (page.tsx가 삼킴) |
| 장소 탐색 목록 | ❌ | ✅ | ❌ |
| 지도 | 🟡 "Loading map..." 하드코딩 | ✅ 좌표 없는 경우 안내 | 🟡 영어 하드코딩, 재시도 없음 |
| 장소 상세 | ❌ | — | ❌ (`notFound()`만) |
| 즐겨찾기 | ❌ | ✅ | ❌ |
| 관리자 목록 | ❌ | ✅ | ❌ |
| 폼 (반려견·장소) | ✅ `useFormStatus` | — | ✅ 필드별 인라인 |

📋 **P0 작업 ①** — 빈 상태를 2종으로 분리한다 (D-11). 현재 `places.list.empty` 하나로 처리되는 것을 **서비스 범위 밖**(→ `대전 장소 보기`)과 **필터 결과 0건**(→ `필터 초기화`)으로 나눈다. 상세 규격은 §7-2 참조.

📋 **P0 작업 ②** — 다음 파일을 생성한다.

```
[locale]/(public)/loading.tsx, error.tsx
[locale]/(public)/places/loading.tsx, error.tsx
[locale]/(public)/places/[id]/loading.tsx, error.tsx, not-found.tsx
[locale]/(public)/favorites/loading.tsx
[locale]/(admin)/admin/places/loading.tsx, error.tsx
[locale]/error.tsx, not-found.tsx
```

문구와 시각 처리는 `DESIGN.md` §7 States 표를 따른다.

---

## 11. 접근성

**준수 중** ✅

- 시맨틱 태그(`header`/`nav`/`main`/`section`/`article`), `aria-label` on 아이콘 버튼
- 카드 전체 선택은 투명 `<button>` 오버레이 + `sr-only` 라벨 (중첩 인터랙티브 요소 회피)
- 상태를 색상만으로 전달하지 않음 — 모든 상태에 아이콘 + 텍스트 병기
- `focus-visible:ring` 일관 적용, `outline-none` 단독 사용 없음
- 터치 타깃 44px(`h-11`) 일관 적용
- 미리보기 선택 변경 시 제목으로 포커스 이동
- `motion-reduce:` 대응 (시트 전환, 스피너)
- 장식 아이콘 `aria-hidden`

**미준수 / 미구현** ❌

| 항목 | 상태 | 우선순위 |
|---|---|---|
| Bottom Sheet · FilterModal의 focus trap / ESC / `role="dialog"` | ❌ | **P0** |
| `SortDropdown` — `aria-expanded`, `role="listbox"` 없음. `▲▼` 텍스트 아이콘 | ❌ | P1 |
| 마커/카드 선택 결과의 `aria-live` 고지 | ❌ | P1 |
| Skip to content 링크 | ❌ | P1 |
| 대비비(4.5:1) 실측 검증 | ❓ | P1 |

> `components/ui/sheet.tsx`, `dialog.tsx`, `dropdown-menu.tsx`(Radix 기반)가 이미 프로젝트에 있으므로, 위 P0/P1 항목은 새 라이브러리 도입 없이 해결 가능하다.

---

## 12. TourAPI Import 구조 📋 (전면 미구현)

### 12-1. 현재 상태 ❌

코드에 남아 있는 것은 껍데기뿐이다.

| 잔존물 | 위치 |
|---|---|
| `Place.tourApiId` 컬럼 (`@unique`) | `prisma/schema.prisma` |
| 관리자 폼의 `tourApiId` **수동 입력 필드** | `components/admin/PlaceForm.tsx` |
| `TOUR_API_ERROR` 에러 코드 (사용처 0건) | `src/lib/errors.ts` |
| `TOUR_API_SERVICE_KEY` 환경변수 자리 | `.env.example` |

**API 클라이언트, 매퍼, 동기화 Action, 후보 저장소, 후보 화면 모두 존재하지 않는다.**

### 12-2. MVP 최소 범위 (P0)

기획서 v3 §8-1에 따라, MVP가 확보해야 할 것은 대시보드가 아니라 **반복 실행 가능한 파이프라인**이다.

```
① 원본 조회        외부 API 또는 파일에서 장소명·주소·좌표·이미지·분류 획득
② 중복 방지 Import  원본 식별자 기준 upsert. 이미 있는 건 건너뜀
③ 후보 저장        조건 미입력 상태. 사용자 화면 노출 금지
④ 관리자 검토      후보를 열어 조건 입력
⑤ 검증 기록        확인 방법 + 확인일
⑥ 공개 전환        검증 완료 → 사용자 화면 노출
```

**설계 요건**

| 요건 | 내용 |
|---|---|
| 멱등성 | 같은 원본을 여러 번 실행해도 중복 레코드가 생기지 않을 것 (`tourApiId` unique 활용) |
| 격리 | 후보는 어떤 사용자 조회 경로에도 나타나지 않을 것 (§5-1 공개 조건과 함께 보장) |
| 부분 실패 허용 | 일부 항목 실패가 전체 Import를 중단시키지 않을 것. 실패 목록을 남길 것 |
| 좌표 | PostGIS `geography(Point,4326)`로 저장. 좌표 없는 항목은 후보로만 남기고 공개 불가 |
| 조건 | Import는 조건을 **추측하지 않는다.** 전부 `UNKNOWN`으로 시작 |

**후보 저장 방식 — `Place` + `visibility=DRAFT` (결정 D-05)**

별도 `PlaceCandidate` 모델을 만들지 않는다.

| 항목 | 내용 |
|---|---|
| 저장 위치 | `Place` 테이블, `visibility = DRAFT` |
| 조건 | `PlaceCondition`은 생성하지 않는다. Import는 조건을 **추측하지 않는다** |
| 검증 | `Verification`을 생성하지 않는다. 후보는 정의상 미검증이다 |
| 멱등성 | `Place.tourApiId @unique`를 활용한 upsert. 같은 원본을 여러 번 실행해도 중복 레코드가 생기지 않는다 |
| 유출 방지 | 사용자 조회는 `visibility=VISIBLE` **AND** `검증 이력 존재` 두 조건을 모두 요구하므로(§5-1), 후보는 두 조건 모두에서 걸러진다 |
| 관리자 편집 | 기존 `/admin/places/[id]/edit` 폼이 **그대로 동작**한다. 별도 전환 로직이 필요 없다 |

**제약 — 좌표 없는 항목**

`Place.location`은 NOT NULL(`Unsupported("geography(Point, 4326)")`)이다. 좌표가 없는 원본 항목은 **Import에서 건너뛰고 실패 목록에 기록**한다. 기본 좌표나 더미 값을 넣지 않는다.

**실행 형태 — 로컬 스크립트 수동 실행 (결정 D-06)**

| 항목 | 내용 |
|---|---|
| 형태 | `package.json` 스크립트로 실행 (예: `npm run import:tour`) |
| 실행 주체 | 개발자 (현재 운영자와 동일인) |
| 근거 | 인증·타임아웃·진행률 UI가 불필요하고, 실패 시 로그를 즉시 보고 재실행할 수 있다. 서버리스 실행 시간 제한도 회피된다 |
| 출력 | 처리 건수 / 신규 / 건너뜀 / 실패 목록을 콘솔에 남긴다 |
| 재실행 | 언제든 안전하게 반복 실행 가능해야 한다 (멱등성) |
| P1 이관 | 관리자 화면 실행 버튼과 정기 스케줄러는 후보 대시보드와 함께 P1에서 다룬다 |

### 12-3. P1로 이동하는 범위

- 후보 목록 대시보드 (필터: 미검증 / 검증됨 / 거절)
- 후보 → 등록 폼 자동 채움 (`?fromTour=...`)
- Reject 상태 관리, 정기 동기화

---

## 13. 보안 · 인가

| 위협 | 방어 | 상태 |
|---|---|---|
| 인증 우회 | 페이지 `requireUser` / `requireAdminPage`, Action `requireUserAction` / `requireAdminAction` | ✅ |
| 관리자 권한 | DB의 `role`을 매 요청 조회해 확인 (JWT의 role만 믿지 않음) | ✅ |
| 본인 외 데이터 조작 | Dog·Favorite 모두 `userId` 기준 조회/수정 | ✅ |
| Open Redirect | `getSafeCallbackUrl()` 화이트리스트 | ✅ |
| SQL Injection | Prisma 파라미터화 + raw는 태그드 템플릿 | ✅ |
| XSS | React 자동 이스케이프, `dangerouslySetInnerHTML` 미사용 | ✅ |
| CSRF | Next.js Server Action 기본 보호 | ✅ |
| 환경변수 노출 | 클라이언트 노출은 `NEXT_PUBLIC_` 접두어만 | ✅ |
| Rate Limiting | 없음 | ❌ 신고 기능(P1) 도입 시 필수 |
| Google Maps 키 제한 | ❓ 콘솔 설정 사항. 코드로 확인 불가 | ❓ |
| 오류 추적 | 없음 | ❌ P1 |

---

## 14. 구현 계획

### P0 — MVP 출시 차단 항목

| ID | 작업 | 유형 | 근거 |
|---|---|---|---|
| **T-01** | 공개 조건에 "검증 이력 존재" 추가 (`getPlaces`, `getCategoryPlaces`, `getPlaceById`, `getFavoritePlaces`) | 정책 | 기획서 v3 §4-1 |
| **T-02** | `STALE_VERIFICATION_WEEKS`(8주) 폐기 → **90일 단일 임계**로 교체, `Recheck needed` 표시 | 정책 | 기획서 v3 §4-4 (D-02 확정) |
| **T-03** | 홈 장소 탐색 섹션 단일화 (`RecentPlacesSection`·`HomePlaceCard`·`getHomePlaces` 제거) | 정리 | 기획서 v3 §6-1 |
| **T-04** | 카테고리 라벨 `Travel Spots` → `Attractions` (i18n 문자열만) | 문구 | 기획서 v3 §6-1 |
| **T-05** | `loading.tsx` / `error.tsx` / `not-found.tsx` 전면 추가 + 홈 오류 삼킴 제거 | 상태 | §10 |
| **T-06** | Bottom Sheet · FilterModal에 focus trap / ESC / dialog 시맨틱 (기존 Radix 컴포넌트 활용) | 접근성 | §11 |
| **T-07** | 미리보기 Primary Action을 `상세 보기`로 반전, 길찾기는 Secondary | 정책 | 기획서 v3 §6-3 |
| **T-08** | 마커 선택 시 목록 카드 scroll into view | 동기화 | `DESIGN.md` §5 |
| **T-09** | 상세 페이지에 거리 · 길찾기 · 공유 · 즐겨찾기 액션 추가 | 화면 | `DESIGN.md` §6 |
| **T-10** | 운영시간 저장·입력·표시 (`Place.hours` + `hoursNote`) | 기능 | §3-4 (D-04 확정) |
| **T-11** | 예방접종 행이 `UNKNOWN`이면 상세에서 숨김 | 정책 | 기획서 v3 §6-4 |
| **T-12** | `Ask the store in Korean` 렌더 분기 제거 (코드 보존) | 정책 | 기획서 v3 §11 · `D-01` |
| **T-13** | 후보 Import **로컬 스크립트** (`Place`+`DRAFT` 저장, `tourApiId` 기준 멱등 upsert, 좌표 없는 항목 skip) | 데이터 | §12-2 (D-05·D-06 확정) |
| **T-14** | `auth.ts`의 `/en/login` 하드코딩 제거 (로케일 반영) | 버그 | §7-6 |
| **T-15** | 필터·정렬·카테고리를 URL searchParams에 반영 | 상태 | `src/CLAUDE.md` §14.3 |
| **T-16** | `border-strong` 무효 클래스 6곳을 `border-border-strong`으로 수정 | 버그 | §15 |
| **T-17** | 지도 로딩·오류 문구 i18n화 + 재시도 수단 | i18n | §9 |
| **T-18** | `globals.css`의 `.dark` 블록 및 `next-themes` 제거 | 디자인 | `DESIGN.md` §4 |
| **T-19** | 긍정 조건 필터에서 `UNKNOWN`/`null` 제외 + `exclude-unknown` 옵션 제거 (타입·필터·모달·i18n 키) | 정책 | §5-3 (D-03·D-12 확정) |
| **T-20** | 서비스 범위 안내: 기본 지도 중심 대전 · 범위 배너 · 범위 밖 안내와 `대전 장소 보기` · **빈 상태 2종 분리**(`필터 초기화` 포함) | 정책 | §7-2, §10 (D-11 확정) |

### P1 — MVP 직후

| ID | 작업 |
|---|---|
| T-21 | `Report` 모델 + 신고 UI + 관리자 처리. **비로그인 접수 허용 + Rate Limit + 운영자 검토 후 반영, 자동 상태 변경 없음** (D-09 확정) |
| T-22 | 신고 누적 → 재확인 **우선순위 상향** (자동 상태 변경 아님) |
| T-23 | 관리자 후보 대시보드 + 폼 자동 채움 |
| T-24 | 관리자 대시보드(통계) + 목록 필터·페이지네이션 |
| T-25 | SEO: `generateMetadata`, JSON-LD, OG, hreflang, `sitemap.ts`, `robots.ts` |
| T-26 | `next.config.mjs` `images.remotePatterns` 등록 → `unoptimized` 제거 |
| T-27 | 날짜·거리 로케일 표기 (`DESIGN.md` §10 준수) |
| T-28 | 한글 서브셋 폰트 적용 |
| T-29 | `SortDropdown`을 Radix `dropdown-menu` 기반으로 교체 |
| T-30 | Skip link, `aria-live` 선택 고지 |
| T-31 | Sentry 도입 |
| T-32 | 관리자 폼 i18n |
| T-33 | 긴급 페이지 + 동물병원 |
| T-34 | 동적 한국어 문의 문구 재도입 검토 |
| T-35 | 미사용 코드 정리 (§8-3). **`src/lib/result.ts` 제거 포함, `errors.ts`는 유지** (D-10 확정) |
| T-36 | 최소 테스트 도입 (`eligibility.ts`, `filtering.ts`, `display.ts` 순수 함수 우선) |

### P2 — 확장

| ID | 작업 |
|---|---|
| T-40 | **지도 Bounds `이 지역 검색` + 서버 커서 페이징** — 전국 확장 선행 조건 |
| T-41 | 반경 필터 (`ST_DWithin`) |
| T-42 | `Review` 모델 + 구조화 리뷰 |
| T-43 | 숙소 카테고리 (별도 조건 모델) |
| T-44 | 여러 마리 반려견 CRUD + 비회원 프로필 |
| T-45 | 일본어 / 중국어 |
| T-46 | 매장 사장 직접 입력(B2B) |
| T-47 | `AdvancedMarkerElement` 마이그레이션 |
| T-48 | 태그 기반 캐시 무효화 |

---

## 15. 알려진 결함 목록

정책이 아니라 **명백한 코드 결함**이다.

| ID | 결함 | 위치 | 영향 |
|---|---|---|---|
| B-01 | `border-strong` 클래스가 Tailwind에 존재하지 않음 (`border.strong`은 `border-border-strong`으로 생성됨). 6곳에서 무효 클래스 사용 → 강조 테두리가 적용되지 않음 | `FilterModal.tsx`(2), `SortDropdown.tsx`, `FavoriteButton.tsx`, `HeroActions.tsx`, `DogProfileForm.tsx` | 중 |
| B-02 | `pages.signIn: "/en/login"` 하드코딩 | `src/auth.ts` | 중 |
| B-03 | `getHomePlaces()`만 ETC 카테고리를 포함해 홈 안에서 범위 불일치 | `lib/places/queries.ts` | 중 (T-03으로 해소) |
| B-04 | 클립보드 복사 실패를 `catch {}`로 삼키고도 "Copied!"를 표시 | `KoreanInquiryBox.tsx` | 낮음 (T-12로 비노출) |
| B-05 | 홈 데이터 조회 실패를 try/catch로 삼켜 "빈 상태"로 렌더 | `(public)/page.tsx` | 중 |
| B-06 | `carrier` 필터는 `unknown`을 제외하고 `indoor` 필터는 포함 — 규칙 비대칭 | `lib/places/filtering.ts` | 중 (D-03·D-12 확정 → **T-19**로 `indoor`를 `carrier` 규칙에 맞추고 `exclude-unknown` 옵션 제거) |
| B-07 | `places.selectedPlacePanel.*` 키가 삭제된 컴포넌트 이름을 참조 | `FavoriteButton.tsx` | 낮음 |
| B-08 | deprecated `google.maps.Marker` 사용, `importLibrary("marker")` 결과 미사용 | `MapPanel.tsx` | 낮음 |

---

## 16. 환경변수

```
DATABASE_URL=                      # PostgreSQL (PostGIS extension 필요)
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
TOUR_API_SERVICE_KEY=              # 자리만 존재, 사용처 없음
```

계획: `SENTRY_DSN`(P1), `NEXT_PUBLIC_SITE_URL`(P1, SEO에 필요)

---

## 17. 결정 이력과 미확정 항목

### 17-1. 확정된 결정 (2026-08-13)

| ID | 확정 내용 | 반영 절 | 구현 작업 |
|---|---|---|---|
| D-01 | `Ask the store in Korean` MVP 비노출. `DESIGN.md` v1.2에 MVP 제외 표기 반영 완료 | §7-4 | T-12 |
| D-02 | 신선도 임계 **90일 단일**. 8주(56일) 임계 폐기 | §14 | T-02 |
| D-03 | 긍정 조건 필터에서 `UNKNOWN`/`null` **제외** | §5-3 | **T-19** |
| D-04 | `Place.hours`(요일별 JSON) + `Place.hoursNote`(1줄 메모) | **§3-4** | T-10 |
| D-05 | 후보는 `Place` + `visibility=DRAFT`. 별도 모델 없음 | §12-2 | T-13 |
| D-06 | Import는 **로컬 스크립트 수동 실행** | §12-2 | T-13 |
| D-07 | 공개 조건에 검증 이력 필수. **마이그레이션·임시 이력 생성 없음** | §5-1 | T-01 |
| D-08 | 초기 대전 단독 공개. 공개 대상 제한은 운영 규칙, 사용자 안내는 코드 작업 | 아래 17-2 | T-20 |
| D-09 | 신고: 비로그인 허용 + Rate Limit + 운영자 검토 후 반영 | §14 P1 | T-21 |
| D-10 | `result.ts` 제거, `errors.ts` 유지. 형태별 반환을 정식 규약으로 인정 | §6-2 | T-35 |
| D-11 | 기본 지도 중심 대전 · 범위 배너 · 범위 밖 안내 · **빈 상태 2종 분리** | §7-2, §10 | **T-20** |
| D-12 | `exclude-unknown` 옵션 **제거**. 전역 "확인된 조건만 보기" 토글은 MVP 미포함 | §5-3 | **T-19** |

### 17-2. D-08 / D-11의 구현 영향

**공개 대상 제한 — 코드 변경 없음.** 기획서 v3 §9-5에 따라 지역 필드·필터를 추가하지 않는다. 공개 여부가 이미 "검증 이력 존재 + `visibility=VISIBLE`"로 통제되므로, 운영자가 대전 장소만 검증·공개하면 목표가 달성된다.

**사용자 안내 — 코드 변경 필요 (T-20).**

| 항목 | 현재 코드 | 조치 |
|---|---|---|
| 지도 기본 중심 | `MapPanel.tsx:19` `SEOUL_CITY_HALL = { lat: 37.5665, lng: 126.978 }`. 중심 결정은 `사용자 위치 → 선택 장소 → 목록 첫 장소 → 서울시청` 순이므로, 이 상수는 **공개 장소가 0건일 때만** 실제로 쓰인다 | 대전 좌표로 교체 |
| 위치 허용한 범위 밖 사용자 | 사용자 위치가 최우선이라 지도가 해당 지역으로 이동하고 **마커가 0개**가 된다. 목록에는 장소가 뜨지만 거리가 전부 매우 크게 표시된다 | `현재 대전 지역만 지원합니다` 안내 + `대전 장소 보기` 버튼 |
| 서비스 범위 배너 | 없음 | 탐색 화면에 초기 범위 안내 추가 |
| 빈 상태 | `places.list.empty` 하나로 통합 | 서비스 범위 밖 / 필터 0건 2종으로 분리 |

### 17-3. 남은 미확정 항목

| ID | 항목 | 쟁점 | 시점 |
|---|---|---|---|
| **D-13** | 신고 Rate Limit 임계값 | 동일 사용자·장소 기준 허용 간격과 횟수. 식별 기준(IP / 쿠키 / 세션) | **T-21 착수 시** |
| **D-14** | 2단계 확장 시 지역 필드 설계 | 지역 enum vs 행정구역 코드, 사용자 필터 노출 여부 | **서울 확장 착수 시** |

두 항목 모두 P0을 차단하지 않는다. 해당 기능 착수 시점에 결정한다.

구현 중 정할 소소한 값 (별도 결정 항목으로 올리지 않음):

- 서비스 범위 밖 판정 임계 거리 (기본 50 km 권장, T-20)
- 대전 기본 중심 좌표와 초기 zoom (T-20)

### 17-4. 확인 필요 (코드로 판단 불가)

| 항목 | 확인 방법 | 관련 작업 | 상태 |
|---|---|---|---|
| 검증 이력 없는 공개 장소 수 | DB 조회 | T-01 (D-07) | ✅ **확인 완료 2026-08-13 — 0건** (§5-1 참조) |
| PostGIS extension 활성화 | 배포 DB에서 `SELECT postgis_version();` | 전체 | ✅ 사실상 확인됨 — 좌표·거리 쿼리가 정상 반환됨 |
| `next build` / `tsc --noEmit` 통과 여부 | 로컬 실행 | 전체 | 미확인 |
| Google Maps API 키 도메인 제한 | Google Cloud Console | 보안 | 미확인 |
| 색 대비비 4.5:1 충족 | axe / Lighthouse 실측 | P1 접근성 | 미확인 |

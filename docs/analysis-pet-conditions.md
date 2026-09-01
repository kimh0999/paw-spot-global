# 반려동물 이용 조건 구조화 — 1단계 현황 분석

작성 2026-08-26 · 브랜치 `chore/project-foundation` · **실제 코드 기준** (기획서·개발명세서는 참조용). 이 문서는 분석과 결정 기록만 담는다. 최종 schema·migration·UI·번역 키·테스트는 2단계에서 정한다.

## 결론 및 확정된 결정 조합

**구조: 대안 2A — 핵심 컬럼 유지 + 복합 이용수칙을 제한된 JSON(Zod 검증)으로 분리.**

| 결정 | 확정 |
|---|---|
| D-01 저장 구조 | **대안 2A** — `PlaceCondition` 조건 컬럼 9개는 그대로, 복합 이용수칙만 JSON+Zod |
| D-02 준비물 vs 매장 내 상태 | **별도 그룹** (`preparation` / `handling`) — D-01=2A에 의해 자동 결정 |
| D-03 원문 보존 | **`Verification` 정책 스냅샷** (원문·언어·출처·확인 방법·확인일·메모) |
| D-04 불확실성 | **항목별 `uncertainties` 배열** (대상·이유·근거 원문·매장 확인 질문) |
| D-05 자동 매칭 결과 | **현행 3상태 유지** — 준비 항목은 판정 밖 "방문 전 준비"로 분리 |

**핵심 근거.** 수집한 원문 5건 중 현재 구조로 의미 손실 없이 저장되는 문장은 원문 C의 "예방접종확인증 증빙 필요" 하나뿐이다. 나머지는 저장 자체가 불가하거나(요금·이동/착석·행동 제한), **저장하면 사실과 다르게 읽힌다**(원문 A의 슬래시 3항목, 원문 E의 "대형견은 야외 좌석만"). 컬럼 확장으로는 준비물의 OR 관계와 크기×공간 결합을 끝내 표현할 수 없다(§C-1).

**범용 규칙 엔진은 만들지 않는다.** §C-2의 7개 그룹 밖의 문장은 구조화하지 않고 원문에만 남긴다. **향후 2B 전환 조건(미결정 아님)**: 확인 필요 항목 집계·조건별 통계·복합 조건 필터가 실제 요구사항이 되면 그때 하위 모델 전환을 검토한다. 현재 MVP에는 해당 계획이 없다.

## A. 현재 구현 조사 결과

### A-1. `PlaceCondition` 구조 — `prisma/schema.prisma`

`Place`와 1:1(`placeId @unique`). `id`/`placeId`/`updatedAt`을 뺀 **조건 컬럼은 9개**다: `indoor`(필수, 기본값 없음) · `carrierStrollerPolicy` · `maxDogSize` · `leash` · `muzzle` · `vaccinationCertificatePolicy`(이상 5개 `@default(UNKNOWN)`) · `breedRestrictions`(`String?`) · `requiredItems`(`String[]`) · `cautions`(`String?`). **`rawPolicyText` 필드는 존재하지 않는다.**

### A-2. enum과 상수

DB enum은 `prisma/schema.prisma`, TypeScript 미러는 `src/lib/places/constants.ts`(`INDOOR_POLICIES`, `CARRIER_STROLLER_POLICIES`, `MAX_DOG_SIZES`, `LEASH_POLICIES`, `MUZZLE_POLICIES`, `VACCINATION_CERTIFICATE_POLICIES`, `REQUIRED_ITEMS`)이며 `src/lib/constants.ts`가 재export한다.

- `IndoorPolicy`: ALLOWED / OUTDOOR_ONLY / **PARTIAL_AREA** / NOT_ALLOWED / UNKNOWN · `CarrierStrollerPolicy`: NOT_REQUIRED / REQUIRED_INDOOR / REQUIRED_ALWAYS / UNKNOWN
- `MaxDogSize`: SMALL / MEDIUM / LARGE / UNKNOWN · `LeashPolicy`: REQUIRED / NOT_REQUIRED / PARTIAL_AREA / UNKNOWN
- `MuzzlePolicy`: REQUIRED / NOT_REQUIRED / CONDITIONAL / UNKNOWN · `VaccinationCertificatePolicy`: REQUIRED / NOT_REQUIRED / UNKNOWN · `REQUIRED_ITEMS = ["POOP_BAG"]`

### A-3. validation

`src/lib/validation/place.ts`의 `placeBaseSchema.condition`이 위 상수를 `z.enum`으로 쓴다. `breedRestrictions` 최대 500자, `cautions` 최대 1000자. `placeInputSchema`(등록)와 `placeUpdateSchema`(수정)가 같은 base를 공유한다.

### A-4. 관리자 입력 흐름

`src/components/admin/PlaceForm.tsx`(조건 섹션) → `parsePlaceFormData`(`src/lib/places/form-data.ts`) → Zod → `createPlaceRecord` / `updatePlaceRecord`(`src/lib/places/create-place.ts`, `update-place.ts`) → `prisma.placeCondition.create/upsert`. Server Action은 `src/app/[locale]/(admin)/admin/places/{new,[id]/edit}/actions.ts`. 조건 6개가 각각 단일 `select`, 준비물이 checkbox, `cautions`가 textarea다. **AND/OR 관계나 항목별 불확실성을 입력할 자리가 구조적으로 없다.**

### A-5. 표시 흐름

| 화면 | 파일 | 표시 범위 |
|---|---|---|
| 장소 카드 | `src/components/places/PlaceConditionSummary.tsx` | `COMPACT_CONDITIONS = 3` — 실내·이동장·크기 |
| 홈 카드 | `src/components/home/HomePlaceCard.tsx` | 위와 같은 3개 chip |
| 지도 선택 패널 | `src/components/places/PlacePreviewCard.tsx` | `getVisitStatus` + `getPlaceConditionBreakdown` + `caution` |
| 상세 페이지 | `src/components/places/BeforeYouGoCard.tsx` | 6행 + `cautions`/`requiredItems`/`breedRestrictions` |

판정 로직은 `src/lib/places/eligibility.ts`에 모여 있다(`getVisitEligibility`, `getPlaceConditionBreakdown`, `getVisitStatus`, `AllowanceKey`·`VisitConditionKey`). DB→화면 값 변환은 `src/lib/places/queries.ts`의 `mapIndoorPolicy` 등 매퍼.

### A-6. 반려견 자동 매칭 흐름

`src/lib/dogs/matching.ts`의 `matchDogToPlace(dog, place)`. `MatchablePlace`는 `indoor` · `maxDogSize` · `breedRestrictions` **세 개만** 받는다. 결과는 `MATCH | MISMATCH | CHECK_REQUIRED` + 사유(`PET_NOT_ALLOWED > SIZE_LIMIT > BREED_RESTRICTION > UNKNOWN_CONDITION`). `getAllowedSizes`가 `maxDogSize` 상한을 목록으로 펼치고, `UNKNOWN`은 빈 목록 = "제한 없음"이 아니라 "확인되지 않음"이다(DESIGN.md §3.3과 일치). 여러 마리는 `matchDogsToPlace` → `resolveWorstMatch`. 목록 카드용 경로는 `eligibility.ts`의 `getVisitEligibility` + `SIZE_RANK`로 별도 존재한다.

### A-7. 테스트

`src/lib/dogs/`의 `matching.test.ts` · `dog-match-messages.test.ts` · `selection.test.ts` · `breeds.test.ts` · `actions.test.ts`, `src/lib/validation/dog.test.ts`, `src/lib/auth/safe-callback-url.test.ts`, `src/lib/i18n/korean-particle.test.ts`. **`eligibility.ts` · `filtering.ts` · `validation/place.ts` 전용 테스트는 없다.** include는 `src/**/*.test.ts`(`vitest.config.ts`).

### A-8. i18n

`messages/en.json` / `messages/ko.json`의 `places.detail.beforeYouGo.*`, `places.preview.allowances.*` / `.conditions.*` / `.status.*`, `places.card.*`. 조건 문구가 enum 값 1개당 고정 문자열 1개로 매핑돼 있어 "A 또는 B" 조합 문구를 만들 자리가 없다.

### A-9. 개발명세서와 현재 코드의 차이 (확인된 전부)

프롬프트가 "적용된 것으로 알려졌다"고 한 변경은 **전부 실제 코드에서 확인됨**: `carrier`·`strollerAllowed`·`allowedSizes` 제거와 `PARTIAL_AREA`·`leash`·`muzzle` 추가는 `prisma/migrations/20260529000000_condition_v2`, `carrierStrollerPolicy` 4상태화는 `20260706000000_carrier_stroller_3state`, `maxDogSize` + `SIZE_RANK` 매칭도 반영됨. 차이는 다음 6건이다.

1. `PlaceCondition.rawPolicyText` 미존재 — §9의 대안 1은 없는 필드를 전제한다.
2. `CarrierPolicy` enum이 참조 없이 schema에 잔존 (정리 후보).
3. `Dog.breed`가 `breedCode`/`breedCustom` 백필 후에도 잔존 (정리 후보).
4. `docs/Paw_Spot_Global_개발명세서.md`(v1)에 `allowedSizes`·`strollerAllowed` 잔존.
5. `global/구조/관리자 장소 등록.md`에 `condition.strollerAllowed`·`condition.allowedSizes` 잔존.
6. `requiredItems`가 v1 명세의 LEASH/CARRIER/STROLLER/MUZZLE을 잃고 `POOP_BAG` 하나만 남음.

**어느 것도 다시 도입하지 않는다. 정리 후보는 이번 작업에서 삭제하지 않는다.**

## B. 표현 가능성 분석

**전체 17개 항목** = 분석 지정 15개 + 실제 관측 근거로 추가한 2개(`견종 제한` — `breedRestrictions`가 이미 존재, `의자·테이블 위 착석 금지` — 원문 E). 세 분류는 배타적이며 같은 항목이 두 곳에 오지 않는다. **현재 지원 1 / 부분 지원 6 / 미지원 10.**

### B-1. 현재 지원 (의미 손실 없음)

| 조건 | 근거 |
|---|---|
| 예방접종 **증빙** 필수 | `vaccinationCertificatePolicy = REQUIRED` |

### B-2. 부분 지원 (저장은 되지만 의미가 줄거나 왜곡됨)

| 조건 | 무엇이 손실되는가 |
|---|---|
| 예방접종 **완료** | 전용 필드가 없다. 증빙 필드로 대체하면 "서류 지참 필수"라는 없는 요구가 생긴다 |
| 대형견 야외 전용 | `maxDogSize=LARGE`는 "대형견 OK"로 읽히고 `indoor=PARTIAL_AREA`는 이유를 잃는다. 크기↔공간 결합이 사라진다 |
| 특정 층 노펫존 | `indoor=PARTIAL_AREA`로 뭉개진다. 어느 층인지는 `cautions` 자유 텍스트로만 남는다 |
| 견종 제한 | `breedRestrictions` 자유 텍스트. 매칭은 문구 존재만 보고 `CHECK_REQUIRED`로 넘긴다 |
| 항목별 불확실성 | 필드 단위 `UNKNOWN`은 있으나 이유·근거 원문·확인 질문을 남길 자리가 없다 |
| 원문과 정책 변경 이력 | 현재 원문은 `cautions`·`Verification.note`에 넣을 수는 있으나 둘 다 공개 표시용·관리자 메모라 부적합하다. 변경 이력은 전혀 남지 않는다 — `updatedAt`만 있고 이전 값·이전 원문이 사라진다 |

### B-3. 미지원 (현재 구조로 표현 불가)

| 조건 | 비고 |
|---|---|
| 준비물 `ANY_OF` | "목줄 **또는** 이동가방". `leash`와 `carrierStrollerPolicy`는 독립 필드라 AND로만 읽힌다 |
| 준비물 `ALL_OF` | 항목 집합을 하나의 규칙으로 묶을 자리가 없다 |
| 품에 안고 있어야 함 | `carrierStrollerPolicy`에 "안기" 값이 없다. 이동장·유모차와 다른 행위다 |
| 전용 의자 이용 | 값도 없고, 매장 제공인지 지참인지 구분할 자리도 없다 |
| 자유 이동 금지 / 바닥 보행 조건 | 대응 필드 없음 |
| 의자·테이블 위 착석 금지 | 대응 필드 없음 |
| 짖음·공격성 제한 | `MAY_RESTRICT` / `NO_ENTRY` 구분 불가 |
| 평일·주말·공휴일 입장료 | 요금 관련 필드가 schema에 전혀 없다 |
| 포함 서비스(댕푸치노 등) | 위와 동일 |
| 보호자 책임 고지 | 위생·안전 항목 자체가 없다 |

## C-1. 대안 1 vs 대안 2 — 상위 구조 비교

**대안 1**은 `PlaceCondition` 정식 컬럼을 필요한 만큼 확장(추정 8~12개 추가), **대안 2**는 자동 매칭·필터용 핵심 컬럼과 복합 이용수칙 저장 구조를 분리한다.

| 축 | 대안 1 | 대안 2 |
|---|---|---|
| 기존 코드 변경 규모 | 큼 — 컬럼마다 상수·Zod·`form-data`·폼 select·매퍼·i18n 키·표시 컴포넌트를 모두 늘림 | 중간 — 기존 경로 무변경, 보조 구조 읽기·쓰기 경로만 신규 |
| 의미 손실 가능성 | 높음 — 컬럼이 서로 독립적이라 준비물 OR·층별 예외·크기×공간 결합을 끝내 표현 못 함 | 낮음 — 관계 자체가 구조에 들어감 |
| 자동 매칭 영향 | 컬럼이 늘수록 `matchDogToPlace` 입력 후보가 늘어 판정 규칙이 흐려짐 | 매칭 입력은 정식 컬럼으로 고정. 보조 구조는 "방문 전 준비" 안내로만 사용 |
| 관리자 입력 난이도 | select가 15개 이상으로 늘어 미입력·오입력이 증가 | 그룹별 폼 섹션. 관리자는 JSON을 보지 않는다 |
| migration 위험 | 높음 — enum 생성·컬럼 추가가 반복되고 값 추가 시 enum 재생성 작업 재발 | 낮음 — 초기 1회 후 유형 추가는 코드에서 흡수 |
| 향후 확장성 | 새 유형마다 migration | 코드 목록 추가로 흡수. 필터 대상이 되면 정식 컬럼으로 승격 |

**→ 대안 2 채택.** 이 프로젝트는 이미 조건 스키마를 두 번(`condition_v2`, `carrier_stroller_3state`) 파괴적으로 바꿨고 그때마다 enum 재생성 SQL을 손으로 썼다. 안내문 유형은 계속 새로 나오므로 매번 migration을 요구하는 구조는 이 도메인과 맞지 않는다.

## C-2. 대안 2A(JSON+Zod) vs 2B(하위 모델) — 저장 방식 비교

| 축 | 2A JSON + Zod | 2B Prisma 하위 모델 |
|---|---|---|
| 쿼리·필터·운영 통계 활용성 | 낮음 — JSON 연산자가 필요하고 집계·정렬이 불편 | 높음 — "확인 필요 항목 N개"를 SQL로 바로 집계·정렬 |
| 무결성·항목별 불확실성 기록 | Zod(런타임)만 강제. 불확실성은 배열 원소로 자연스럽게 표현됨 | FK·NOT NULL이 DB에서 강제. 불확실성 레코드가 가장 자연스러움 |
| 구현·migration·관리자 입력 복잡도 | 낮음 — 컬럼 1개, relation 없음, 폼→객체 직렬화 1회 | 높음 — 테이블 5개 내외 + relation, 폼의 중첩 배열 저장 처리 필요 |
| JSON→테이블 전환 비용·확장성 | 코드 목록이 닫혀 있어 나중에 결정론적 backfill 가능. 유형 추가는 migration 없이 흡수 | 전환 불필요하나 새 유형마다 migration 발생 |

**→ 2A 채택.** 현재 보조 구조로 필터·정렬·집계할 요구가 없고(카드·지도 패널은 조건 3~4개만 노출한다), 유형이 계속 늘어나는 단계라 migration 빈도를 낮추는 이득이 더 크다. **2B 전환 조건(향후 검토 항목, 미결정 아님)**: 확인 필요 항목 집계·조건별 통계·복합 조건 필터가 실제 요구사항이 되면 그때 하위 모델 전환을 검토한다. 현재 MVP에는 관리자 운영 큐 계획이 없다.

### 채택 구조 (개념 수준)

| 그룹 | 담는 것 | 상태값 |
|---|---|---|
| `preparation` | 방문 전 준비물. 그룹 배열이며 각 그룹이 `ANY_OF`/`ALL_OF`/`UNKNOWN` | REQUIRED / RECOMMENDED / ALLOWED / NOT_REQUIRED / UNKNOWN |
| `handling` | 매장 안에서 개가 있어야 할 상태(안기·전용의자·이동장 안·목줄 보행·자유 이동). 그룹 배열로 "안기 또는 전용의자" 표현 | REQUIRED / ALLOWED / PROHIBITED / CONDITIONAL / UNKNOWN |
| `spaceExceptions` | 구역(실내/야외/테라스/N층/특정 구역) × 적용 대상 크기 × 접근 여부 | ALLOWED / NOT_ALLOWED / UNKNOWN |
| `behaviorRestrictions` | 유발 행동(짖음·공격성·통제 불가·타인 불편) × 결과 | MAY_RESTRICT / NO_ENTRY / UNKNOWN |
| `admission` | 요금(평일 / 주말·공휴일 / 무료 / 확인 필요, 크기별), 포함 서비스 | — |
| `hygiene` | 배변 직접 처리·지정 폐기·전용 식기·상시 감독·보호자 책임 코드 배열 | — |
| `uncertainties` | 대상 항목 · 이유 · 근거 원문 · 매장에 물어볼 질문 | — |

**§5 분류 체계에 대한 제안** — ① **5-2와 5-4는 분리한다**: 원문 A에 두 종류가 동시에 나오고, 합치면 "유모차를 챙겨와라"와 "유모차에 태워둬라"가 구별되지 않는다. ② **5-6(위생·안전)은 별도 구조를 만들지 않는다**: 자동 판정에 쓰이지 않고 문장이 정형적이라 닫힌 코드 배열 하나면 충분하다. ③ **5-1은 "예방접종 완료"와 "예방접종 증빙"으로 쪼갠다**: 현재 필드는 증빙만 담는다. ④ **5-3은 5-1의 크기 조건과 결합 가능해야 한다**: 원문 E가 실제 사례다. ⑤ **5-8(기타 안내)은 조건 구조에 넣지 않는다**: 원문에만 남기고 필요하면 매장 일반 안내로 분리한다.

**원문 스냅샷(D-03 반영, 개념 수준)** — `Verification`에 확인 시점 단위로 원문·출처·확인 방법·확인일·관리자 메모를 붙인다. **한·영이 병기된 원문(원문 E)은 쪼개지 않고 전체를 하나의 스냅샷으로 보존**하며, 언어는 `sourceLanguages: ["ko", "en"]`처럼 **복수 언어 표현**을 권장한다. raw snapshot에서는 원문의 영어 오타도 수정하지 않는다. 사용자에게 보여줄 영어 문구는 구조화 값에서 별도로 작성한다. **정확한 필드명과 Prisma 구조는 2단계에서 정한다.**

## C-3. 실제 유지 대상 컬럼과 사용처

| 실제 컬럼 | 사용 위치 | 사용 목적 | 유지 필요 | 근거 |
|---|---|---|---|---|
| `indoor` | `matching.ts` / `filtering.ts` / `eligibility.ts` / 카드·홈·패널·상세 / 폼 | 반려견 자동 매칭 + 목록 검색·필터 + 카드·지도 패널 요약 + 상세 + 관리자 입력 | 필수 | `isPetNotAllowed`, `filters.indoor`, `indoor-first` 정렬 |
| `maxDogSize` | `matching.ts` / `eligibility.ts` / `filtering.ts` / 카드·홈·상세 / 폼 | 반려견 자동 매칭 + 목록 검색·필터 + 카드 요약 + 상세 + 관리자 입력 | 필수 | `getAllowedSizes`, `SIZE_RANK`, `filters.dogSize` |
| `breedRestrictions` | `matching.ts` / 상세 / 폼 | **반려견 자동 매칭** + 장소 상세 표시 + 관리자 입력 | 필수 | `hasBreedRestrictions` → `CHECK_REQUIRED`. 필터에는 없음 |
| `carrierStrollerPolicy` | `filtering.ts` / `eligibility.ts` / 카드·홈·패널·상세 / 폼 | 목록 검색·필터 + 카드·지도 패널 요약 + 상세 + 관리자 입력 | 필수 | `filters.carrier`, `no-carrier-first` 정렬. 매칭에는 없음 |
| `leash` | `eligibility.ts` / 미리보기 / 상세 / 폼 | 지도 패널 요약 + 장소 상세 표시 + 관리자 입력 | 유지 | 필터·매칭 미사용 |
| `muzzle` | `eligibility.ts` / 미리보기 / 상세 / 폼 | 지도 패널 요약 + 장소 상세 표시 + 관리자 입력 | 유지 | 필터·매칭 미사용 |
| `vaccinationCertificatePolicy` | `getPlaceById` / 상세 / 폼 | 장소 상세 표시 + 관리자 입력 | 유지 | 목록 select에 없음 |
| `requiredItems` | `getPlaceById` / 상세 / 폼 | 장소 상세 표시 + 관리자 입력 | 조건부 | 값이 `POOP_BAG` 하나. `preparation`으로 흡수 검토 |
| `cautions` | 목록(`caution`) / 미리보기 / 상세 / 폼 | 지도 패널 요약 + 장소 상세 표시 + 관리자 입력 | 유지 | 공개 표시용. **원문 보관 용도로 쓰지 않음** |

**자동 매칭 3개와 필터·정렬 3개는 다른 집합이다.** 자동 매칭 = `indoor` / `maxDogSize` / `breedRestrictions`(`MatchablePlace`가 받는 전부), 목록 필터·정렬 = `indoor` / `carrierStrollerPolicy` / `maxDogSize`. `breedRestrictions`는 필터에 없고 `carrierStrollerPolicy`는 매칭에 없으므로 한 범주로 묶지 않는다. 또한 `breedRestrictions`는 `String?` 자유 텍스트라 `breedCode`와 기계 대조가 불가능하고 문구 존재만으로 `CHECK_REQUIRED`가 된다. **한계는 있지만 자동 매칭이 직접 읽으므로 유지한다.** **정리 후보(삭제하지 않음)**: `CarrierPolicy` enum(참조 0), `Dog.breed`(백필 완료).

## D. 실제 원문 역검증

표기: **확정** = 원문으로 단언 가능 / **UNKNOWN** = 원문에 없음 / **확인** = 매장 확인 필요.

### 원문 A — TTM

| 문장 | 분류 | 현재 저장 | 새 구조 |
|---|---|---|---|
| 예방접종이 완료된 친구들만 입장 가능 | 5-1 | 부분 | 접종 완료 ≠ 증빙 지참. 별도 항목 |
| 리드줄 / 이동가방 / 유모차 필수 | 5-2 | 왜곡 | `preparation` 그룹. 관계는 **UNKNOWN** |
| 자유로운 이동은 어려워요 | 5-4 | 불가 | `handling`: 자유 이동 = PROHIBITED |
| 전용 의자에 앉히거나 보호자님이 꼭 안아주세요 | 5-4 | 불가 | `handling` ANY_OF(전용의자, 안기) = REQUIRED |
| 공격성 또는 짖음이 심한 친구들은 이용이 어려운 점 | 5-5 | 불가 | 결과값 **확인** |
| 부주의로 인한 사고 책임은 보호자 | 5-6 | 불가 | `hygiene`: 보호자 책임 |

- **확정**: 예방접종 완료 REQUIRED / 자유 이동 PROHIBITED / 안기·전용의자 ANY_OF REQUIRED / 보호자 책임. **UNKNOWN**: `indoor`(실내·야외 언급 없음), `maxDogSize`, `leash` 단독 필수 여부.
- **확인**: ① 슬래시가 "셋 중 하나"인가 "셋 다"인가 ② "이용이 어렵다"가 입장 불가인가 현장 제한인가 ③ 전용 의자를 매장이 제공하는가.
- **위험**: 슬래시를 `ANY_OF`로 자동 확정하면 안 된다(원문에 "또는"·"중 하나" 없음). 현재 구조에 억지로 넣어 `leash=REQUIRED` + `carrierStrollerPolicy=REQUIRED_ALWAYS`로 저장하면 **세 가지를 모두 챙겨야 하는 매장**으로 잘못 안내된다. "자유 이동 불가"를 `indoor=PARTIAL_AREA`로 옮기는 것도 오독이다 — 구역 제한이 아니라 상태 제한이다.

### 원문 B — 오시우커피

| 문장 | 분류 | 현재 저장 | 새 구조 |
|---|---|---|---|
| 품 안에 안고 계셔야 입장 가능 | 5-4 (+5-1) | 불가 | `handling`: 안기 = REQUIRED, 입장 조건과 결합 |
| 짖음이 심한 아이들은 매장 이용이 어렵습니다 | 5-5 | 불가 | 결과값 **확인** |

- **확정**: 안고 있어야 함 REQUIRED. **UNKNOWN**: `indoor`, `maxDogSize`, 준비물 전부. **확인**: "이용이 어렵다"의 강도.
- **위험**: "입장 가능"만 보고 `indoor=ALLOWED`로 확정하면 안 된다. "안고 있어야 한다"에서 크기 상한을 추론해 `maxDogSize=SMALL`로 넣는 것도 원문에 없는 정보다. "안기"를 `carrierStrollerPolicy=REQUIRED_ALWAYS`로 옮기면 이동장 지참 요구로 잘못 읽힌다.

### 원문 C — 까사드카페

| 문장 | 분류 | 현재 저장 | 새 구조 |
|---|---|---|---|
| 3월6일부로 허가받아 동반입장 가능 | 5-8 / 시행일 | 불가 | 조건 아님. 원문 스냅샷에만 |
| 입장시에 예방접종확인증(문서/모바일) 증빙이 필요 | 5-1 | **가능** | 허용 형식(문서/모바일)만 손실 |
| 목줄, 케이지, 전용의자를 준비해주셔야합니다 | 5-2 | 왜곡 | `preparation` 그룹. 관계 **UNKNOWN** |

- **확정**: 반려동물 동반 허용, 예방접종 증빙 REQUIRED. **UNKNOWN**: `indoor`, `maxDogSize`, 준비물 관계, 3월 6일의 연도. **확인**: ① 세 가지 모두인가 일부 선택인가 ② 전용 의자는 지참인가 매장 제공인가.
- **위험**: 쉼표를 `ALL_OF`로 자동 확정하지 않는다. 현재 구조로 옮기면 "전용의자"가 갈 곳이 없어 통째로 사라지거나 `cautions`에 묻힌다.

### 원문 D — 탑립 카페

| 문장 | 분류 | 현재 저장 | 새 구조 |
|---|---|---|---|
| 애견입장료 (댕푸치노 1잔 제공) | 5-7 | 불가 | `admission` 포함 서비스 |
| 평일 3,000원 / 주말 및 공휴일 5,000원 | 5-7 | 불가 | `admission` 요금 |
| 실내동반시 케이지나 견모차 또는 리드줄 필수 | 5-2 (실내 한정) | 부분 | `preparation` **ANY_OF** (원문에 "또는" 명시) |
| 2층은 노펫존 & 노키즈존 | 5-3 | 부분 | `spaceExceptions`: 2층 NOT_ALLOWED |

- **확정**: 유료 입장, 평일 3,000원, 주말·공휴일 5,000원, 댕푸치노 1잔 포함, 실내 동반 시 케이지·견모차·리드줄 중 **하나** 필수, 2층 반려동물 불가. **UNKNOWN**: `maxDogSize`, `muzzle`, 예방접종, 야외석 조건.
- **위험**: `carrierStrollerPolicy=REQUIRED_INDOOR`가 가장 가깝지만 **"리드줄" 대안이 사라져** 목줄만 가진 방문자가 입장 불가로 오해한다. "2층 노펫존"을 `indoor=PARTIAL_AREA`로만 저장하면 1층은 되고 2층은 안 된다는 정보가 사라진다. 요금은 저장할 곳이 아예 없다.

### 원문 E — 매장명 미확인 실제 수집 사례

**특정 매장에 연결하지 않는다.** 한·영 병기이며 영어 오타는 raw snapshot에서 보존 대상이다.

| 문장 | 분류 | 현재 저장 | 새 구조 |
|---|---|---|---|
| 대형견은 야외 좌석만 이용 가능 | 5-3 + 5-1 | 왜곡 | `spaceExceptions`: 실내 × LARGE = NOT_ALLOWED |
| 목줄 또는 이동가방 필수 (미착용 시 출입 제한) | 5-2 | 왜곡 | `preparation` ANY_OF + 미충족 결과 |
| 실내 자유 이동 금지 | 5-4 | 불가 | `handling`: 자유 이동 = PROHIBITED |
| 의자·테이블 위 착석 금지 | 5-4 | 불가 | `handling`: 좌석 착석 = PROHIBITED |
| 예방접종 확인 필수, 확인 어려우면 출입 제한 | 5-1 | 부분 | 증빙 REQUIRED + 미충족 결과 |
| 지속적인 짖음 및 공격적 행동 시 이용이 제한될 수 있음 | 5-5 | 불가 | `MAY_RESTRICT` (원문이 "될 수 있습니다"로 명시) |
| 사고·분쟁·피해에 대한 책임은 보호자 | 5-6 | 불가 | `hygiene`: 보호자 책임 |
| 음료 뚜껑이 필요하면 카운터에 요청 | 5-8 | — | **구조화하지 않음** |

- **확정**: 대형견 실내 불가·야외석만 / 목줄 or 이동가방 ANY_OF REQUIRED / 실내 자유 이동 PROHIBITED / 의자·테이블 PROHIBITED / 예방접종 증빙 REQUIRED / 짖음·공격성 MAY_RESTRICT / 보호자 책임.
- **UNKNOWN**: 소·중형견의 실내 이용 범위(야외석만이라는 언급이 대형견에만 붙음), `muzzle`, 요금. **확인**: 매장 식별, 소·중형견 실내 가능 여부.
- **위험(잠재적 인코딩 위험 — 현재 발생 중인 표시 오류가 아님)**: 원문 E는 매장이 특정되지 않아 등록된 장소와 연결되어 있지 않고, **`maxDogSize=LARGE` + `indoor=PARTIAL_AREA` 조합으로 저장된 실제 행이 있는지는 이번 단계에서 DB를 조회하지 않아 확인하지 않았다.** 기존 필드로 이 원문을 억지로 저장할 경우, `getPlaceConditionBreakdown`이 `largeDogs`를 **허용 목록**에 넣으므로 "대형견은 야외석만"이 "대형견까지 환영"으로 뒤집혀 표시되고 `indoor=PARTIAL_AREA`는 이유를 잃는다. 구조화 대상 중 왜곡 폭이 가장 큰 조합이다. 실제 데이터에 해당 조합이 있는지는 2단계 backfill 점검에서 확인한다.

## E-1. 결정 항목의 의존 관계

```text
D-01은 최상위 구조 결정이다.
D-01의 선택에 따라 D-02와 D-04의 권장 기본값 및 유효한 선택지가 달라진다.
따라서 D-01을 먼저 결정한 뒤 D-02와 D-04를 판단한다.
```

D-03(원문 보존 위치)과 D-05(매칭 결과 타입)는 D-01과 독립이다.

## E-2. 유효한 결정 조합

| 조합 | D-01 | D-02 | D-03 | D-04 | D-05 | 장단점 |
|---|---|---|---|---|---|---|
| **1 (채택)** | 2A | 별도 그룹 | 스냅샷 | 항목별 배열 | 3상태 유지 | 기존 경로 무변경, migration 최소. 운영 집계는 SQL로 불가 |
| 2 (차선) | 2B | relation 분리 | 스냅샷 | 항목별 레코드 | 3상태 유지 | 무결성·집계 강함. 초기 구현·migration·폼 비용이 큼 |
| 3 | 대안 1 | 현재 필드 유지 | `rawPolicyText` | 장소 단위 | 3상태 유지 | 가장 싸지만 원문 A·D·E의 손실이 그대로 남음 |
| 4 | 2A | 별도 그룹 | 스냅샷 + 현재본 | 항목별 배열 | CONDITIONAL 추가 | 화면 문구는 정확해지나 매칭 경로·i18n·기존 테스트를 함께 변경 |

- **채택: 조합 1 / 차선: 조합 2.** 두 조합의 핵심 차이는 무결성·운영 집계(2B 우위) vs 구현·migration·관리자 입력 비용(2A 우위)이다. 현재 MVP에 운영 큐 계획이 없어 2A의 이득이 크다.
- **조합 1에서의 D-02·D-04 기본값**: JSON 내부에서 `preparation` / `handling`을 별도 그룹으로 두고, `uncertainties`를 항목별 배열로 둔다.
- **조합 3·4를 채택하지 않은 이유**: 3은 §B-3의 미지원 항목이 그대로 남는다. 4는 D-05만 다른데, `CONDITIONAL` 없이도 `CHECK_REQUIRED` + 공간 예외 표시로 전달된다.

## E-3. 확정된 결정과 근거

```text
결정 ID: D-01
질문: 조건 데이터를 어떤 구조로 저장할 것인가?
선택지: 대안 1: 현재 PlaceCondition 정식 컬럼 최소 확장
        대안 2A: 핵심 컬럼 유지 + 복합 이용수칙 JSON/Zod
        대안 2B: 핵심 컬럼 유지 + 복합 이용수칙 Prisma 하위 모델
확정: 대안 2A
근거: C-1에서 대안 2가 의미 손실과 migration 위험 두 축에서 우세했고, C-2에서 보조 구조로
  필터·정렬·집계할 현재 요구가 없어 2A의 낮은 구현·migration 비용이 2B의 이점보다 크다.
2단계 영향: PlaceCondition 조건 컬럼 9개 무변경. 보조 구조 컬럼 1개 추가와 Zod 스키마 신규.
```

```text
결정 ID: D-02
질문: "방문 전 준비물"과 "매장 안에서의 상태"를 어떻게 나눌 것인가?
이 결정은 D-01에 종속됨
D-01별 권장 기본값: 대안 1 → 현재 필드 유지 + 복합 사례만 보조 / 2A → JSON 내부 그룹 분리 /
  2B → relation 분리
확정: 별도 그룹 (preparation / handling) — D-01=2A에 의해 사실상 자동 결정
근거: 원문 A에 두 종류가 동시에 등장한다. 합치면 "유모차를 챙겨와라"와 "유모차에 태워둬라"가
  구별되지 않고, 관리자 폼에서 어느 쪽인지 물을 방법도 없다. allowedRestraints류 단일 필드는 쓰지 않는다.
사용자가 별도로 변경할 수 있는 부분: 각 그룹의 항목 코드 목록 구성.
2단계 영향: 관리자 폼에 두 개의 그룹 섹션이 생기고, 상세 화면에서 두 블록으로 나뉘어 표시된다.
```

```text
결정 ID: D-03
질문: 안내문 원문을 어디에 보존할 것인가?
확정: Verification 정책 스냅샷 (원문·언어·출처 URL·확인 방법·확인일·관리자 메모)
근거: Verification이 이미 placeId·method·verifiedAt·note를 가진 이력 테이블이라 확인 시점 단위
  보존에 자연스럽다. PlaceCondition에 현재 원문만 두면 정책 변경 시 과거 근거가 덮어써져
  "지금 공개 중인 구조화 값"과 "당시 확인한 원문"이 구분되지 않는다.
언어 처리: 한·영 병기 원문은 쪼개지 않고 전체를 하나의 스냅샷으로 보존하고,
  sourceLanguages: ["ko", "en"]처럼 복수 언어 표현을 권장한다. raw snapshot의 오타는 수정하지 않는다.
2단계 영향: cautions는 공개 표시용으로만 남고 원문 덤프 용도로 쓰지 않는다.
```

```text
결정 ID: D-04
질문: 불확실한 항목을 어느 입도로 기록할 것인가?
이 결정은 D-01에 종속됨
D-01별 권장 기본값: 대안 1 → 장소 단위 needsConfirm / 2A → 항목별 uncertainties 배열 /
  2B → 항목별 불확실성 레코드
확정: 항목별 uncertainties 배열 (대상 항목 · 이유 · 근거 원문 · 매장에 물어볼 질문)
근거: 원문 A·C의 실제 확인 질문이 "슬래시가 OR인가", "전용 의자를 매장이 주는가"처럼 항목마다
  다르다. 장소 단위 불리언으로는 무엇을 물어야 하는지가 남지 않고, 카드·지도 패널에서
  입장 판단에 중요한 미확인 정보만 골라낼 수도 없다.
사용자가 별도로 변경할 수 있는 부분: 카드·패널에 노출할 미확인 항목의 선별 기준.
2단계 영향: JSON 안에 있어 SQL 집계는 불가. 집계가 필요해지면 C-2의 2B 전환 조건에 해당한다.
```

```text
결정 ID: D-05
질문: 반려견 자동 매칭 결과 타입을 확장할 것인가?
확정: 현행 3상태(MATCH / MISMATCH / CHECK_REQUIRED) 유지 + 준비 항목은 판정 밖 "방문 전 준비"로 분리
근거: "대형견은 야외만"은 크기 자체가 불가한 게 아니므로 MISMATCH가 아니어야 하는데,
  CHECK_REQUIRED + 공간 예외 표시로 전달된다. 목줄·증빙 준비 여부는 반려견 프로필로 판정할 수
  없어 애초에 판정 대상이 아니다. 준비물 미확인을 이유로 장소 전체를 불가로 판정하지 않는다.
2단계 영향: matching.ts·DogMatchBadge·dog-match-messages·기존 테스트가 모두 무변경.
```

## 부록

### 예상 유형 수용성 (구조가 막지 않는지만 확인)

- 체중 7kg 이하 — 크기 조건에 수치 항목 추가로 흡수. · 최대 동반 마리 수 — 입장 조건 코드 추가. · 매너벨트 필수 — `preparation` 코드 목록에 추가. · 사전 예약 필수 — 입장 조건 코드 추가. · 특정 시간대만 입장 — 운영시간(`Place.hours` 미구현)과 겹칠 소지는 있으나 원문 A~E에 시간대 제한이 없으므로 **향후 예상 유형으로만 둔다. 2단계 차단 항목이 아니다.** (다섯 유형 모두 추천 구조가 막지 않는다.)

**위 5개는 모두 향후 예상 유형이며 이번 원문에서 관측되지 않았다. 이것만을 근거로 지금 필드나 enum을 추가하지 않는다.**

### 화면 요구 지원 여부

상세 페이지 1~8순위는 채택 구조로 모두 채워진다 — 매칭은 정식 컬럼, 준비물은 `preparation`, 공간은 `spaceExceptions`, 이동·착석은 `handling`, 요금은 `admission`, 제한은 `behaviorRestrictions`, 위생은 `hygiene`, 원문·출처·확인일은 스냅샷. 카드·지도 패널의 "3~4개만" 요구도 지원된다 — 정식 컬럼은 지금처럼 쓰고, 미확인 정보는 `uncertainties`에서 입장 판단에 중요한 항목만 골라 요약한다.

### 2단계 영향 요약 (각 5줄 이내, 상세 설계는 2단계)

- **schema·migration**: 정식 컬럼 무변경, 보조 구조 컬럼 추가 1회. 기존 `condition_v2`·`carrier_stroller_3state`처럼 enum을 재생성하는 파괴적 작업은 없다.
- **backfill**: 기존 행은 보조 구조를 비운 채 두면 UNKNOWN 의미가 유지된다. `cautions`에 뭉쳐 있는 문장의 재분류는 자동 파싱하지 말고 관리자 수동 확인으로 처리한다.
- **관리자 폼**: `PlaceForm.tsx`에 그룹별 섹션이 늘어난다. JSON 직접 입력은 노출하지 않는다. `form-data.ts`의 평평한 FormData 파싱은 그룹·배열을 다루도록 확장이 필요하다.
- **표시**: `BeforeYouGoCard`는 조건 6행 고정이라 그룹 섹션 추가가 필요하고, `eligibility.ts`의 `AllowanceKey`·`VisitConditionKey`는 조합 문구를 만들 수 있어야 한다.
- **i18n**: 지금은 enum 값 1개당 문구 1개다. "A 또는 B" 조합 문구를 만들려면 항목 문구와 연결 문구를 나눠야 한다. 영어 문구는 원문 오타를 따르지 않고 새로 쓴다.
- **자동 매칭**: D-05=현행 유지이므로 `matching.ts`는 변경 없음. 준비 항목은 판정이 아니라 "방문 전 준비" 표시로만 쓰므로 기존 테스트도 유지된다.
- **테스트**: `eligibility.ts`·`filtering.ts`에 현재 테스트가 없다는 점이 회귀 위험이다. 2단계에서 보조 구조 파서와 함께 최소 범위로 채우는 것을 검토한다.

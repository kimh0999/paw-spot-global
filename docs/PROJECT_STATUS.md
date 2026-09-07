# Paw Spot Global — 구현 현황

> **이 문서의 목적**: 기획이 아니라 **실제 개발 진행 상황 추적**이다.
> 모든 상태는 코드 확인에 근거한다. 확인하지 못한 것은 `확인 필요`로 남기고 추측하지 않는다.
>
> **기준일**: 2026-09-07 (P0 #5 · #20 · #7 완결 · 모션 감사 반영) · 직전 **P0 20건 코드 재대조** 2026-09-06 · 직전 전 항목 재확인 2026-08-18 · **브랜치**: `chore/project-foundation`
> **기획 기준**: `docs/Paw_Spot_Global_기획서_v3.md` · **구현 기준**: `docs/Paw_Spot_Global_개발명세서_v2.md` · **디자인 기준**: `DESIGN.md`

**상태 값**: `완료` / `부분 완료` / `미구현` / `확인 필요`

---

## 요약

아래 20개 절의 상태 행 **160건** 집계.

| 상태 | 개수 |
|---|---|
| 완료 | 101 |
| 부분 완료 | 16 |
| 미구현 | 39 |
| 확인 필요 | 4 |

> **집계 범위 주의**: 2026-09-06 재대조는 **P0 20건과 그에 직접 대응하는 상태 행만** 코드로 확인했다.
> 위 수치는 그 12개 행(09-06 8건 + 09-07 4건)의 판정 변경만 반영해 다시 계산한 값이고,
> 나머지 행은 2026-08-18 판정을 그대로 이어받은 **미검증** 값이다.

**MVP 출시를 차단하는 P0 항목: 20개 중 완료 16 · 미착수 4** (§P0 목록 참조)

주의: "완료" 101건은 **세부 항목 단위** 집계다. 화면·기능 단위로 보면 탐색 화면의 레이아웃·동기화·판정 로직과 라우트 상태 처리는 완성도가 높은 반면, 상세 페이지의 액션 영역과 데이터 파이프라인(운영시간 · 후보 Import)은 여전히 비어 있다. 절별 분포를 함께 볼 것.

D-01~D-10 결정으로 이전에 `확인 필요`였던 "필터 `unknown` 처리 비대칭"이 `미구현`(수정 대상)으로 확정되었고, 선행 결정 대기 상태였던 4개 항목(신선도 임계 · 운영시간 구조 · 후보 저장 방식 · Import 실행 형태)이 착수 가능해졌다.

### 2026-08-13 → 08-18 변경분

이 기간의 작업은 **P0 목록이 아니라 §13 반려견 영역과 §20 테스트에 집중됐다.** P0 20건은 하나도 진행되지 않았다.

| 변경 | 절 |
|---|---|
| 반려견 여러 마리 CRUD 구현 (기획서 v3 기준 P2였던 항목) | §13 |
| 견종을 자유 입력에서 canonical code로 전환 + 백필 마이그레이션 | §9, §13 |
| 반려견 선택을 URL 파라미터로 전달, 다견 최악 판정 표시 | §13 |
| vitest 도입 + 98건 (반려견 순수 로직 중심) | §20 |
| `.dark{}` 블록 제거 — 단 `next-themes`는 `sonner.tsx`가 사용 중 | §17 |
| 빌드·타입체크·린트·테스트 전부 통과 확인 | §20 |

### 2026-08-18 → 09-06 변경분

이 기간에는 **반려동물 이용 조건 구조화**(`policyDetails`)와 **라우트 상태 처리**가 진행됐다.
P0 20건 재대조 결과, 08-18 시점에 `미구현`으로 적혀 있던 5건이 실제로는 해소돼 있었다.

| 변경 | 절 | P0 |
|---|---|---|
| `policyDetails` JSONB 도입 + 관리자 입력 UI 4그룹 + 상세 표시 (별도 갭 분석 문서) | §6, §9, §15 | — |
| `loading.tsx`(공개·목록·상세) / `error.tsx`(공개·관리자) / `not-found.tsx` 추가 | §18 | #5 |
| 홈 `try/catch` 오류 삼킴 제거 → 오류 경계로 위임 | §1 | #6 |
| 예방접종 `UNKNOWN` 행 숨김 (`showsVaccinationRow` + 테스트) | §6 | #12 |
| 한국어 문의 박스 상세 페이지 비노출 (컴포넌트·메시지 키는 보존, 테스트로 고정) | §7 | #13 |
| 장소 순수 함수 테스트 보강 — `eligibility` 28 · `filtering` 27 · `display` 5 | §20 | — |
| **홈 장소 탐색 섹션 단일화** — `RecentPlacesSection`·`HomePlaceCard`·`getHomePlaces()`·`HomePlaceItem`·`home.recentPlaces` 제거 | §1 | #3 |
| **카테고리 영어 라벨 `Attractions`** — en 문자열 3개만 교체 (enum·내부값 유지) | §16 | #4 |
| **긍정 조건 필터에서 미확인 제외** — `indoor`를 `carrier` 규칙에 맞추고 `exclude-unknown` 전 계층 제거 | §2 | #19 |
| **카테고리·필터·정렬·검색어 URL 반영** — `place-list-params.ts` 신설, 주소가 목록 조건의 단일 출처 | §2 | #16 |
| **로그인 locale 하드코딩 제거** — `auth.ts`의 `pages`를 locale 없는 `/login`으로, 미들웨어가 협상 | §12 | #15 |
| **`border-strong` 무효 클래스 교체** — 4파일 6곳을 `border-border-strong`으로 | §17 | #17 |
| **공개 조건에 검증 이력 필수** — 사용자 조회 4곳에 `verifications: { some: {} }` | §8 | #1 |
| **신선도 임계 90일 단일** — 8주 임계 폐기, `Recheck needed`/`재확인 필요` 배지 (상세 페이지 포함 4곳) | §6, §8 | #2 |
| **미리보기 Primary Action 반전** — `상세 보기`를 primary, 길찾기를 secondary로 | §5 | #8 |
| **마커 선택 → 목록 카드 스크롤** — 장소 id로 카드를 잡아 `scrollIntoView` | §3 | #9 |

### 2026-09-06 → 09-07 변경분

| 변경 | 절 | P0 |
|---|---|---|
| `(admin)/admin/loading.tsx` — 관리자 목록·등록·수정 공통 대기 화면 | §18 | #5 |
| `global-error.tsx` — 루트 레이아웃 실패 시의 마지막 경계. `<html>`·`<body>`·전역 CSS를 직접 들고 오고 문구는 en 고정 | §18 | #5 |
| **서비스 범위 안내** — `service-area.ts` 신설(대전 좌표·zoom·50km 임계·범위 판정·빈 상태 우선순위). 지도 fallback을 서울→대전으로 교체 | §3 | #20 |
| **범위 밖 안내 + `대전 장소 보기`** — 위치를 말없이 무시하지 않고 `clearLocation`으로 사용자가 이동을 고른다 | §3, §18 | #20 |
| **빈 상태 3종 분리** — 범위 밖 / 필터 0건(`필터 초기화`) / 공개 장소 0건. 동시 성립 시 범위 밖 우선 | §18 | #20 |
| `DESIGN.md` v1.2.2 — §7 States의 `Seoul City Hall` 표기를 대전으로 고치고 범위 밖·빈 상태 행 추가 | §17 | #20 |
| **범위 판정 기준을 중심 거리로 교체** (D-11a) — 잘못 공개된 장소가 서비스 범위를 넓히지 못하게 한다 | §3 | #20 |
| `LocationPickerMap`의 서울 fallback도 `SERVICE_AREA_CENTER`로 — 서울 좌표 상수 잔여 0건 | §15 | — |

---

## 1. 홈

| 영역 | 상태 | 현재 구현 | 남은 작업 | 우선순위 | 근거 파일 |
|---|---|---|---|---|---|
| 홈 카테고리 탭 | 완료 | Radix Tabs 4탭(all/restaurant/cafe/travel), 탭별 지연 로딩 + 클라이언트 캐시 + race guard. 영어 라벨 `All / Restaurants / Cafes / Attractions` | — | — | `src/components/home/CategoryPlaceTabs.tsx`, `src/components/home/CategorySection.tsx` |
| 카테고리별 장소 조회 | 완료 | `getCategoryPlaces(category)` — DB에서 카테고리 필터 + `take 8` + `count` 동시 반환. Server Action `fetchCategoryPlaces`로 노출 | 공개 조건에 "검증 이력 존재" 추가 | P0 | `src/lib/places/queries.ts:290-312`, `src/lib/places/actions.ts` |
| 홈 카드 즐겨찾기 | 완료 | 서버에서 `getFavoritePlaceIds` 조회 → `CategoryPlaceCard`가 링크 오버레이 위에 `FavoriteButton` 배치 | — | — | `src/components/home/CategoryPlaceCard.tsx:160-167` |
| 홈 로딩·빈·오류 상태 | 완료 | 탭 전환 시 직전 카드 수만큼 스켈레톤, `empty` 문구, 오류 + `Try again` 버튼 | — | — | `src/components/home/CategoryPlaceTabs.tsx:85-131` |
| 홈 장소 섹션 단일화 | 완료 | 홈은 `CategorySection` → `CategoryPlaceTabs` 하나만 렌더. 명세서 v2 §7-1 제거 목록 5종(컴포넌트 2 · 쿼리 1 · 타입 1 · 메시지 키 1) 전부 삭제, 잔여 참조 0건 | — | — | `src/app/[locale]/(public)/page.tsx` |
| 홈 데이터 범위 일관성 | 완료 | `getHomePlaces` 제거로 ETC 포함 경로가 사라졌다. 홈 전체가 `MVP_PLACE_CATEGORIES` 하나만 따른다 | — | — | `src/lib/places/queries.ts` |
| 홈 오류 처리 | 완료 | `page.tsx`에 `try/catch` 없음 — 조회 실패가 `[locale]/error.tsx` 경계로 전파돼 재시도 버튼이 뜬다. 실패와 "데이터 없음"이 구분된다 | — | — | `src/app/[locale]/(public)/page.tsx`, `src/app/[locale]/error.tsx` |
| Hero 검색 · Near me | 부분 완료 | 검색 폼(`/places?q=`) + Geolocation "Near me" 동작 | 일러스트 플레이스홀더 박스 대체 | P1 | `src/components/home/HeroSection.tsx:24-32`, `HeroActions.tsx` |
| 안내 섹션 | 완료 | 확인 항목 5종(실내·이동장·크기·입장조건·확인일) | — | — | `src/components/home/InfoSection.tsx` |

---

## 2. 장소 목록 · 카드 · 필터 · 정렬

| 영역 | 상태 | 현재 구현 | 남은 작업 | 우선순위 | 근거 파일 |
|---|---|---|---|---|---|
| 장소 카드 | 완료 | 이미지 없는 밀도형 카드. 장소명·거리·카테고리·주소·방문가능배너·조건 3개·확인일. `min-h-14`로 높이 고정 | — | — | `src/components/places/PlaceCard.tsx`, `PlaceConditionSummary.tsx` |
| 방문 가능 여부 판정 | 완료 | `eligibility.ts`가 조건 해석의 단일 출처. `unknown`/`null`을 허용 조건에 넣지 않음. 핵심 3조건 미확인 시 `confirm` 상태 | — | — | `src/lib/places/eligibility.ts` |
| 조건 미확인 표시 | 완료 | `Needs confirmation` / `Indoor unconfirmed` / `Not checked yet` 문구 | — | — | `messages/en.json` `places.card.*`, `places.preview.status.confirm` |
| 필터 | 완료 (2026-09-07) | 우측 Drawer. 실내 **4택**(D-12로 `확인 필요 제외` 삭제) / 이동장 3택 / 크기 4택 / 신선도 30·90일. 선택은 URL에 반영됨. Radix `Dialog`로 교체해 `role="dialog"`·`aria-labelledby`·ESC·focus trap·스크롤 잠금·focus 복귀를 갖췄고, **닫히면 DOM에서 사라져** 화면 밖 패널의 버튼 16개가 탭 순서에 남던 문제도 해소됐다 | — | — | `src/components/places/FilterModal.tsx`, `plans/007-dialog-sheet-accessibility.md` |
| 정렬 | 부분 완료 | 4종(거리·최근확인·실내우선·이동장불필요). 위치 없으면 거리순 `disabled`. 선택은 URL에 반영됨 | 접근성(`aria-expanded`, listbox) / Radix 교체 | P1 | `src/components/places/SortDropdown.tsx` |
| 필터·정렬 URL 반영 | 완료 | 주소가 단일 출처다. `usePlaceListState`가 `useSearchParams`에서 카테고리·필터·정렬을 파생하고, 검색어만 입력 즉시성을 위해 로컬 state + 300ms 디바운스로 주소에 뒤따른다. 쓰기는 native history API라 서버 재요청이 없다 | — | — | `src/lib/places/place-list-params.ts`, `hooks/usePlaceListState.ts` |
| 텍스트 검색 | 완료 | `q` 파라미터 + 실시간 클라이언트 필터(nameKr/nameEn/address) | — | — | `src/lib/places/filtering.ts:37-43` |
| 서버 페이징 | 미구현 | `findPlaces()`가 `take` 없이 공개 장소 전량 로드 | MVP는 임시 허용(기획서 v3 §6-2). 안전 상한 가드 권장, 전국 확장 전 커서 페이징 필수 | P2 | `src/lib/places/queries.ts:146-153` |
| 반경 / Bounds 검색 | 미구현 | 반경 개념 없음. 전량에 `ST_Distance` 계산 | 전국 확장 선행 조건 | P2 | `src/lib/places/queries.ts:162-189` |
| 필터 `unknown` 처리 | 완료 | `INDOOR_FILTER_MATCH`가 필터값별 확정값 하나만 인정 → `indoor`가 `carrier`와 같은 규칙이 됐다. `dogSize`는 D-03 예외로 미확인 유지. `exclude-unknown`은 타입·분기·모달 옵션·en/ko 키에서 전부 제거 | — | — | `src/lib/places/filtering.ts`, `src/types/place.ts`, `FilterModal.tsx` |
| 목록 로딩·오류 상태 | 완료 | `places/loading.tsx`(목록+지도 2단 스켈레톤) + `[locale]/error.tsx` 경계가 목록 라우트를 덮는다 | — | — | `src/app/[locale]/(public)/places/loading.tsx`, `src/app/[locale]/error.tsx` |

---

## 3. 지도 · 목록 · 미리보기 연동

| 영역 | 상태 | 현재 구현 | 남은 작업 | 우선순위 | 근거 파일 |
|---|---|---|---|---|---|
| 데스크톱 3분할 | 완료 | xl≥1280 3분할(목록 340 / 미리보기 380 / 지도), lg 1024–1279는 지도 위 오버레이(356px 오프셋, 360px) | — | — | `src/app/[locale]/(public)/places/PlacesClient.tsx:329-345` |
| 미선택 시 지도 확장 | 완료 | 미선택이면 미리보기 컬럼 `xl:w-0`으로 접히고 지도가 넓어짐. `duration-standard` 트랜지션 | — | — | 같은 파일 `:336-342` |
| 지도 재마운트 방지 | 완료 | `apiKey`에만 의존해 1회 초기화. 선택/hover 변경 시 `setIcon`/`setZIndex`만 갱신 | — | — | `src/components/places/MapPanel.tsx:111-188` |
| 카드 hover → 마커 | 완료 | `hoveredPlaceId` 공유, 마커 색·크기·zIndex 변경 | — | — | `PlacesClient.tsx:303-318`, `MapPanel.tsx:181-188` |
| 카드 선택 → 미리보기 + 마커 | 완료 | `selectedPlaceId` 공유, 지도 `panTo` | — | — | `MapPanel.tsx:226-232` |
| **마커 선택 → 카드 스크롤** | 완료 | 장소 id → `<li>` ref 맵으로 카드를 찾아 `scrollIntoView({block:"nearest"})`. 지도에서 고른 경우에만 동작하도록 `handleMarkerSelect`를 따로 두어 첫 렌더·카드 클릭·평범한 재렌더에서는 스크롤하지 않는다. `prefers-reduced-motion`이면 `behavior:"auto"` | 모바일(시트 `selected` 단계에서 목록이 `hidden`) 동작 미검증 | P0 | `PlacesClient.tsx` |
| 사용자 위치 마커 | 완료 | 장소 마커와 분리 관리, 위치 변경 시에만 `panTo` | — | — | `MapPanel.tsx:191-238` |
| 지도 오류·로딩 문구 | 부분 완료 | `no-key` / `error` / `loading` 3상태 분기 존재 | 문구가 영어 하드코딩, 재시도 수단 없음 | P0 | `MapPanel.tsx:240-267` |
| 마커 API | 부분 완료 | `google.maps.Marker`(deprecated) 사용. `importLibrary("marker")` 호출하나 결과 미사용 | `AdvancedMarkerElement` 마이그레이션 | P2 | `MapPanel.tsx:121-122,164` |
| Google Maps 키 제한 | 확인 필요 | 코드에서 확인 불가 (콘솔 설정 사항) | Referer 제한 설정 확인 | P1 | — |
| 지도 기본 중심 | 완료 (2026-09-07) | 중심 결정 순서는 그대로(`사용자 위치 → 선택 장소 → 목록 첫 장소 → fallback`)이고 최종 fallback만 `SERVICE_AREA_CENTER`(대전시청)로 교체했다. 이 단계는 볼 장소가 정해지지 않은 상태라 zoom도 14 → `SERVICE_AREA_ZOOM`(12)로 넓혔다. 공개 장소가 모두 대전이라 실제로는 첫 장소 좌표가 먼저 잡힌다 — 이 상수는 좌표 있는 장소가 0건일 때 쓰인다 | — | — | `src/lib/places/service-area.ts`, `MapPanel.tsx` |
| 서비스 범위 안내 | 완료 (2026-09-07) | 범위 판정은 **`SERVICE_AREA_CENTER`(대전시청)로부터 사용자까지의 거리 > 50km**(`isOutsideServiceArea`). 위치를 모르면 판정하지 않는다. 범위 안이면 상시 안내 배너, 범위 밖이면 Amber 배너 + `대전 장소 보기`. 버튼은 `lat`·`lng`와 `sort=distance`를 주소에서 걷어내고, 지도는 **위치를 껐을 때만** 대전으로 되돌린다 | — | — | `service-area.ts`, `PlacesClient.tsx`, `useUserLocationQuery.ts` |

---

## 4. 모바일 Bottom Sheet

| 영역 | 상태 | 현재 구현 | 남은 작업 | 우선순위 | 근거 파일 |
|---|---|---|---|---|---|
| 3단계 시트 | 완료 | `peek`(h-24) / `results`(75vh) / `selected`(h-72). 선택 상태에서 **파생**하므로 요약을 닫으면 직전 단계로 복귀 | — | — | `PlacesClient.tsx:28-35,102-106,125-167` |
| 목록 ↔ 지도 전환 | 완료 | 단일 토글 버튼(`Show list`/`Show map`). 전환 중 필터·선택 상태 유지 | — | — | `PlacesClient.tsx:150-161` |
| 시트 전환 모션 | 완료 | `transition-[height] duration-300` + `motion-reduce:transition-none` | — | — | `PlacesClient.tsx:129-131` |
| 시트 접근성 | 완료 (2026-09-07) | **모달 시맨틱을 의도적으로 걸지 않았다**(D-13a). 시트는 1단계가 항상 떠 있고 지도가 배경에서 조작되는 상시 패널이라 focus trap·`aria-modal`을 걸면 지도·헤더·`내 위치`에 키보드로 도달할 수 없다. 대신 3단계(선택)에서 벗어나는 ESC와 목록 토글의 `aria-expanded`를 넣었다. 시트 자체는 이미 이름 있는 landmark(`<section aria-label>`)다 | — | — | `PlacesClient.tsx`, `plans/007-dialog-sheet-accessibility.md` |
| Safe area | 완료 | `pb-[env(safe-area-inset-bottom)]` | — | — | `PlacesClient.tsx:128` |

---

## 5. 선택 장소 미리보기 패널

| 영역 | 상태 | 현재 구현 | 남은 작업 | 우선순위 | 근거 파일 |
|---|---|---|---|---|---|
| 패널 구조 | 완료 | header(고정) / body(스크롤) / footer(고정) 3영역 | — | — | `src/components/places/PlacePreviewCard.tsx:198-322` |
| 카드보다 많은 정보 | 완료 | 전체 주소, 목줄·입마개 포함 조건 전체, 확인 방법, 주의사항(3줄 클램프 + 더보기) | — | — | 같은 파일 `:83-130,264-300` |
| 이미지·운영시간·연락처 제외 | 완료 | `DESIGN.md` §6 준수 | — | — | 같은 파일 전체 |
| 선택 변경 시 포커스 이동 | 완료 | `headingRef.focus()` on `place.id` 변경 | `aria-live` 고지 추가 | P1 | 같은 파일 `:144-148` |
| **Primary Action** | 완료 | `상세 보기`가 `default`(파랑), 길찾기가 `outline`. 조건부 variant(`detailsVariant`)를 없애 위치 유무와 무관하게 primary는 항상 하나다. 위치가 없으면 길찾기 버튼 자체를 만들지 않는다 | — | — | `src/components/places/PlacePreviewCard.tsx` |
| 위치 없을 때 액션 생략 | 완료 | `directionsUrl`이 없으면 길찾기 버튼 자체를 렌더하지 않음 | — | — | 같은 파일 `:188-191,311` |

---

## 6. 장소 상세 페이지

| 영역 | 상태 | 현재 구현 | 남은 작업 | 우선순위 | 근거 파일 |
|---|---|---|---|---|---|
| Before You Go | 완료 | 실내·이동장·최대크기·목줄·입마개·예방접종 6행 + 주의사항 경고박스 + 준비물 + 견종 제한 | — | — | `src/components/places/BeforeYouGoCard.tsx` |
| 예방접종 조건부 숨김 | 완료 | `showsVaccinationRow()`가 `required`/`not_required`일 때만 `true` → `unknown`·`null`은 행 자체를 만들지 않음. 단위 테스트 3건 | — | — | `src/lib/places/display.ts`, `BeforeYouGoCard.tsx:127`, `display.test.ts` |
| 검증 정보 표시 | 완료 | 확인일 · 확인 방법 · 메모. 없으면 `notVerified` 문구. 90일 이상 지났으면 확인일 옆에 Amber `Recheck needed` 배지 — 목록·카드와 같은 `needsRecheck()`를 호출해 화면마다 경계가 갈라지지 않는다 | 표시 순서를 `DESIGN.md` §6에 맞추는 건 P1 | P1 | `src/app/[locale]/(public)/places/[id]/page.tsx:230-247` |
| 디스클레이머 | 부분 완료 | 1문장(`Store policies may change…`) | 기획서 v3 §13-1 전문(확인일·확인방법 포함)으로 확장 | P1 | `messages/en.json` `places.detail.disclaimer` |
| 연락처 | 완료 | 전화(`tel:`) · 웹사이트 · 인스타그램 · Google Maps 링크. 값 없으면 행 생략 | — | — | `places/[id]/page.tsx:129-186` |
| 거리 표시 | 미구현 | 상세에 거리 없음 | `DESIGN.md` §6 표시 순서 2번 | P0 | 같은 파일 |
| 길찾기 · 공유 · 즐겨찾기 액션 | 미구현 | 버튼 없음. Google Maps는 본문 텍스트 링크 1개 | 액션 영역 신설 | P0 | 같은 파일 `:172-184` |
| 운영시간 | 미구현 | Prisma 필드·타입·폼·UI 전 계층 없음 | **D-04 확정**: `Place.hours`(요일별 JSON) + `Place.hoursNote`(1줄 메모) 신설. 구조는 개발명세서 v2 §3-4 | P0 | `prisma/schema.prisma:105-131` |
| 신고 | 미구현 | UI·Action·모델 없음. `REPORT_REASONS`/`REPORT_STATUS` 상수만 잔존 | `Report` 모델 + UI + 관리자 처리 | P1 | `src/lib/constants.ts:37-42` |
| SEO | 미구현 | `generateMetadata`·JSON-LD·OG·hreflang·`sitemap.ts`·`robots.ts` 전무. 루트 layout에 고정 한국어 metadata 1개 | 전체 구현 | P1 | `src/app/layout.tsx:10-14` |
| 이미지 최적화 | 미구현 | `next.config.mjs`에 `images.remotePatterns` 없음 → 전 이미지 `unoptimized` | 도메인 등록 후 `unoptimized` 제거 | P1 | `next.config.mjs`, `CategoryPlaceCard.tsx:107` |
| 상세 로딩·오류·404 | 완료 | `places/[id]/loading.tsx`(사진→이름→조건 순 스켈레톤) · `[locale]/not-found.tsx`가 `notFound()` 수신 · `[locale]/error.tsx`가 오류 수신 | — | — | `places/[id]/loading.tsx`, `[locale]/not-found.tsx`, `[locale]/error.tsx` |

---

## 7. 한국어 문의 문구

| 영역 | 상태 | 현재 구현 | 남은 작업 | 우선순위 | 근거 파일 |
|---|---|---|---|---|---|
| 컴포넌트 | 완료 | 정적 템플릿 + 클립보드 복사 + `sonner` 토스트. 영어 로케일에서만 렌더 | — | — | `src/components/places/KoreanInquiryBox.tsx` |
| **MVP 비노출 처리** | 완료 | 상세 페이지에서 `KoreanInquiryBox` import·렌더 없음. 컴포넌트 파일과 `places.detail.koreanInquiry` 키는 P1 재도입 대비 보존. `korean-inquiry.test.ts`가 비노출과 보존을 함께 고정 | — | — | `places/[id]/page.tsx`, `korean-inquiry.test.ts` |
| 복사 실패 처리 | 부분 완료 | 실패를 `catch {}`로 삼키고도 "Copied!" 표시 | 실패 시 별도 안내 | P1 (비노출 시 유예) | `KoreanInquiryBox.tsx:23-32` |
| 동적 생성 | 미구현 | 장소명·반려견 크기·미확인 조건 반영 없음 | P1 재도입 후보 | P1 | `KoreanInquiryBox.tsx:10-17` |

---

## 8. 장소 조회 Query · Server Action

| 영역 | 상태 | 현재 구현 | 남은 작업 | 우선순위 | 근거 파일 |
|---|---|---|---|---|---|
| 조회 함수 | 완료 | `getPlaces` / `getCategoryPlaces` / `getPlaceById` / `getAdminPlaces` / `getAdminPlaceById` | — | — | `src/lib/places/queries.ts` |
| PostGIS 좌표·거리 | 완료 | `$queryRaw`로 `ST_Y`/`ST_X`/`ST_Distance` 조회 후 `id`로 join. 위치 없으면 `distanceMeters=null` | — | — | 같은 파일 `:162-189` |
| **검증 완료 장소만 공개** | 완료 | `PUBLIC_PLACE_WHERE`(= `visibility` + `verifications: { some: {} }`)를 `getPlaces`·`getCategoryPlaces`에 적용. `getPlaceById`는 `findUnique`가 관계 조건을 못 받아 조회한 검증 이력으로 같은 규칙을 적용. `getFavoritePlaces`는 중첩 `place` 조건에 적용. 마이그레이션·임시 이력 생성 없음 | — | — | `queries.ts`, `favorites/queries.ts`, `public-visibility.test.ts` |
| `Recheck needed` (90일) | 완료 | `RECHECK_AFTER_DAYS = 90` + `needsRecheck()` 하나로 통일(`>= 90일`). `daysSinceVerified()`는 경과 일수 표시용으로 분리. 확인일이 없거나 읽을 수 없으면 재확인 대상으로 본다. 배지는 `Recheck needed`/`재확인 필요`, 확인일 표시는 그대로 유지. 중간 경고 단계 없음 | — | — | `src/lib/places/display.ts`, `display.test.ts` |
| Server Action — 카테고리 | 완료 | `fetchCategoryPlaces(category)` 화이트리스트 파싱 | — | — | `src/lib/places/actions.ts` |
| Server Action — 즐겨찾기 | 완료 | `toggleFavorite` + `revalidatePath` | — | — | `src/lib/favorites/actions.ts` |
| Server Action — 반려견 | 완료 | `upsertDog` + zod + 필드 오류 + `revalidatePath` | — | — | `src/lib/dogs/actions.ts` |
| Server Action — 관리자 | 완료 | `createPlace` / `updatePlace` + 인가 + zod + 오류 매핑 | — | — | `admin/places/{new,[id]/edit}/actions.ts` |
| `Result<T,E>` 규약 | 미구현 | `lib/result.ts` 정의만 존재, 사용처 0건. Action마다 반환 형태 상이 | **D-10 확정**: `result.ts` 제거, `errors.ts` 유지. 형태별 반환을 정식 규약으로 인정 | P1 | `src/lib/result.ts` |
| 캐시 태그 전략 | 미구현 | `revalidateTag`·`revalidate` 없음. `revalidatePath`만 사용 | 태그 기반 무효화 | P2 | 각 `actions.ts` |

---

## 9. Prisma Schema · 데이터 구조

| 영역 | 상태 | 현재 구현 | 남은 작업 | 우선순위 | 근거 파일 |
|---|---|---|---|---|---|
| 핵심 모델 | 완료 | `User` / `Place` / `PlaceCondition` / `Verification` / `Dog` / `Favorite` | — | — | `prisma/schema.prisma` |
| 조건 필드 | 완료 | `indoor`(5) · `carrierStrollerPolicy`(4) · `maxDogSize`(4) · `leash`(4) · `muzzle`(4) · `vaccinationCertificatePolicy`(3) · `breedRestrictions` · `requiredItems` · `cautions` | — | — | `prisma/schema.prisma:133-149` |
| PostGIS 좌표 | 완료 | `Unsupported("geography(Point, 4326)")` + raw SQL 처리 | — | — | `prisma/schema.prisma:113`, `lib/places/create-place.ts` |
| 마이그레이션 | 완료 | init / condition_v2 / vaccination / carrier_stroller_3state / favorite / dog_breed_code (6건) | — | — | `prisma/migrations/` |
| `Dog` 견종 코드화 | 부분 완료 | `breedCode` · `breedCustom` · `updatedAt` 추가 + 기존 값 백필. 매핑 실패분은 `other` + 원문 보존 | 읽기·쓰기 전환 확인 후 별도 마이그레이션으로 `breed` 컬럼 제거 | P1 | `prisma/schema.prisma:170-176`, `prisma/migrations/20260816000000_dog_breed_code/` |
| PostGIS extension 활성화 | 확인 필요 | 코드는 extension 존재를 전제. 실제 DB에서만 확인 가능 | 배포 환경 확인 | P0 | — |
| `Place.hours` / `hoursNote` | 미구현 | 필드 없음 | **D-04 확정** 구조로 추가 (개발명세서 v2 §3-4) | P0 | `prisma/schema.prisma:105-131` |
| `Report` 모델 | 미구현 | 없음 | 추가 | P1 | — |
| `Review` 모델 | 미구현 | 없음 | 기획서 v3에서 P2로 이동 | P2 | — |
| `Account`/`Session` | 미구현 | 없음 (JWT 전략이라 불필요) | provider 추가 시 재검토 | P2 | `src/auth.ts:13-15` |
| 잔존 `CarrierPolicy` enum | 부분 완료 | 어떤 모델도 참조하지 않음 | 별도 마이그레이션으로 제거 | P1 | `prisma/schema.prisma:42-49` |

---

## 10. TourAPI 수집 구조

| 영역 | 상태 | 현재 구현 | 남은 작업 | 우선순위 | 근거 파일 |
|---|---|---|---|---|---|
| API 클라이언트 | 미구현 | 없음 | 원본 조회 함수 | P0 | — |
| 매퍼 | 미구현 | 없음 | 원본 → Place 초안 변환 | P0 | — |
| 중복 방지 Import | 미구현 | `Place.tourApiId @unique` 컬럼만 존재 | upsert 기반 멱등 Import | P0 | `prisma/schema.prisma:107` |
| 후보 데이터 격리 | 미구현 | 후보 개념 자체가 없음 | **D-05 확정**: `Place` + `visibility=DRAFT`로 저장, 별도 모델 없음. 조건·검증 미생성. 좌표 없는 항목은 skip | P0 | `prisma/schema.prisma:120` |
| 실행 형태 | 미구현 | — | **D-06 확정**: 로컬 스크립트 수동 실행(`npm run import:tour` 등). 관리자 버튼·스케줄러는 P1 | P0 | `package.json` |
| 관리자 후보 대시보드 | 미구현 | 없음 | 목록·필터·자동 채움 | P1 | — |
| 잔존물 | 부분 완료 | 관리자 폼의 `tourApiId` 수동 입력 필드, 미사용 `TOUR_API_ERROR` 코드, `.env.example`의 키 자리 | — | — | `components/admin/PlaceForm.tsx:939-948`, `src/lib/errors.ts:7`, `.env.example:33` |

---

## 11. 즐겨찾기

| 영역 | 상태 | 현재 구현 | 남은 작업 | 우선순위 | 근거 파일 |
|---|---|---|---|---|---|
| 토글 | 완료 | 낙관적 업데이트 + 실패 롤백 + 비로그인 시 `callbackUrl` 보존 로그인 유도 | — | — | `src/components/places/FavoriteButton.tsx` |
| 목록 페이지 | 완료 | 로그인 강제, 공개 장소만, 최신순, 빈 상태 처리 | — | — | `src/app/[locale]/(public)/favorites/page.tsx`, `lib/favorites/queries.ts` |
| 카드 재사용 | 완료 | `FavoritesList`가 탐색 화면과 동일한 `PlaceCard` 사용(`action="openDetails"`) + 대표 반려견 판정 전달 | — | — | `src/app/[locale]/(public)/favorites/FavoritesList.tsx` |
| i18n 키 정합성 | 부분 완료 | `places.selectedPlacePanel.favorite.*` 참조 — 해당 컴포넌트는 이미 삭제됨 | 키 이름 정리 | P1 | `FavoriteButton.tsx:23` |

---

## 12. 인증

| 영역 | 상태 | 현재 구현 | 남은 작업 | 우선순위 | 근거 파일 |
|---|---|---|---|---|---|
| Google OAuth + JWT | 완료 | Auth.js v5, `strategy:"jwt"`, `signIn` 콜백에서 `prisma.user.upsert` | — | — | `src/auth.ts` |
| 로그인 페이지 | 완료 | 이미 로그인 시 리다이렉트, `error` 쿼리별 메시지, Server Action `signIn` | — | — | `src/app/[locale]/(public)/login/page.tsx` |
| 사용자 가드 | 완료 | `requireUser`(페이지) / `requireUserAction`(액션) | — | — | `src/lib/auth/current-user.ts` |
| 관리자 가드 | 완료 | `requireAdminPage` / `requireAdminAction`. **DB의 role을 매 요청 조회**해 JWT만 믿지 않음. 미인증→로그인, 비관리자→`/forbidden` | — | — | `src/lib/auth/require-admin.ts` |
| Open Redirect 방어 | 완료 | `getSafeCallbackUrl()` | — | — | `src/lib/auth/safe-callback-url.ts` |
| 로그인 경로 로케일 | 완료 | `pages`를 locale 없는 `/login`으로 두고 next-intl 미들웨어가 기존 정책(NEXT_LOCALE 쿠키 → Accept-Language → `DEFAULT_LOCALE=en`)대로 `/ko/login`·`/en/login`으로 넘긴다. `?error=` 쿼리도 함께 넘어간다. 앱 쪽 진입점(`requireUser`·`requireAdminPage`·`Header`·`FavoriteButton`)은 이미 locale을 유지하고 있었다 | — | — | `src/auth.ts`, `src/middleware.ts` |
| Rate Limiting | 미구현 | 없음 | 신고 기능 도입 시 필수 | P1 | — |

---

## 13. 반려견 프로필

| 영역 | 상태 | 현재 구현 | 남은 작업 | 우선순위 | 근거 파일 |
|---|---|---|---|---|---|
| 여러 마리 등록·수정·삭제 | 완료 | `/profile/dogs` 목록 + 다이얼로그 폼. `createDog`/`updateDog`/`deleteDog` 3개 Server Action, 사용자당 상한 10마리를 서버에서 재확인 | — | — | `src/components/dogs/DogsManager.tsx`, `lib/dogs/actions.ts:50-113`, `lib/dogs/constants.ts:2` |
| 기존 `/my-dog` 경로 | 완료 | `/profile/dogs`로 리다이렉트. 외부 링크·북마크 보존 | — | — | `src/app/[locale]/(public)/my-dog/page.tsx` |
| 견종 입력 | 완료 | 자유 입력 → canonical code 전환. `BreedCombobox` 검색 선택, `other`일 때만 원문을 `breedCustom`에 저장하고 나머지는 null로 정규화 | — | — | `src/components/dogs/BreedCombobox.tsx`, `lib/dogs/breeds.ts`, `lib/validation/dog.ts:18-50` |
| 반려견 선택 → 목록 반영 | 완료 | `?dogId=` / `?dogIds=`로 선택 전달. 남의 id·삭제된 id는 결과에서 조용히 빼고 URL에서도 정리 | — | — | `lib/dogs/selection.ts`, `places/page.tsx:50-67`, `PlacesClient.tsx:113` |
| 필터 기본값 연동 | 부분 완료 | **1마리 선택일 때만** `toDogSizeFilter`로 `dogSize` 초기값 지정. 2마리 이상이면 `all` | 다견 선택 시 크기 필터 규칙 미정 | P1 | `PlacesClient.tsx:57`, `lib/places/eligibility.ts:18` |
| 방문 가능 여부 단언 | 완료 | 카드·미리보기에 `EligibilityBanner`·`DogMatchBadge`. 다견은 `resolveWorstMatch`로 최악 판정 표시 | — | — | `lib/dogs/matching.ts:135,154`, `src/components/places/DogMatchBadge.tsx` |
| 맞춤 필터(불일치 장소 숨김) | 미구현 | `DOG_MATCH_FILTER_ENABLED=false`로 꺼 둠. 목록은 그대로 두고 배지만 표시 | 크기 정보 커버리지(전체 70%·주요 카테고리 60%) 확보 후 플래그 전환 | P1 | `lib/dogs/constants.ts:11`, `PlacesClient.tsx:139` |
| 폼 검증 | 완료 | zod + 필드별 오류 + `useFormStatus`. 견종 code·직접 입력 교차 검증(`superRefine`) | — | — | `src/components/dogs/DogForm.tsx`, `lib/validation/dog.ts` |
| 비회원 localStorage | 미구현 | 없음 | 기획서 v3에서 P2로 이동 (의도된 제외) | P2 | — |

---

## 14. 리뷰 · 신고

| 영역 | 상태 | 현재 구현 | 남은 작업 | 우선순위 | 근거 파일 |
|---|---|---|---|---|---|
| 구조화 리뷰 | 미구현 | 모델·Action·UI 전무 | 기획서 v3에서 P2로 이동 | P2 | — |
| 정보 오류 신고 | 미구현 | `REPORT_REASONS`·`REPORT_STATUS` 상수만 존재 | **D-09 확정**: 모델 + UI + 관리자 처리. 비로그인 접수 허용 + Rate Limit + 운영자 검토 후 반영 | P1 | `src/lib/constants.ts:37-42` |
| 재확인 트리거 | 미구현 | 없음 | 신고 누적은 재확인 **우선순위 상향** 신호로만 사용. 장소 상태 자동 변경 없음 (D-09) | P1 | — |

---

## 15. 관리자 기능

| 영역 | 상태 | 현재 구현 | 남은 작업 | 우선순위 | 근거 파일 |
|---|---|---|---|---|---|
| 장소 목록 | 완료 | 통계 6종(전체/공개/초안/숨김/조건미입력/미검증), 데스크톱 테이블 + 모바일 카드 | 상태 필터·페이지네이션 | P1 | `src/app/[locale]/(admin)/admin/places/page.tsx` |
| 장소 등록 | 완료 | 5섹션 단일 폼. 생성 시 `Place`+`Condition`+`Verification`을 트랜잭션으로 함께 기록 | — | — | `components/admin/PlaceForm.tsx`, `lib/places/create-place.ts` |
| 장소 수정 | 완료 | verification 선택적, 교차 필드 검증(`superRefine`) | — | — | `lib/places/update-place.ts`, `lib/validation/place.ts:82-136` |
| 지도 좌표 선택 | 완료 | `LocationPickerMap` 클릭 입력 | — | — | `components/admin/LocationPickerMap.tsx` |
| 입력 검증 | 완료 | 전화·인스타그램 정규식, URL, 좌표 범위(한국), **미래 검증일 KST 기준 거부** | — | — | `src/lib/validation/place.ts` |
| 운영시간 입력 | 미구현 | 폼에 없음 | 요일별 시작·종료 7행 + `hoursNote` 1줄 입력 추가 (D-04 확정) | P0 | `components/admin/PlaceForm.tsx` |
| 관리자 대시보드 | 미구현 | `/admin` 라우트 자체 없음 | 통계 화면 | P1 | — |
| 후보 목록 | 미구현 | 없음 | TourAPI 파이프라인 후속 | P1 | — |
| 신고 처리 | 미구현 | 없음 | 신고 기능 후속 | P1 | — |
| 폼 i18n | 미구현 | 옵션 라벨이 한국어 하드코딩 | i18n 적용 | P1 | `components/admin/PlaceForm.tsx:70-80` |

---

## 16. 다국어 (영어 · 한국어)

| 영역 | 상태 | 현재 구현 | 남은 작업 | 우선순위 | 근거 파일 |
|---|---|---|---|---|---|
| 로케일 라우팅 | 완료 | `next-intl` v4, `["en","ko"]`, default `en`, `localePrefix:"always"` | — | — | `src/i18n/routing.ts`, `src/middleware.ts` |
| 메시지 키 정합성 | 완료 | **422키, en/ko 완전 일치. 누락 0건** (2026-08-18 재확인) | — | — | `messages/en.json`, `messages/ko.json` |
| 장소명 표기 | 완료 | en: `nameEn ?? nameKr` primary / ko: `nameKr` primary | — | — | `src/lib/i18n/locale.ts:7-21` |
| 카테고리 라벨 | 완료 | en 3개 키 모두 `Attractions` — `home.categories.tabs.travel`·`places.filters.category.travel`·`places.card.category.travel`. enum `TRAVEL`·내부값 `travel`·관리자 폼 라벨은 명세서 v2 §7-1 지시대로 유지. ko `여행지`는 변경 대상 아님 | — | — | `messages/en.json` |
| 지도 문구 i18n | 미구현 | 영어 하드코딩 3건 | i18n화 | P0 | `MapPanel.tsx:240-267` |
| 날짜 로케일 표기 | 미구현 | 항상 `YYYY.MM.DD` | `DESIGN.md` §10 규칙 적용 | P1 | `lib/places/queries.ts:104-109` |
| 거리 표기 | 부분 완료 | m/km 구분·위치 없을 때 미표시는 준수 | 10 m 단위 반올림 미적용, ko 공백 없음 | P1 | `src/lib/geo/distance.ts:18-31` |
| 한글 폰트 | 미구현 | `Inter` latin subset only | 한글 서브셋 폰트 | P1 | `src/app/layout.tsx:8` |
| `Accept-Language` 협상 | 확인 필요 | next-intl 기본 동작에 의존, 명시 코드 없음 | 런타임 확인 | P1 | `src/i18n/routing.ts` |

---

## 17. 디자인 토큰

| 영역 | 상태 | 현재 구현 | 남은 작업 | 우선순위 | 근거 파일 |
|---|---|---|---|---|---|
| 컬러 토큰 | 완료 | `DESIGN.md` §4 팔레트 전체를 `globals.css`에 반영 + shadcn 변수 alias + Tailwind 매핑 | — | — | `src/app/globals.css:12-94`, `tailwind.config.ts:11-91` |
| z-index 토큰 | 완료 | 8단계 CSS 변수 + Tailwind zIndex 매핑. 임의 z-index 사용 없음 | — | — | `tailwind.config.ts:103-112` |
| 모션 토큰 | 완료 | `--duration-standard`, `--ease-standard` + Tailwind 매핑 | — | — | `globals.css:42-44` |
| `border-strong` 클래스 | 완료 | 4개 파일 6회를 전부 `border-border-strong`(= `--color-border-strong`)으로 교체. 잔여 무효 참조 0건. 같은 성격의 컨트롤에 이미 쓰이던 클래스라 선례와 일치한다 | — | — | `FilterModal.tsx`, `SortDropdown.tsx`, `FavoriteButton.tsx`, `HeroActions.tsx` |
| 다크모드 미사용 | 부분 완료 | `.dark{}` 블록 제거 완료. `next-themes`는 **`ui/sonner.tsx`가 실제로 import 중**이라 패키지만 지우면 빌드가 깨진다 | `sonner.tsx`의 `useTheme` 의존 제거 → 패키지 제거 | P0 | `src/components/ui/sonner.tsx:3`, `package.json:23` |
| radius 스케일 | 부분 완료 | `--radius: 0.625rem`(10px) + `rounded-xl`/`rounded-2xl` 혼용 — `DESIGN.md` §4 표(8/12/16px)와 불일치 | 문서·코드 정렬 | P1 | `globals.css:80`, `PlaceCard.tsx:54` |

---

## 18. 로딩 · 빈 상태 · 오류 상태

| 영역 | 상태 | 현재 구현 | 남은 작업 | 우선순위 | 근거 파일 |
|---|---|---|---|---|---|
| 라우트 레벨 경계 | 완료 (2026-09-07) | 8개 파일. 오류: `[locale]/error.tsx`(공개·관리자 공통) · `(admin)/admin/error.tsx` · `global-error.tsx`(루트 레이아웃 실패 시). 404: `[locale]/not-found.tsx`. 대기: `(public)/loading.tsx` · `places/loading.tsx` · `places/[id]/loading.tsx` · `(admin)/admin/loading.tsx` | — | — | `app-build-manifest.json`에 `/global-error`·`/[locale]/(admin)/admin/loading` 등록 확인 |
| 홈 카테고리 탭 | 완료 | 로딩 스켈레톤 / 빈 상태 / 오류 + 재시도 | — | — | `CategoryPlaceTabs.tsx:85-131` |
| 목록 빈 상태 | 완료 (2026-09-07) | 원인별 3종. ① 범위 밖 → `현재 대전 지역만 지원합니다` + `대전 장소 보기` ② 필터·검색·카테고리로 0건 → `해당 조건에 맞는 장소가 없습니다` + `필터 초기화` ③ 공개 장소 0건 → `아직 공개된 장소가 없습니다`(액션 없음). 우선순위는 `resolveListEmptyReason`이 정하고 테스트 3건이 고정한다. `필터 초기화`는 필터 4개뿐 아니라 카테고리·검색어까지 되돌린다 — 검색어를 남기면 눌러도 0건이라 헛돌게 된다 | — | — | `service-area.ts`, `PlacesClient.tsx`, `usePlaceListState.ts` |
| 위치 거부/차단 배너 | 완료 | 거부와 차단을 구분해 각각 다른 안내 | — | — | `PlacesClient.tsx:254-273`, `hooks/useUserLocationQuery.ts:40-48` |
| 즐겨찾기 빈 상태 | 완료 | — | — | — | `favorites/page.tsx:37-45` |
| 관리자 빈 상태 | 완료 | 장소 0건 시 추가 버튼 노출 | — | — | `admin/places/page.tsx:113-119` |
| 폼 제출 상태 | 완료 | `useFormStatus` + 필드별 인라인 오류 | — | — | `PlaceForm.tsx`, `DogProfileForm.tsx` |
| 지도 상태 | 부분 완료 | 로딩/오류/키없음 분기 존재 | i18n + 재시도 | P0 | `MapPanel.tsx:240-267` |

---

## 19. 접근성 · 반응형

| 영역 | 상태 | 현재 구현 | 남은 작업 | 우선순위 | 근거 파일 |
|---|---|---|---|---|---|
| 시맨틱 마크업 | 완료 | `header`/`nav`/`main`/`section`/`article`, 카드 선택은 투명 `<button>` + `sr-only` 라벨 | — | — | `PlaceCard.tsx:60-68`, `CategoryPlaceCard.tsx:93-99` |
| 색상 외 상태 전달 | 완료 | 모든 상태에 아이콘 + 텍스트 병기 | — | — | `PlaceConditionSummary.tsx:28-40`, `EligibilityBanner.tsx:14-25` |
| 포커스 표시 | 완료 | `focus-visible:ring` 일관 적용, `outline-none` 단독 사용 없음 | — | — | 전역 |
| 터치 타깃 | 완료 | 주요 인터랙션 `h-11`(44px) | — | — | `PlacesClient.tsx`, `PlacePreviewCard.tsx` |
| `prefers-reduced-motion` | 완료 | 시트 전환·스피너에 `motion-reduce:` 적용 | — | — | `PlacesClient.tsx:130,227` |
| Dialog·Sheet 접근성 | 완료 (2026-09-07) | `FilterModal`은 Radix `Dialog`로 교체. `DogFormDialog`·`DogsManager` 삭제 확인은 이미 Radix `Dialog`였고 진입/퇴장 모션을 추가했다. 탐색 화면의 Bottom Sheet는 상시 패널이라 모달로 만들지 않았다(D-13a) | — | — | `FilterModal.tsx`, `plans/006`·`007` |
| 드롭다운 접근성 | 미구현 | `aria-expanded`·listbox 역할 없음, `▲▼` 텍스트 아이콘 | Radix `dropdown-menu` 교체 | P1 | `SortDropdown.tsx:31-40` |
| Skip link | 미구현 | 없음 | 추가 | P1 | `src/app/layout.tsx` |
| 선택 결과 `aria-live` 고지 | 미구현 | 포커스 이동만 존재 | live region 추가 | P1 | `PlacePreviewCard.tsx:144-148` |
| 반응형 브레이크포인트 | 완료 | lg/xl 기준 3분할·오버레이·시트 전환. 모바일이 데스크톱 축소판이 아님 | — | — | `PlacesClient.tsx:119-360` |
| 대비비 실측 | 확인 필요 | 토큰은 정의됨. 실제 4.5:1 충족 여부 미측정 | 자동/수동 검사 | P1 | `globals.css` |

---

## 20. 품질 · 운영

| 영역 | 상태 | 현재 구현 | 남은 작업 | 우선순위 | 근거 파일 |
|---|---|---|---|---|---|
| 테스트 | 완료 | vitest + **24파일 450건**. 08-18 시점 미커버였던 장소 순수 함수가 채워졌다 — `eligibility` 28 · `filtering` 29 · `display` 5 · `place-list-params` 15 · `policy-*` 170 | 컴포넌트 렌더 테스트는 없음(jsdom·RTL 미도입, include가 `*.test.ts`뿐) — P2 | P1 | `vitest.config.ts`, `src/**/*.test.ts` |
| 오류 추적 | 미구현 | Sentry 미설치 | 도입 | P1 | `package.json` |
| 빌드·타입체크 검증 | 완료 | **2026-09-06 실행: `tsc --noEmit` 0오류 · `vitest run` 450/450 · `next build` 통과 · `next lint` 0건** | — | — | — |
| 미사용 코드 | 부분 완료 | `mock-places.ts`, `haversineDistance`, `formatWalkingTime`, `lib/result.ts` 참조 0건 | 정리 | P1 | grep 결과 |
| 문서 버전 관리 | 완료 | `docs/*.md`를 git 추적으로 전환하고 원본 PDF 2건 제거 (커밋 `df2ffb3`) | — | — | `git log` |
| 서비스 지역 제한 (대전 단독) | 완료 | 코드에 지역 개념 없음. 공개는 "검증 이력 + `visibility=VISIBLE`"로만 통제됨 | **D-08 확정**: 코드 변경 없이 **운영 규칙으로 강제**한다 — 운영자가 대전 장소만 검증·공개. 지역 필드는 2단계 확장 시 도입 | — | `prisma/schema.prisma`(지역 필드 없음), 기획서 v3 §9-5 |

---

## P0 목록 (MVP 출시 차단)

**2026-09-06 재대조.** 각 항목을 요구사항 원문(`개발명세서_v2` · `기획서_v3` · D-01~D-12)과 실제 코드·사용 경로·테스트로 대조했다.
파일 존재나 import 부재만으로 완료 판정하지 않고, 요구사항이 말하는 **동작**이 성립하는지를 근거로 적었다.

| 상태 | 개수 |
|---|---|
| 완료 | 16 |
| 부분 완료 | 0 |
| 미착수 | 4 |

| # | 항목 | 상태 | 근거 (2026-09-06 확인) | 남은 작업 |
|---|---|---|---|---|
| 1 | 공개 조건에 "검증 이력 존재" 추가 | **완료** (2026-09-06) | D-07이 지정한 4개 함수 전부 적용 — `getPlaces`·`getCategoryPlaces`는 공용 `PUBLIC_PLACE_WHERE`, `getPlaceById`는 `findUnique`가 관계 조건을 못 받아 조회한 `verifications`로 같은 판정, `getFavoritePlaces`는 중첩 `place` 조건. 관리자 조회(`getAdminPlaces`)는 의도적으로 제외 — 검증 전 후보를 못 보면 검증을 시작할 수 없다. 테스트 8건이 4개 조회의 `where`와 관리자 제외를 고정. 마이그레이션·임시 이력 생성 없음. 프로덕션 빌드에서 홈 4곳·목록 4곳으로 노출 변화 없음(대상 0건 사전 확인과 일치) | — |
| 2 | 8주 임계 폐기 → **90일 단일** `Recheck needed` | **완료** (2026-09-06) | 판정 로직은 통일됐다 — `RECHECK_AFTER_DAYS = 90` + `needsRecheck()` 하나로 모으고 `STALE_VERIFICATION_WEEKS`·`weeksSinceVerified`는 제거(잔여 참조 0건). 사용처 3곳(홈 카드·목록/미리보기 요약·미리보기 패널)이 같은 helper만 쓴다. 경과 일수는 `daysSinceVerified()`로 분리. 배지는 `Recheck needed`/`재확인 필요`, 확인일 표시는 유지. `recent` 30/90일 필터는 별개 기능이라 미변경. **경계 `>= 90일`은 사용자 확정** — `DESIGN.md` v1.2.1에서 §6·§7 표기를 통일해 충돌 해소. 테스트 11건이 89·90·91일 경계와 56일·확인일 누락·깨진 형식·미래 날짜를 고정. **사용처는 4곳** — 홈 카드·목록/미리보기 요약·미리보기 패널·상세 Verification Info가 전부 같은 helper만 쓴다 | — |
| 3 | 홈 장소 탐색 섹션 단일화 | **완료** (2026-09-06) | 제거 목록 5종 전부 삭제(`RecentPlacesSection`·`HomePlaceCard`·`getHomePlaces()`·`HomePlaceItem`·`home.recentPlaces` en/ko). 잔여 참조 0건. 브라우저에서 `/ko`·`/en` 홈이 카테고리 탭 1개 섹션만 렌더함을 확인 | — |
| 4 | 카테고리 라벨 `Attractions`로 변경 | **완료** (2026-09-06) | en 3개 키 모두 `Attractions`. `/en` 홈 탭과 `/en/places` 필터 칩에서 렌더 확인. enum `TRAVEL`·내부값 `travel`·`admin...category.TRAVEL`·ko `여행지` 미변경 | 카드 라벨(`places.card.category.travel`)은 DB에 TRAVEL 장소가 0건이라 화면 확인 못 함 — 미검증 |
| 5 | `loading.tsx`/`error.tsx`/`not-found.tsx` 전면 추가 | **완료** (2026-09-07) | 8개 파일이 공개·관리자 전 라우트를 덮는다. 09-06에 비어 있던 두 자리를 채웠다 — `(admin)/admin/loading.tsx`(목록·등록·수정 공통 스켈레톤, 권한 확인 중에도 뜬다)와 `global-error.tsx`. `global-error`는 루트 레이아웃을 **대체**하므로 `<html>`·`<body>`·전역 CSS를 직접 들고 오고, `NextIntlClientProvider`가 없어 문구를 기본 로케일(en)로 고정했다 — 여기서 번역을 부르면 오류 경계가 다시 터진다. 빌드 매니페스트 등록으로 확인했고 실제 렌더는 미검증 | — |
| 6 | 홈 오류 삼킴 제거 | **완료** | `page.tsx`에 `try/catch` 없음. 조회 실패가 `[locale]/error.tsx`로 전파돼 재시도 버튼 노출 | — |
| 7 | Bottom Sheet·FilterModal 접근성 | **완료** (2026-09-07, 모바일 실측 완료) | `FilterModal`을 Radix `Dialog`로 교체했다. 브라우저에서 확인 — 닫혔을 때 `[role="dialog"]` 0개, 열면 `role="dialog"`+`aria-labelledby`, focus가 다이얼로그 안으로 이동, 앱 루트에 `aria-hidden="true"`, 스크롤 잠금, ESC로 `data-state="closed"` 전환 후 언마운트. 모션은 계획 003의 값(250ms·진입/퇴장 커브 분리·reduced motion 제거)을 keyframes로 옮겨 유지했다. **Bottom Sheet에는 모달 시맨틱을 걸지 않았다** — 아래 D-13a | `aria-modal`은 Radix가 설정하지 않는다. 대신 바깥 콘텐츠에 `aria-hidden`을 걸어 같은 결과를 낸다 · **모바일(`innerWidth 604`) 실측 완료** — 시트 3단계 전환(peek→results→selected→ESC), 필터 닫힘 시 드로어 컨트롤 탭 순서 0개, 열림 시 tabbable 16개 전부 다이얼로그 내부, 지도 `Move to my location`·헤더 4개 링크 도달 가능 · reduced motion은 규칙·클래스 수준까지만 확인(OS 설정을 켤 수 없어 동작 관찰 불가) |
| 8 | 미리보기 Primary Action을 `상세 보기`로 반전 | **완료** (2026-09-06) | 조건부 `detailsVariant`를 제거해 `상세 보기`는 항상 primary, 길찾기는 `outline`. 두 분기 모두 primary가 정확히 하나다 — 위치가 있으면 [즐겨찾기][길찾기 outline][상세 primary], 없으면 길찾기 버튼을 렌더하지 않는다. `/ko`·`/en` 프로덕션 빌드에서 계산 스타일로 확인(길찾기 `rgb(255,255,255)`+테두리·외부 Maps 링크·`target=_blank`, 상세 `rgb(37,99,235)`·내부 `/{locale}/places/{id}` 링크). 문구·토큰 미변경 |
| 9 | 마커 선택 → 목록 카드 스크롤 동기화 | **완료** (2026-09-06) | 장소 **id**로 `<li>`를 잡는 ref 맵(언마운트 시 삭제) + `handleMarkerSelect`가 세운 플래그를 보고 `selectedPlaceId` 반영 후 `scrollIntoView({block:"nearest"})`. 인덱스를 쓰지 않아 정렬·필터가 바뀌어도 다른 장소를 가리키지 않고, 목록에서 걸러진 장소는 ref가 없어 무시된다. `prefers-reduced-motion`이면 `behavior:"auto"`. 실제 지도에서 마커 3개를 눌러 각각 몽베르트·화람·테스트 카페 카드로 스크롤됨을 확인했고, 카드 클릭과 첫 렌더에서는 스크롤 호출 0건 | 정렬·필터 변경 **후** 마커 재선택은 미검증(§미검증 항목) · 모바일 미검증 |
| 10 | 상세에 거리·길찾기·공유·즐겨찾기 액션 | 미착수 | `places/[id]/page.tsx`에 `FavoriteButton`·공유·길찾기·거리 표시 전부 없음 | 액션 영역 신설 |
| 11 | 운영시간 저장·입력·표시 (`hours`+`hoursNote`) | 미착수 | `schema.prisma`·`types/place.ts` 어디에도 `hours` 없음 | D-04 구조로 전 계층 추가 (마이그레이션 필요 — 사용자 승인 대상) |
| 12 | 예방접종 `UNKNOWN` 행 숨김 | **완료** | `display.ts` `showsVaccinationRow()`가 `required`/`not_required`만 통과. `BeforeYouGoCard.tsx:127`에서 실제 사용. `display.test.ts` 3건이 `unknown`·`null` 미표시를 고정 | — |
| 13 | `Ask the store in Korean` 렌더 분기 제거(코드 보존) | **완료** | 상세 페이지에 import·렌더 없음. `KoreanInquiryBox.tsx`와 메시지 키는 보존. `korean-inquiry.test.ts`가 **비노출과 보존을 동시에** 고정 | — |
| 14 | 후보 Import 로컬 스크립트 | 미착수 | `scripts/` 디렉터리 없음. `package.json`에 import 스크립트 없음 | D-05·D-06 형태로 신규 |
| 15 | `auth.ts`의 `/en/login` 하드코딩 제거 | **완료** (2026-09-06) | NextAuth 설정은 요청별로 달라질 수 없으므로 `pages`를 `/login`(locale 없음)으로 두고 미들웨어에 협상을 맡겼다. 프로덕션 빌드에서 확인: `Accept-Language: ko` → `/ko/login?error=...`, `en` → `/en/login?error=...`, `NEXT_LOCALE=ko` 쿠키가 `Accept-Language: en`보다 우선, 헤더 없으면 `DEFAULT_LOCALE=en`. 보호 라우트 6개가 각자 locale의 로그인으로 가며 `callbackUrl`을 유지(`/ko/favorites` → `/ko/login?callbackUrl=%2Fko%2Ffavorites`), `/ko` 응답에 `/en/login` 흔적 0건, 리다이렉트 루프 없음. `FavoriteButton`은 `callbackUrl`에 쿼리를 포함하도록 고쳐 목록 필터가 로그인 후에도 남는다 | 실제 Google OAuth 왕복은 미검증(§미검증 항목) |
| 16 | 필터·정렬·카테고리 URL 반영 | **완료** (2026-09-06) | `place-list-params.ts`가 파싱·직렬화를 맡고 `usePlaceListState`가 `useSearchParams`에서 상태를 파생한다(state 복사 없음 → 양방향 동기화 자체가 불필요). 카테고리·정렬·필터는 `pushState`, 검색어는 300ms 디바운스 `replaceState`. 잘못된 값·중복 파라미터·삭제된 `exclude-unknown`은 기본값으로 흡수. 초기화는 필터 4개만 지운다. 브라우저에서 직접 접속·새로고침·뒤로가기·초기화 전부 확인, 필터 변경 시 서버 요청 0건 | — |
| 17 | `border-strong` 무효 클래스 수정 | **완료** (2026-09-06) | 6곳 전부 `border-border-strong`으로 교체. 토큰 선택 근거는 이름 유사성이 아니라 (a) `tailwind.config.ts`가 `border.strong`을 `--color-border-strong`으로 매핑한다는 점과 (b) 같은 성격의 컨트롤(칩·아웃라인 버튼·입력)에서 이미 `border-border-strong`을 쓰고 있다는 선례다. 잔여 무효 참조 0건(`bg-border-strong` 1곳은 유효 클래스라 제외). `/ko`·`/en`의 히어로 입력·정렬 드롭다운·필터 칩·초기화 버튼에서 테두리가 보이고 이상 없음 | — |
| 18 | 지도 문구 i18n + 재시도 / `next-themes` 제거 | 미착수 | `MapPanel.tsx:240-267` 영어 하드코딩 3건(`no-key`·`error`·`loading`), 재시도 버튼 없음. `ui/sonner.tsx:3`이 `next-themes`의 `useTheme` import 중 | 문구 i18n화 + 재시도 추가 · `sonner.tsx` 의존 해제 후 패키지 제거 |
| 19 | 긍정 조건 필터에서 `UNKNOWN` 제외 + `exclude-unknown` 제거 | **완료** (2026-09-06) | `INDOOR_FILTER_MATCH`로 필터값별 확정값 하나만 인정 → 미확인·값 없음이 자연히 빠진다. `dogSize`는 D-03 예외라 그대로. `exclude-unknown`을 타입·필터 분기·모달 옵션·en/ko 키에서 제거(잔여 참조 0건). 테스트 29건이 세 규칙(긍정 조건 제외 / 크기 예외 / 필터 미선택)을 각각 고정. 브라우저에서 `carrier=not-required`가 미확인 2곳을 실제로 제외함을 확인 | — |
| 20 | 서비스 범위 안내 (대전 중심·범위 배너·빈 상태 2종) | **완료** (2026-09-07) | D-11 네 항목을 모두 구현했다. 임계값은 명세서 권장 50km, 중심은 대전시청, fallback zoom 12. **판정 기준은 명세서 §7-2의 "공개 장소 최단 거리"가 아니라 중심 기준 거리다**(아래 D-11a). 판정은 순수 함수 2개(`isOutsideServiceArea`·`resolveListEmptyReason`)로 빼고 테스트 9건이 경계(정확히 50km는 범위 안)·위치 미상·대전 시내·서울/부산·빈 상태 우선순위를 고정한다. 관리자 좌표 선택 지도(`LocationPickerMap`)의 fallback도 같은 상수를 쓴다 — 프로젝트에 서울 좌표 상수가 남아 있지 않다. 프로덕션 빌드에서 4개 분기를 HTML로 확인했고(위치 없음/대전/서울 140km/부산 200km), 브라우저에서 `대전 장소 보기`를 눌러 주소의 `lat`·`lng`·`sort=distance`가 사라지고 배너·정렬(`거리순`→`최근 확인순`)·거리 표기·지도 중심이 함께 되돌아가는 것을 확인했다 | 모바일 시트 폭에서의 배너 노출은 미검증 |

### 판정 근거에 대한 주의

- **#5**는 2026-09-07에 완료됐다. 09-06 시점에 `부분 완료`였던 이유(관리자 `loading.tsx` 부재 · `global-error.tsx` 부재)를 두 파일로 해소했다. 다만 판정 근거는 빌드 매니페스트 등록까지이고, 두 화면이 실제로 뜨는 모습은 보지 못했다 — 대기 화면은 스쳐 지나가고, `global-error`는 루트 레이아웃을 일부러 깨뜨려야 재현된다.
- **#13**은 파일이 남아 있다는 이유로 미착수로 보지 않았다. 요구사항이 "렌더 분기 제거 + **코드·메시지 키 보존**"이므로 파일 존재가 오히려 요구사항의 일부다.
- **#16**은 2026-09-06에 완료됐다. 판정 기준은 "새 주소로 직접 들어갔을 때 같은 화면이 나오는가"였고, 카테고리·필터·정렬·검색어 네 가지 모두 프로덕션 빌드에서 확인했다.

### 미검증 항목

브라우저·외부 서비스가 필요해 이번 재대조에서 **동작을 확인하지 못한** 항목:

| 항목 | 미검증 사유 |
|---|---|
| #11 운영시간 · #14 Import 스크립트 | 코드가 아예 없어 대조 대상 자체가 부재 (미착수 판정은 확실) |
| #18 `next-themes` 제거 후 빌드 영향 | 제거를 시도하지 않아 실제 파급 미확인 |
| #20 모바일 시트에서의 범위 배너 | 데스크톱 폭에서만 확인. **팝업 우회 경로**(위 #9 항목 참조)로 재검증 가능하나 아직 하지 않았다 |
| #20 공개 장소 0건일 때의 대전 fallback 중심 | 좌표 있는 장소가 4건이라 `SERVICE_AREA_CENTER`가 초기 중심으로 쓰이는 경로를 화면으로 재현하지 못했다. 위치를 껐을 때의 되돌리기 경로로만 확인 |
| #4 카드 카테고리 라벨 | 공개 장소 4건이 전부 `CAFE` — `TRAVEL` 카드가 없어 라벨 렌더 미확인 |
| #9 정렬·필터 변경 후 마커 재선택 | 세션 도중 Google 지도가 초기화되지 않기 시작해(`.gm-style` 자체가 생성되지 않음) 실제 마커를 더 누를 수 없었다. 지도 코드·설정은 이번에 건드리지 않았다. 변경 전 상태에서는 마커 3개 클릭이 모두 정상 동작했다 |
| #9 모바일 Bottom Sheet 동작 | `resize_window`가 성공을 반환해도 `window.innerWidth`가 2160에서 바뀌지 않는다(창이 최대화 상태 + 페이지 줌 67%). **2026-09-07 우회 경로 확보** — `window.open(url, '_blank', 'width=390,height=844')`로 같은 출처 팝업을 열면 `innerWidth 604`(`sm`·`lg` 모두 false)가 되어 모바일 분기를 실제로 검증할 수 있다. 이 방식으로 P0 #7 범위(시트 3단계 전환·필터 드로어·키보드 도달성)는 검증했다. 마커 선택 → 카드 스크롤(#9)은 아직 미검증 |
| #8 위치 없는 장소의 액션 분기 | 공개 장소 4건 모두 좌표가 있어 `directionsUrl == null` 분기를 화면으로 재현하지 못했다. variant가 조건부가 아니게 되어 두 분기 모두 primary 1개가 구조적으로 보장된다(코드 확인) |
| #1 검증 이력 없는 장소가 실제로 감춰지는지 (화면) | 해당 장소가 DB에 0건이고, 화면 확인을 위해 운영 데이터를 만들지 않았다. mock 기반 테스트 8건으로만 확인 |
| #2 89/90/91일 경계 (화면) | 공개 장소 4건의 경과일이 83·100·105·106일이라 경계 사례가 없다. 고정 시각 단위 테스트로만 확인. 실데이터로는 83일 1건이 배지 없음(구 56일 규칙이면 떴을 것), 나머지 3건이 배지 표시로 규칙 전환을 확인 |
| #19 실내 필터의 미확인 제외 (화면) | 공개 장소 4건의 `indoor`가 전부 `allowed` — `unknown`인 장소가 없어 화면으로는 재현 불가. 단위 테스트로만 확인. 같은 규칙을 쓰는 `carrier` 쪽은 화면에서 확인됨 |
| #16 모바일 Bottom Sheet에서의 필터·URL | 데스크톱 폭에서만 확인. 창 리사이즈가 뷰포트에 반영되지 않아 시트 레이아웃 미확인 |
| #15 Google OAuth 왕복 후 복귀 | 실제 로그인을 수행하지 않았다. 리다이렉트 **목적지**(locale·`callbackUrl`)만 HTTP로 확인했고, 인증 성공 후 `callbackUrl`로 실제 복귀하는지는 미확인 |
| #15 `FavoriteButton`의 쿼리 포함 `callbackUrl` | 브라우저 세션이 로그인 상태라 비로그인 분기가 실행되지 않는다. 코드로만 확인 |
| 지도 `For development purposes only` 경고 | **원인 미확인.** 이전 보고에서 'API 키 도메인 제한'으로 단정했으나 근거가 없었다. 이번 작업에서 지도 설정은 변경하지 않았다 |
| 홈 모바일 배치 | 브라우저 창 리사이즈가 뷰포트에 반영되지 않아 확인 실패. 이번 변경은 섹션 삭제뿐이라 잔존 섹션의 반응형 클래스는 무변경 |
| PostGIS extension (§9) | 배포 DB 조회 필요 |

---

## 확인 필요 목록

| 항목 | 확인 방법 | 관련 | 결과 |
|---|---|---|---|
| 검증 이력 없는 공개 장소 수 | DB 읽기 전용 조회 | P0 #1 (D-07) | ✅ **2026-08-13 확인 — 0건.** 조회 조건 추가만으로 완결 |
| PostGIS extension 활성화 여부 | 배포 DB 조회 | 전체 | ✅ 사실상 확인 — 좌표·거리 쿼리 정상 반환 |
| `next build` / `tsc --noEmit` 통과 여부 | 로컬 실행 | 전체 | ✅ **2026-08-18 전부 통과** (lint·test 포함) |
| Google Maps API 키 도메인 제한 설정 | Google Cloud Console | 보안 | 미확인 |
| 지도 `Google 지도를 제대로 로드할 수 없습니다` 오버레이 | Google Cloud Console (키 제한·허용 referer) | 지도 | **2026-09-07 재현.** 타일은 뜨지만 오류 오버레이가 함께 뜬다. 이번 작업과 무관 — 중심 좌표만 바꿨다. **단서**: 지오코딩 시도에서 `API keys with referer restrictions cannot be used with this API` 응답을 받아 두 키 모두 referer 제한이 걸려 있음이 확인됐다. `localhost`가 허용 목록에 없으면 같은 증상이 난다. 원인 단정은 아직 못 한다 |
| `데오` 장소 좌표 | DB 읽기 + 지오코딩 대조 | 데이터 | ❌ **2026-09-07 확정 — 좌표가 틀렸다.** `lat=35, lng=124`로 정확히 정수이며 스키마 유효범위(위도 33~43·경도 124~132)의 하한값이다. 실제 지점은 서해 바다, 대전시청에서 341km. 다만 주소 `대전서구도안북로93번길`에 **건물번호가 없어** 검증된 좌표를 만들 수 없다. **수정 보류 — 완전한 주소 필요** |
| `테스트 카페` 공개 여부 | 운영 판단 | 데이터 | ⚠️ **2026-09-07 발견.** 좌표가 대전시청과 정확히 일치(0.0km)하고 주소 `은계 중앙로 115`에 시·구가 없다. 이름 그대로 테스트 데이터로 보이는데 `VISIBLE`로 공개 중이다 |
| `몽베르트`·`화람` 좌표 | OSM Nominatim 교차 확인 | 데이터 | ✅ **2026-09-07 확인 — 이상 없음.** 몽베르트(36.3484, 127.4553)는 동구 충정로 구간 안, 화람(36.3358, 127.3367)은 유성구 원신흥동 안. 지번 단위 정밀도는 확인 못 했으나 틀렸다고 볼 근거가 없어 수정하지 않았다 |
| 색 대비비 4.5:1 충족 여부 | axe / Lighthouse 실측 | P1 접근성 | 미확인 |
| `Accept-Language` 기반 로케일 협상 동작 | 런타임 확인 | P1 i18n | 미확인 |
| `docs/*.md` git 추적 여부 결정 | 사용자 결정 | 문서 관리 | ✅ **추적하기로 결정** — 커밋 `df2ffb3` |

### DB 실측 (2026-08-13, 읽기 전용)

| 항목 | 값 |
|---|---|
| 전체 장소 | 4건 (전부 `VISIBLE`. `DRAFT`·`HIDDEN` 0건) |
| 검증 이력 없는 `VISIBLE` | **0건** |
| 조건(`PlaceCondition`) 없는 `VISIBLE` | 0건 |
| 90일 초과 `VISIBLE` | 0건 |

> 공개 장소가 4곳뿐이다. 기획서 v3의 1단계 목표(대전 30~50곳)까지 **데이터 확보가 가장 큰 잔여 작업**이며, 이는 코드가 아니라 운영 작업이다.

---

## 확정된 보완 결정

| ID | 결정 | 근거 | 날짜 |
|---|---|---|---|
| D-11a | 서비스 범위 판정 기준을 **공개 장소 최단 거리 → `SERVICE_AREA_CENTER` 기준 거리**로 바꾼다 | 명세서 v2 §7-2의 원안은 대전 밖 장소가 실수로 공개되면 그 장소를 기준으로 서비스 범위가 조용히 넓어진다. 실제로 공개 장소 `데오`가 대전시청에서 341km 떨어진 좌표를 갖고 있었다. 범위는 데이터 상태와 무관하게 고정돼야 한다 | 2026-09-07 (사용자 확정) |
| D-13a | 탐색 화면의 Bottom Sheet에는 `role="dialog"`·`aria-modal`·focus trap을 **걸지 않는다** | 기획서 v3 §6-2의 시트는 1단계(결과 개수)가 항상 떠 있고 지도가 배경에서 조작되는 **닫히지 않는 패널**이다. 모달 시맨틱을 걸면 지도·헤더·`내 위치` 버튼이 키보드와 스크린리더에서 잠긴다. 명세(T-06)를 글자대로 따르면 접근성이 나빠진다. 대신 3단계에서 벗어나는 ESC와 토글 `aria-expanded`를 넣었다. `DESIGN.md` §11은 **모달로 뜨는** 시트(`DogFormDialog`)에는 그대로 적용된다 | 2026-09-07 |
| D-15 | 설문 응답의 `VerificationMethod`는 기존 `DM`을 재사용하지 않고 **`SURVEY`를 새로 추가**한다 | 매장이 직접 답한 것과 운영자가 DM으로 확인한 것은 출처가 다르다. 나중에 바꾸려면 데이터 마이그레이션이 필요하므로 처음부터 나눈다 | 2026-09-07 (사용자 확정) · **enum 마이그레이션 미실행** |

> **명세서 반영 필요**
> - `개발명세서_v2` §7-2가 아직 "공개 장소 중 최단 거리"로 적혀 있다. D-11a로 대체됐다.
> - `개발명세서_v2` T-06과 §11이 Bottom Sheet에도 focus trap·`role="dialog"`를 요구한다. D-13a로 대체됐다.

---

## 미확정 항목

P0을 차단하는 항목은 없다. 아래 둘은 해당 기능 착수 시점에 결정한다.

| ID | 항목 | 시점 |
|---|---|---|
| D-13 | 신고 Rate Limit 임계값과 식별 기준(IP / 쿠키 / 세션) | P1 신고 기능(T-21) 착수 시 |
| D-14 | 2단계 확장 시 지역 필드 설계 | 서울 확장 착수 시 |

구현 중 정할 소소한 값 (별도 결정 항목 아님): 서비스 범위 밖 판정 임계 거리(기본 50 km 권장), 대전 기본 중심 좌표와 초기 zoom — 모두 P0 #20에서 처리.

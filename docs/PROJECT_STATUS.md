# Paw Spot Global — 구현 현황

> **이 문서의 목적**: 기획이 아니라 **실제 개발 진행 상황 추적**이다.
> 모든 상태는 코드 확인에 근거한다. 확인하지 못한 것은 `확인 필요`로 남기고 추측하지 않는다.
>
> **기준일**: 2026-08-13 (D-01~D-10 결정 반영) · **브랜치**: `chore/project-foundation`
> **기획 기준**: `docs/Paw_Spot_Global_기획서_v3.md` · **구현 기준**: `docs/Paw_Spot_Global_개발명세서_v2.md` · **디자인 기준**: `DESIGN.md`

**상태 값**: `완료` / `부분 완료` / `미구현` / `확인 필요`

---

## 요약

아래 20개 절의 상태 행 **156건** 집계.

| 상태 | 개수 |
|---|---|
| 완료 | 73 |
| 부분 완료 | 16 |
| 미구현 | 61 |
| 확인 필요 | 6 |

**MVP 출시를 차단하는 P0 항목: 20개 — 전부 즉시 착수 가능** (§P0 목록 참조)

주의: "완료" 74건은 **세부 항목 단위** 집계다. 화면·기능 단위로 보면 탐색 화면의 레이아웃·동기화·판정 로직은 완성도가 높은 반면, 상세 페이지·데이터 파이프라인·라우트 상태 처리는 큰 폭으로 비어 있다. 절별 분포를 함께 볼 것.

D-01~D-10 결정으로 이전에 `확인 필요`였던 "필터 `unknown` 처리 비대칭"이 `미구현`(수정 대상)으로 확정되었고, 선행 결정 대기 상태였던 4개 항목(신선도 임계 · 운영시간 구조 · 후보 저장 방식 · Import 실행 형태)이 착수 가능해졌다.

---

## 1. 홈

| 영역 | 상태 | 현재 구현 | 남은 작업 | 우선순위 | 근거 파일 |
|---|---|---|---|---|---|
| 홈 카테고리 탭 | 완료 | Radix Tabs 4탭(all/restaurant/cafe/travel), 탭별 지연 로딩 + 클라이언트 캐시 + race guard | 라벨 `Travel Spots` → `Attractions` | P0 | `src/components/home/CategoryPlaceTabs.tsx`, `src/components/home/CategorySection.tsx` |
| 카테고리별 장소 조회 | 완료 | `getCategoryPlaces(category)` — DB에서 카테고리 필터 + `take 8` + `count` 동시 반환. Server Action `fetchCategoryPlaces`로 노출 | 공개 조건에 "검증 이력 존재" 추가 | P0 | `src/lib/places/queries.ts:290-312`, `src/lib/places/actions.ts` |
| 홈 카드 즐겨찾기 | 완료 | 서버에서 `getFavoritePlaceIds` 조회 → `CategoryPlaceCard`가 링크 오버레이 위에 `FavoriteButton` 배치 | — | — | `src/components/home/CategoryPlaceCard.tsx:160-167` |
| 홈 로딩·빈·오류 상태 | 완료 | 탭 전환 시 직전 카드 수만큼 스켈레톤, `empty` 문구, 오류 + `Try again` 버튼 | — | — | `src/components/home/CategoryPlaceTabs.tsx:85-131` |
| 홈 장소 섹션 단일화 | 미구현 | `CategoryPlaceTabs`(8개)와 `RecentPlacesSection`(6개)이 같은 데이터를 중복 노출 | `RecentPlacesSection`·`HomePlaceCard`·`getHomePlaces()`·`HomePlaceItem`·`home.recentPlaces` 키 제거 | P0 | `src/app/[locale]/(public)/page.tsx:20-28`, `src/components/home/RecentPlacesSection.tsx` |
| 홈 데이터 범위 일관성 | 미구현 | `getCategoryPlaces`는 ETC 제외, `getHomePlaces`는 ETC 포함 → 같은 화면에서 범위 불일치 | 위 단일화로 함께 해소 | P0 | `src/lib/places/queries.ts:236-262` vs `:290-299` |
| 홈 오류 처리 | 미구현 | `page.tsx`가 `try/catch`로 오류를 삼키고 빈 배열 렌더 → 실패와 "데이터 없음" 구분 불가 | `error.tsx` 추가 + 삼킴 제거 | P0 | `src/app/[locale]/(public)/page.tsx:14-18` |
| Hero 검색 · Near me | 부분 완료 | 검색 폼(`/places?q=`) + Geolocation "Near me" 동작 | 일러스트 플레이스홀더 박스 대체 | P1 | `src/components/home/HeroSection.tsx:24-32`, `HeroActions.tsx` |
| 안내 섹션 | 완료 | 확인 항목 5종(실내·이동장·크기·입장조건·확인일) | — | — | `src/components/home/InfoSection.tsx` |

---

## 2. 장소 목록 · 카드 · 필터 · 정렬

| 영역 | 상태 | 현재 구현 | 남은 작업 | 우선순위 | 근거 파일 |
|---|---|---|---|---|---|
| 장소 카드 | 완료 | 이미지 없는 밀도형 카드. 장소명·거리·카테고리·주소·방문가능배너·조건 3개·확인일. `min-h-14`로 높이 고정 | — | — | `src/components/places/PlaceCard.tsx`, `PlaceConditionSummary.tsx` |
| 방문 가능 여부 판정 | 완료 | `eligibility.ts`가 조건 해석의 단일 출처. `unknown`/`null`을 허용 조건에 넣지 않음. 핵심 3조건 미확인 시 `confirm` 상태 | — | — | `src/lib/places/eligibility.ts` |
| 조건 미확인 표시 | 완료 | `Needs confirmation` / `Indoor unconfirmed` / `Not checked yet` 문구 | — | — | `messages/en.json` `places.card.*`, `places.preview.status.confirm` |
| 필터 | 부분 완료 | 우측 Drawer. 실내 5택 / 이동장 3택 / 크기 4택 / 신선도 30·90일 | focus trap·ESC·`role="dialog"` 없음 / URL 미반영 | P0 | `src/components/places/FilterModal.tsx` |
| 정렬 | 부분 완료 | 4종(거리·최근확인·실내우선·이동장불필요). 위치 없으면 거리순 `disabled` | 접근성(`aria-expanded`, listbox) / Radix 교체 / URL 미반영 | P1 | `src/components/places/SortDropdown.tsx` |
| 필터·정렬 URL 반영 | 미구현 | 초기값만 `searchParams`에서 읽고 이후는 `useState`. `lat`/`lng`/`sort`만 URL 갱신 | 필터·정렬·카테고리·검색어를 URL에 반영 | P0 | `src/app/[locale]/(public)/places/PlacesClient.tsx:37-91`, `hooks/usePlaceListState.ts` |
| 텍스트 검색 | 완료 | `q` 파라미터 + 실시간 클라이언트 필터(nameKr/nameEn/address) | — | — | `src/lib/places/filtering.ts:37-43` |
| 서버 페이징 | 미구현 | `findPlaces()`가 `take` 없이 공개 장소 전량 로드 | MVP는 임시 허용(기획서 v3 §6-2). 안전 상한 가드 권장, 전국 확장 전 커서 페이징 필수 | P2 | `src/lib/places/queries.ts:146-153` |
| 반경 / Bounds 검색 | 미구현 | 반경 개념 없음. 전량에 `ST_Distance` 계산 | 전국 확장 선행 조건 | P2 | `src/lib/places/queries.ts:162-189` |
| 필터 `unknown` 처리 | 미구현 | `indoor` 필터는 미확인 통과, `carrier` 필터는 미확인 제외 — 규칙 비대칭 | **D-03·D-12 확정**: 긍정 조건 필터에서 `UNKNOWN`/`null` 제외(`indoor`를 `carrier` 규칙에 맞춤, `dogSize`는 현행 유지). **`exclude-unknown` 옵션 제거** — 타입·필터 분기·모달 옵션·i18n 키(en/ko) 동시 정리. 전역 토글은 MVP 미포함 | P0 | `src/lib/places/filtering.ts:45-88`, `src/types/place.ts:6`, `FilterModal.tsx:38-44` |
| 목록 로딩·오류 상태 | 미구현 | 빈 상태만 존재 | `loading.tsx` / `error.tsx` | P0 | `find src/app -name "loading.tsx"` → 0건 |

---

## 3. 지도 · 목록 · 미리보기 연동

| 영역 | 상태 | 현재 구현 | 남은 작업 | 우선순위 | 근거 파일 |
|---|---|---|---|---|---|
| 데스크톱 3분할 | 완료 | xl≥1280 3분할(목록 340 / 미리보기 380 / 지도), lg 1024–1279는 지도 위 오버레이(356px 오프셋, 360px) | — | — | `src/app/[locale]/(public)/places/PlacesClient.tsx:329-345` |
| 미선택 시 지도 확장 | 완료 | 미선택이면 미리보기 컬럼 `xl:w-0`으로 접히고 지도가 넓어짐. `duration-standard` 트랜지션 | — | — | 같은 파일 `:336-342` |
| 지도 재마운트 방지 | 완료 | `apiKey`에만 의존해 1회 초기화. 선택/hover 변경 시 `setIcon`/`setZIndex`만 갱신 | — | — | `src/components/places/MapPanel.tsx:111-188` |
| 카드 hover → 마커 | 완료 | `hoveredPlaceId` 공유, 마커 색·크기·zIndex 변경 | — | — | `PlacesClient.tsx:303-318`, `MapPanel.tsx:181-188` |
| 카드 선택 → 미리보기 + 마커 | 완료 | `selectedPlaceId` 공유, 지도 `panTo` | — | — | `MapPanel.tsx:226-232` |
| **마커 선택 → 카드 스크롤** | 미구현 | 마커 클릭 시 미리보기는 열리나 목록에서 해당 카드로 스크롤하지 않음 | `scrollIntoView` 동기화 | P0 | `PlacesClient.tsx:301-326` |
| 사용자 위치 마커 | 완료 | 장소 마커와 분리 관리, 위치 변경 시에만 `panTo` | — | — | `MapPanel.tsx:191-238` |
| 지도 오류·로딩 문구 | 부분 완료 | `no-key` / `error` / `loading` 3상태 분기 존재 | 문구가 영어 하드코딩, 재시도 수단 없음 | P0 | `MapPanel.tsx:240-267` |
| 마커 API | 부분 완료 | `google.maps.Marker`(deprecated) 사용. `importLibrary("marker")` 호출하나 결과 미사용 | `AdvancedMarkerElement` 마이그레이션 | P2 | `MapPanel.tsx:121-122,164` |
| Google Maps 키 제한 | 확인 필요 | 코드에서 확인 불가 (콘솔 설정 사항) | Referer 제한 설정 확인 | P1 | — |
| 지도 기본 중심 | 미구현 | 중심 결정 순서는 `사용자 위치 → 선택 장소 → 목록 첫 장소 → SEOUL_CITY_HALL`. 최종 fallback은 **공개 장소 0건일 때만** 적용됨 | **D-11 확정**: 최종 fallback을 대전 좌표로 교체. 위치 권한 없을 때 대전 지도 표시 | P0 | `src/components/places/MapPanel.tsx:19,63-76` |
| 서비스 범위 안내 | 미구현 | 없음 | **D-11 확정**: 초기 범위(대전) 배너 추가. 위치가 범위 밖이면 `현재 대전 지역만 지원합니다` + `대전 장소 보기` 버튼. 범위 판정은 공개 장소 최단 거리 기준(지역 필드 없이) | P0 | 개발명세서 v2 §7-2 |

---

## 4. 모바일 Bottom Sheet

| 영역 | 상태 | 현재 구현 | 남은 작업 | 우선순위 | 근거 파일 |
|---|---|---|---|---|---|
| 3단계 시트 | 완료 | `peek`(h-24) / `results`(75vh) / `selected`(h-72). 선택 상태에서 **파생**하므로 요약을 닫으면 직전 단계로 복귀 | — | — | `PlacesClient.tsx:28-35,102-106,125-167` |
| 목록 ↔ 지도 전환 | 완료 | 단일 토글 버튼(`Show list`/`Show map`). 전환 중 필터·선택 상태 유지 | — | — | `PlacesClient.tsx:150-161` |
| 시트 전환 모션 | 완료 | `transition-[height] duration-300` + `motion-reduce:transition-none` | — | — | `PlacesClient.tsx:129-131` |
| 시트 접근성 | 미구현 | focus trap 없음, ESC 닫기 없음, `role="dialog"`/`aria-modal` 없음 | `DESIGN.md` §11 준수. `components/ui/sheet.tsx`(Radix) 활용 가능 | P0 | `PlacesClient.tsx:125-133`, 미사용 `src/components/ui/sheet.tsx` |
| Safe area | 완료 | `pb-[env(safe-area-inset-bottom)]` | — | — | `PlacesClient.tsx:128` |

---

## 5. 선택 장소 미리보기 패널

| 영역 | 상태 | 현재 구현 | 남은 작업 | 우선순위 | 근거 파일 |
|---|---|---|---|---|---|
| 패널 구조 | 완료 | header(고정) / body(스크롤) / footer(고정) 3영역 | — | — | `src/components/places/PlacePreviewCard.tsx:198-322` |
| 카드보다 많은 정보 | 완료 | 전체 주소, 목줄·입마개 포함 조건 전체, 확인 방법, 주의사항(3줄 클램프 + 더보기) | — | — | 같은 파일 `:83-130,264-300` |
| 이미지·운영시간·연락처 제외 | 완료 | `DESIGN.md` §6 준수 | — | — | 같은 파일 전체 |
| 선택 변경 시 포커스 이동 | 완료 | `headingRef.focus()` on `place.id` 변경 | `aria-live` 고지 추가 | P1 | 같은 파일 `:144-148` |
| **Primary Action** | 미구현 | 길찾기가 `default`(파랑), 상세 보기가 `outline` — 기획서 v3 §6-3과 반대 | `상세 보기`를 Primary로, 길찾기를 Secondary로 반전 | P0 | 같은 파일 `:193,311-321` |
| 위치 없을 때 액션 생략 | 완료 | `directionsUrl`이 없으면 길찾기 버튼 자체를 렌더하지 않음 | — | — | 같은 파일 `:188-191,311` |

---

## 6. 장소 상세 페이지

| 영역 | 상태 | 현재 구현 | 남은 작업 | 우선순위 | 근거 파일 |
|---|---|---|---|---|---|
| Before You Go | 완료 | 실내·이동장·최대크기·목줄·입마개·예방접종 6행 + 주의사항 경고박스 + 준비물 + 견종 제한 | — | — | `src/components/places/BeforeYouGoCard.tsx` |
| 예방접종 조건부 숨김 | 미구현 | `UNKNOWN`도 `Check with store`로 항상 표시 | `unknown`/`null`이면 행 미렌더 | P0 | `BeforeYouGoCard.tsx:77-84` |
| 검증 정보 표시 | 완료 | 확인일 · 확인 방법 · 메모. 없으면 `notVerified` 문구 | 표시 순서를 `DESIGN.md` §6에 맞춤 | P1 | `src/app/[locale]/(public)/places/[id]/page.tsx:188-227` |
| 디스클레이머 | 부분 완료 | 1문장(`Store policies may change…`) | 기획서 v3 §13-1 전문(확인일·확인방법 포함)으로 확장 | P1 | `messages/en.json` `places.detail.disclaimer` |
| 연락처 | 완료 | 전화(`tel:`) · 웹사이트 · 인스타그램 · Google Maps 링크. 값 없으면 행 생략 | — | — | `places/[id]/page.tsx:129-186` |
| 거리 표시 | 미구현 | 상세에 거리 없음 | `DESIGN.md` §6 표시 순서 2번 | P0 | 같은 파일 |
| 길찾기 · 공유 · 즐겨찾기 액션 | 미구현 | 버튼 없음. Google Maps는 본문 텍스트 링크 1개 | 액션 영역 신설 | P0 | 같은 파일 `:172-184` |
| 운영시간 | 미구현 | Prisma 필드·타입·폼·UI 전 계층 없음 | **D-04 확정**: `Place.hours`(요일별 JSON) + `Place.hoursNote`(1줄 메모) 신설. 구조는 개발명세서 v2 §3-4 | P0 | `prisma/schema.prisma:105-131` |
| 신고 | 미구현 | UI·Action·모델 없음. `REPORT_REASONS`/`REPORT_STATUS` 상수만 잔존 | `Report` 모델 + UI + 관리자 처리 | P1 | `src/lib/constants.ts:37-42` |
| SEO | 미구현 | `generateMetadata`·JSON-LD·OG·hreflang·`sitemap.ts`·`robots.ts` 전무. 루트 layout에 고정 한국어 metadata 1개 | 전체 구현 | P1 | `src/app/layout.tsx:10-14` |
| 이미지 최적화 | 미구현 | `next.config.mjs`에 `images.remotePatterns` 없음 → 전 이미지 `unoptimized` | 도메인 등록 후 `unoptimized` 제거 | P1 | `next.config.mjs`, `CategoryPlaceCard.tsx:107` |
| 상세 로딩·오류·404 | 미구현 | `notFound()` 호출만 있고 `not-found.tsx` 파일 없음 | `loading.tsx`/`error.tsx`/`not-found.tsx` | P0 | `places/[id]/page.tsx:42` |

---

## 7. 한국어 문의 문구

| 영역 | 상태 | 현재 구현 | 남은 작업 | 우선순위 | 근거 파일 |
|---|---|---|---|---|---|
| 컴포넌트 | 완료 | 정적 템플릿 + 클립보드 복사 + `sonner` 토스트. 영어 로케일에서만 렌더 | — | — | `src/components/places/KoreanInquiryBox.tsx` |
| **MVP 비노출 처리** | 미구현 | 현재 영어 상세 페이지에 노출 중 | 렌더 분기 제거(코드·메시지 키는 P1 재도입 대비 보존) | P0 | `places/[id]/page.tsx:230` |
| 복사 실패 처리 | 부분 완료 | 실패를 `catch {}`로 삼키고도 "Copied!" 표시 | 실패 시 별도 안내 | P1 (비노출 시 유예) | `KoreanInquiryBox.tsx:23-32` |
| 동적 생성 | 미구현 | 장소명·반려견 크기·미확인 조건 반영 없음 | P1 재도입 후보 | P1 | `KoreanInquiryBox.tsx:10-17` |

---

## 8. 장소 조회 Query · Server Action

| 영역 | 상태 | 현재 구현 | 남은 작업 | 우선순위 | 근거 파일 |
|---|---|---|---|---|---|
| 조회 함수 | 완료 | `getPlaces` / `getCategoryPlaces` / `getPlaceById` / `getAdminPlaces` / `getAdminPlaceById` | — | — | `src/lib/places/queries.ts` |
| PostGIS 좌표·거리 | 완료 | `$queryRaw`로 `ST_Y`/`ST_X`/`ST_Distance` 조회 후 `id`로 join. 위치 없으면 `distanceMeters=null` | — | — | 같은 파일 `:162-189` |
| **검증 완료 장소만 공개** | 미구현 | `visibility=VISIBLE`만 확인. 검증 이력 없는 장소도 노출됨 | 모든 사용자 조회에 `verifications: { some: {} }` 조건 추가. **D-07 확정**: 마이그레이션·임시 검증 이력 생성 없음. **DB 확인 결과 대상 0건이므로 조회 조건 추가만으로 완결** | P0 | 같은 파일 `:149,238,353` / `favorites/queries.ts:18` |
| `Recheck needed` (90일) | 미구현 | 8주(56일) 기준 `{weeks} wk old` 문구만 존재 | **D-02 확정**: `STALE_VERIFICATION_WEEKS` 폐기 → 90일 단일 임계로 교체, `Recheck needed` 표시. 중간 경고 단계 없음 | P0 | `src/lib/places/display.ts:5` |
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
| 마이그레이션 | 완료 | init / condition_v2 / vaccination / carrier_stroller_3state / favorite (5건) | — | — | `prisma/migrations/` |
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
| 로그인 경로 로케일 | 미구현 | `pages.signIn`/`pages.error`가 `"/en/login"` 하드코딩 → 한국어 사용자가 영어 페이지로 이동 | 로케일 반영 | P0 | `src/auth.ts:16-19` |
| Rate Limiting | 미구현 | 없음 | 신고 기능 도입 시 필수 | P1 | — |

---

## 13. 반려견 프로필

| 영역 | 상태 | 현재 구현 | 남은 작업 | 우선순위 | 근거 파일 |
|---|---|---|---|---|---|
| 대표 1마리 등록 | 완료 | `/my-dog` upsert. `getUserDog`은 `findFirst`(최초 1건) → 1마리 정책이 코드로 강제됨 | — | — | `src/app/[locale]/(public)/my-dog/page.tsx`, `lib/dogs/{actions,queries}.ts` |
| 필터 기본값 연동 | 완료 | 서버에서 `toDogSizeFilter(dog.size)` → `usePlaceListState`의 `dogSize` 초기값 | — | — | `places/page.tsx:44`, `hooks/usePlaceListState.ts:44-47` |
| 방문 가능 여부 단언 | 완료 | 카드·미리보기에 `EligibilityBanner`. 프로필 없으면 미표시 | — | — | `src/components/places/EligibilityBanner.tsx`, `lib/places/eligibility.ts:29-48` |
| 폼 검증 | 완료 | zod + 필드별 오류 + `useFormStatus` | — | — | `src/components/dogs/DogProfileForm.tsx`, `lib/validation/dog.ts` |
| 여러 마리 CRUD | 미구현 | 없음 | 기획서 v3에서 P2로 이동 (의도된 제외) | P2 | — |
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
| 메시지 키 정합성 | 완료 | **374키, en/ko 완전 일치. 누락 0건** | — | — | `messages/en.json`, `messages/ko.json` |
| 장소명 표기 | 완료 | en: `nameEn ?? nameKr` primary / ko: `nameKr` primary | — | — | `src/lib/i18n/locale.ts:7-21` |
| 카테고리 라벨 | 부분 완료 | 현재 영어 라벨은 `Travel Spots` | `Attractions`로 변경 (enum·내부값 유지) | P0 | `messages/en.json` `home.categories.tabs.travel` 등 |
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
| `border-strong` 클래스 | 미구현 | 6곳에서 `border-strong` 사용 — Tailwind는 `border-border-strong`만 생성 → **무효 클래스** | `border-border-strong`으로 교체 | P0 | `FilterModal.tsx:25,165`, `SortDropdown.tsx:33`, `FavoriteButton.tsx:67`, `HeroActions.tsx:37`, `DogProfileForm.tsx:22` |
| 다크모드 미사용 | 미구현 | `globals.css`에 shadcn 기본 `.dark{}` 블록 34줄 잔존 + `next-themes` 설치됨. `DESIGN.md` §4는 라이트 전용 | 블록·패키지 제거 | P0 | `globals.css:95-132`, `package.json:21` |
| radius 스케일 | 부분 완료 | `--radius: 0.625rem`(10px) + `rounded-xl`/`rounded-2xl` 혼용 — `DESIGN.md` §4 표(8/12/16px)와 불일치 | 문서·코드 정렬 | P1 | `globals.css:80`, `PlaceCard.tsx:54` |

---

## 18. 로딩 · 빈 상태 · 오류 상태

| 영역 | 상태 | 현재 구현 | 남은 작업 | 우선순위 | 근거 파일 |
|---|---|---|---|---|---|
| 라우트 레벨 경계 | 미구현 | `loading.tsx`/`error.tsx`/`not-found.tsx` **프로젝트 전체 0개** | 전 라우트 추가 | P0 | `find src/app -name "loading.tsx" -o -name "error.tsx" -o -name "not-found.tsx"` → 0건 |
| 홈 카테고리 탭 | 완료 | 로딩 스켈레톤 / 빈 상태 / 오류 + 재시도 | — | — | `CategoryPlaceTabs.tsx:85-131` |
| 목록 빈 상태 | 부분 완료 | 아이콘 + 문구 1종(`list.empty`)만 존재 | **D-11 확정**: ① 서비스 범위 밖 → `대전 장소 보기` ② 필터 결과 0건 → **`필터 초기화`** 2종으로 분리. 동시 성립 시 범위 밖 우선 | P0 | `PlacesClient.tsx:320-325` |
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
| Dialog·Sheet 접근성 | 미구현 | focus trap·ESC·`role="dialog"` 없음 | Radix 컴포넌트 활용 | P0 | `FilterModal.tsx:68-89`, `PlacesClient.tsx:125-133` |
| 드롭다운 접근성 | 미구현 | `aria-expanded`·listbox 역할 없음, `▲▼` 텍스트 아이콘 | Radix `dropdown-menu` 교체 | P1 | `SortDropdown.tsx:31-40` |
| Skip link | 미구현 | 없음 | 추가 | P1 | `src/app/layout.tsx` |
| 선택 결과 `aria-live` 고지 | 미구현 | 포커스 이동만 존재 | live region 추가 | P1 | `PlacePreviewCard.tsx:144-148` |
| 반응형 브레이크포인트 | 완료 | lg/xl 기준 3분할·오버레이·시트 전환. 모바일이 데스크톱 축소판이 아님 | — | — | `PlacesClient.tsx:119-360` |
| 대비비 실측 | 확인 필요 | 토큰은 정의됨. 실제 4.5:1 충족 여부 미측정 | 자동/수동 검사 | P1 | `globals.css` |

---

## 20. 품질 · 운영

| 영역 | 상태 | 현재 구현 | 남은 작업 | 우선순위 | 근거 파일 |
|---|---|---|---|---|---|
| 테스트 | 미구현 | 러너·테스트 파일 전무 | 순수 함수 우선(`eligibility`/`filtering`/`display`) | P1 | `package.json` |
| 오류 추적 | 미구현 | Sentry 미설치 | 도입 | P1 | `package.json` |
| 빌드·타입체크 검증 | 확인 필요 | 이번 분석에서 `next build`/`tsc` 미실행 | 실행 확인 | P0 | — |
| 미사용 코드 | 부분 완료 | `mock-places.ts`, `haversineDistance`, `formatWalkingTime`, `lib/result.ts` 참조 0건 | 정리 | P1 | grep 결과 |
| 문서 버전 관리 | 확인 필요 | `docs/*.md`가 git 미추적(untracked), 원본 PDF는 삭제 상태 | 추적 여부 결정 | P1 | `git status` |
| 서비스 지역 제한 (대전 단독) | 완료 | 코드에 지역 개념 없음. 공개는 "검증 이력 + `visibility=VISIBLE`"로만 통제됨 | **D-08 확정**: 코드 변경 없이 **운영 규칙으로 강제**한다 — 운영자가 대전 장소만 검증·공개. 지역 필드는 2단계 확장 시 도입 | — | `prisma/schema.prisma`(지역 필드 없음), 기획서 v3 §9-5 |

---

## P0 목록 (MVP 출시 차단)

D-01~D-12 확정으로 **20건 전부 즉시 착수 가능**하다. 선행 결정 대기 항목은 없다.

| # | 항목 | 근거 절 | 착수 |
|---|---|---|---|
| 1 | 공개 조건에 "검증 이력 존재" 추가 (마이그레이션 없음) | §8 | ✅ 가능 |
| 2 | 8주 임계 폐기 → **90일 단일** `Recheck needed` | §8 | ✅ 가능 |
| 3 | 홈 장소 탐색 섹션 단일화 (중복·범위 불일치 해소) | §1 | ✅ 가능 |
| 4 | 카테고리 라벨 `Attractions`로 변경 | §16 | ✅ 가능 |
| 5 | `loading.tsx`/`error.tsx`/`not-found.tsx` 전면 추가 | §18 | ✅ 가능 |
| 6 | 홈 오류 삼킴 제거 | §1 | ✅ 가능 |
| 7 | Bottom Sheet·FilterModal 접근성(focus trap·ESC·dialog 시맨틱) | §4, §19 | ✅ 가능 |
| 8 | 미리보기 Primary Action을 `상세 보기`로 반전 | §5 | ✅ 가능 |
| 9 | 마커 선택 → 목록 카드 스크롤 동기화 | §3 | ✅ 가능 |
| 10 | 상세에 거리·길찾기·공유·즐겨찾기 액션 추가 | §6 | ✅ 가능 |
| 11 | 운영시간 저장·입력·표시 (`hours` + `hoursNote`) | §6, §9, §15 | ✅ 가능 |
| 12 | 예방접종 `UNKNOWN` 행 숨김 | §6 | ✅ 가능 |
| 13 | `Ask the store in Korean` 렌더 분기 제거(코드 보존) | §7 | ✅ 가능 |
| 14 | 후보 Import **로컬 스크립트** (`Place`+`DRAFT`, 멱등 upsert) | §10 | ✅ 가능 |
| 15 | `auth.ts`의 `/en/login` 하드코딩 제거 | §12 | ✅ 가능 |
| 16 | 필터·정렬·카테고리 URL 반영 | §2 | ✅ 가능 |
| 17 | `border-strong` 무효 클래스 6곳 수정 | §17 | ✅ 가능 |
| 18 | 지도 문구 i18n + 재시도 / `.dark` 블록·`next-themes` 제거 | §3, §17 | ✅ 가능 |
| **19** | 긍정 조건 필터에서 `UNKNOWN` 제외 + **`exclude-unknown` 옵션 제거** | §2 | ✅ 가능 |
| **20** | 서비스 범위 안내: 기본 지도 중심 대전 · 범위 배너 · 범위 밖 안내 · **빈 상태 2종 분리** | §3, §18 | ✅ 가능 |

---

## 확인 필요 목록

| 항목 | 확인 방법 | 관련 | 결과 |
|---|---|---|---|
| 검증 이력 없는 공개 장소 수 | DB 읽기 전용 조회 | P0 #1 (D-07) | ✅ **2026-08-13 확인 — 0건.** 조회 조건 추가만으로 완결 |
| PostGIS extension 활성화 여부 | 배포 DB 조회 | 전체 | ✅ 사실상 확인 — 좌표·거리 쿼리 정상 반환 |
| `next build` / `tsc --noEmit` 통과 여부 | 로컬 실행 | 전체 | 미확인 |
| Google Maps API 키 도메인 제한 설정 | Google Cloud Console | 보안 | 미확인 |
| 색 대비비 4.5:1 충족 여부 | axe / Lighthouse 실측 | P1 접근성 | 미확인 |
| `Accept-Language` 기반 로케일 협상 동작 | 런타임 확인 | P1 i18n | 미확인 |
| `docs/*.md` git 추적 여부 결정 | 사용자 결정 | 문서 관리 | 미결 |

### DB 실측 (2026-08-13, 읽기 전용)

| 항목 | 값 |
|---|---|
| 전체 장소 | 4건 (전부 `VISIBLE`. `DRAFT`·`HIDDEN` 0건) |
| 검증 이력 없는 `VISIBLE` | **0건** |
| 조건(`PlaceCondition`) 없는 `VISIBLE` | 0건 |
| 90일 초과 `VISIBLE` | 0건 |

> 공개 장소가 4곳뿐이다. 기획서 v3의 1단계 목표(대전 30~50곳)까지 **데이터 확보가 가장 큰 잔여 작업**이며, 이는 코드가 아니라 운영 작업이다.

---

## 미확정 항목

P0을 차단하는 항목은 없다. 아래 둘은 해당 기능 착수 시점에 결정한다.

| ID | 항목 | 시점 |
|---|---|---|
| D-13 | 신고 Rate Limit 임계값과 식별 기준(IP / 쿠키 / 세션) | P1 신고 기능(T-21) 착수 시 |
| D-14 | 2단계 확장 시 지역 필드 설계 | 서울 확장 착수 시 |

구현 중 정할 소소한 값 (별도 결정 항목 아님): 서비스 범위 밖 판정 임계 거리(기본 50 km 권장), 대전 기본 중심 좌표와 초기 zoom — 모두 P0 #20에서 처리.

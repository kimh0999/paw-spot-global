# Paw Spot Global — 구현 현황

> **이 문서의 목적**: 기획이 아니라 **실제 개발 진행 상황 추적**이다.
> 모든 상태는 코드 확인에 근거한다. 확인하지 못한 것은 `확인 필요`로 남기고 추측하지 않는다.
>
> **기준일**: 2026-09-12 (**Next 16 이행** — 16.3.5 + ESLint 9 · `middleware` → `proxy` · 정적 생성 전제 정정) · 직전 2026-09-11 (**보안 후속 + 재검증 2차** — 의존성 업그레이드 · **React 19 이행** · **vitest 4.1.11** · 외부 URL 스킴 검증 · CSP 보고 전용 · **폼 저장·서버액션 인가·지도 실측**) · 직전 **동물병원 탐색·문의 P0 구현**과 `DESIGN.md` v2.1 2026-09-10 · 직전 사용자 화면 재설계(`DESIGN.md` v2.0) 2026-09-09 · 직전 **P0 20건 전부 완료** 2026-09-08 · 직전 **P0 20건 코드 재대조** 2026-09-06 · **브랜치**: `chore/project-foundation`
> **기획 기준**: `docs/Paw_Spot_Global_기획서_v3.md` · **구현 기준**: `docs/Paw_Spot_Global_개발명세서_v2.md` · **디자인 기준**: `DESIGN.md`

**상태 값**: `완료` / `부분 완료` / `미구현` / `확인 필요` / `제외`(하지 않기로 결정 — 미구현과 구분한다)

---

## 요약

아래 21개 절의 상태 행 **154건** 집계 (2026-09-11 기계 집계).

| 상태 | 개수 |
|---|---|
| 완료 | 104 |
| 부분 완료 | 15 |
| 미구현 | 31 |
| 확인 필요 | 3 |
| 제외 | 1 |

> **집계 방법을 바꿨다.** 이전까지 이어받던 "161건"은 문서의 표에서 다시 세어지지 않는 수였다
> (아래 주의 문구대로 일부가 검증 없이 이월된 값이었다). 위 수치는 `## 1.`~`## 21.` 절의
> 표에서 상태 열이 `완료/부분 완료/미구현/확인 필요/제외` 중 하나인 행만 **기계적으로 센 값**이다.
> 절별 행 수: §1 9 · §2 10 · §3 9 · §4 4 · §5 6 · §6 9 · §7 4 · §8 10 · §9 10 · §10 4 ·
> §11 4 · §12 7 · §13 9 · §14 3 · §15 9 · §16 9 · §17 5 · §18 5 · §19 6 · §20 8 · §21 14.
> 값이 줄어 보이는 것은 구현이 후퇴해서가 아니라 **세는 기준이 처음으로 재현 가능해졌기 때문**이다.

> **집계 범위 주의**: 2026-09-06 재대조는 **P0 20건과 그에 직접 대응하는 상태 행만** 코드로 확인했다.
> 위 수치는 그 12개 행(09-06 8건 + 09-07 4건)의 판정 변경만 반영해 다시 계산한 값이고,
> 나머지 행은 2026-08-18 판정을 그대로 이어받은 **미검증** 값이다.

**MVP 출시를 차단하는 P0 항목: 20개 전부 완료** (2026-09-08) (§P0 목록 참조)

> **다만 이 P0 20건은 장소 기능 기준이다.** 이후 추가된 §21 동물병원과 §20 보안 항목은
> 그 목록에 들어 있지 않다. 지금 출시를 실질적으로 막는 것은 **운영 작업**이다 —
> 동물병원 마이그레이션 미적용, 공개 장소 4건, 병원 데이터 0건.

주의: "완료" 112건은 **세부 항목 단위** 집계다. 화면·기능 단위로 보면 탐색 화면의 레이아웃·동기화·판정 로직과 라우트 상태 처리는 완성도가 높은 반면, 상세 페이지의 액션 영역과 데이터 파이프라인(운영시간 · 후보 Import)은 여전히 비어 있다. 절별 분포를 함께 볼 것.

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

### 2026-09-09 사용자 화면 재설계 (`DESIGN.md` v2.0)

**관리자 화면과 데이터·정책 로직은 건드리지 않았다.** 조건 해석·매칭·필터 판정은 기존 공용 함수를 그대로 재사용하고 표현 계층만 다시 만들었다.

| 변경 | 절 |
|---|---|
| **디자인 토큰 교체** — 브랜드 파랑 → 잉크 보라, 회색 배경 → 종이빛. 상태 색과 브랜드 색의 충돌을 없애는 것이 근거다. 대비 전량 재계산 | §17 |
| **한글 폰트 도입** — `Inter`(라틴) + `Noto Sans KR`(한글). 그전에는 한국어가 시스템 기본 폰트로 떨어졌다. 본문 행간·`word-break: keep-all` 포함 | §16, §17 |
| **radius 역할 토큰** — `rounded-card`(14) / `panel`(12) / `sheet`(20). `border-control` 토큰과 `fontSize` 스케일 신설 (`DESIGN.md` A-2·A-3 해소) | §17 |
| **탐색 화면 2분할** — 3분할 폐기. 선택한 장소가 목록 컬럼을 덮고, 목록은 마운트된 채 남아 스크롤 위치가 보존된다 | §3 |
| **상세 재구성** — 공통 Header·`main` 랜드마크 추가(D-2 해소), 데스크톱 2열(판단/실용), 조건 배지 → 라벨·값 행, 운영시간 미등록은 한 줄 | §7 |
| **홈 재구성** — 히어로의 `강아지 + 지도 일러스트` 자리 제거, 검색·카테고리·장소를 첫 화면으로 끌어올림. `추천 장소` → `확인된 장소` | §1 |
| **사진 처리** — `PlaceThumb` 신설. 미등록·로딩 실패 시 카테고리 표식으로 떨어지고 깨진 이미지·alt 텍스트를 노출하지 않는다 | §7 |
| **판정 범위 표기** — 반려견 기준 판정에 `· {이름} 기준`을 붙였다. 즐겨찾기가 먼저 등록한 반려견 기준이라는 사실이 화면에 없었다 | §13 |
| **§9 어휘 위반 문구 교정** — 미리보기 `이동장 불필요`(유모차 누락)·`대형견 가능`(상한 모호)·`실내에서는 안거나 유모차`(이동장 누락), 카드 `상황에 따라 필요`(주어 없음), 상세 EN `Muzzle for some breeds`(견종으로 좁힘) | §6 |
| **모바일 내비게이션 추가** — `md` 미만에서 헤더 메뉴가 통째로 사라지던 문제 | §16 |
| **언어 전환이 쿼리를 보존** — `/places?category=...`에서 EN/KO를 눌러도 조건이 풀리지 않는다 | §12 |
| **지도 인증 실패 처리** — Maps SDK의 전역 실패 콜백을 받아 회색 판 대신 사유를 알린다. 워터마크·오류는 가리지 않는다 | §3 |
| 조작 영역 44px 전수 확인, `shadow-sm` 제거(B-1~B-3), Skeleton 구조 정렬(A-5) | §19 |

**확인 필요 (외부 설정)**: Google Maps 타일 요청이 503이고 `For development purposes only` 워터마크가 뜬다. 다른 포트에서는 `BillingNotEnabledMapError`가 콘솔에 찍혔다 — **Google Cloud 결제·API 설정 문제이며 코드로 고칠 수 없다** (`DESIGN.md` §13 H-1).

---

### 2026-09-08 검증 보강 (코드 변경 없음)

P0가 전부 닫힌 뒤, 미검증으로 남아 있던 항목을 브라우저에서 다시 확인했다. **구현은 건드리지 않았다.**

| 항목 | 결과 |
|---|---|
| #20 모바일 시트 범위 배너 | ✅ **검증 완료.** `window.open(..., 'width=390')` 팝업(`innerWidth 604`)에서 배너 문구와 `대전 장소 보기`가 모두 렌더되고 레이아웃 안에 들어온다(배너 `307×32`, 버튼 `106×29`). 버튼을 누르면 주소의 `lat`·`lng`·`sort`가 사라지고 정렬이 `최근 확인순`으로, 배너가 사라진다 — 데스크톱과 같은 경로가 모바일에서도 성립 |
| #9 정렬·필터 변경 후 마커 재선택 | ✅ **검증 완료.** `size=large`로 목록을 3건으로 줄인 상태에서 마커 3개, `sort=no-carrier-first`로 정렬을 바꾼 상태에서 마커 3개 — **6/6 모두 클릭한 마커의 장소가 선택된다**(`aria-current`로 확인). 인덱스가 아니라 id로 잡는다는 설계가 필터·정렬 변경 뒤에도 성립한다 |
| #18 지도 `noCoordinates` | ✅ **검증 완료.** 결과 0건이 되는 검색어로 재현 — `지도에 표시할 좌표가 있는 장소가 없습니다.` 배지가 지도 하단에 뜬다. 목록 쪽 빈 상태(`해당 조건에 맞는 장소가 없습니다.` + `필터 초기화`)와 동시에 성립 |
| #18 지도 `no-key` | ✅ **검증 완료.** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`를 비운 별도 dev 서버에서 재현 — `지도를 사용할 수 없습니다. Google Maps API 키를 확인하세요.`가 뜨고 **재시도 버튼은 없다**(설계 의도와 일치: 키 없음은 다시 시도해도 결과가 같다) |
| #18 지도 `error` | ❌ 여전히 재현 못 함. 사유는 §미검증 항목에 갱신 |
| #9 모바일에서 마커 → 카드 스크롤 | ❌ **데이터 부족으로 검증 불가.** 팝업 뷰포트(`604×1089`)에서 목록 컨테이너가 `scrollHeight === clientHeight`(798=798)다. 장소가 4건뿐이라 목록이 넘치지 않아 `scrollIntoView`가 할 일이 없다. 장소가 늘어야 검증 가능 |

**검증 방법에 대한 주의**

- 마커 클릭은 좌표 클릭이 아니라 **마커 DOM에 합성 마우스 이벤트를 디스패치**했다. 이 환경에서는 좌표 기반 클릭이 페이지에 전달되지 않는다(같은 좌표로 목록 카드를 눌러도 반응이 없고, 요소 참조로 누르면 정상 동작한다). 따라서 확인된 것은 **마커 클릭 핸들러부터 카드 선택까지의 배선**이고, 히트 영역 자체는 아니다.
- 이 환경의 Google 지도는 **탭이 실제로 그려질 때만 초기화된다.** 백그라운드 상태에서는 `.gm-style`이 생성되지 않고, 클라이언트 이동 뒤 마커가 사라진 것처럼 보이기도 한다. 09-07에 '지도가 초기화되지 않기 시작했다'고 적은 현상의 정체가 이것이다 — 앱 결함이 아니다.
- 지도 `Google 지도를 제대로 로드할 수 없습니다.` 오버레이는 여전히 뜬다(referer 제한 건, 아래 확인 필요 목록).

**Import 스크립트 실적재 (2026-09-08, 사용자 승인)**

`--commit`을 처음 돌렸다. 샘플 2건(`IMPORT-SAMPLE-0001`·`0002`)을 `DRAFT`로 넣고 DB로 확인했다.

| 확인 | 결과 |
|---|---|
| 적재 | 신규 2건. 좌표가 `ST_Y`/`ST_X` 왕복에서 입력값과 정확히 일치 |
| 멱등성 | 같은 파일 재실행 → 신규 0 · 건너뜀 2 (`ON CONFLICT DO NOTHING`) |
| D-05 준수 | 샘플의 `PlaceCondition` 0행 · `Verification` 0행 — Import는 조건을 추측하지 않는다 |
| 사용자 노출 | `VISIBLE` + 검증 이력 조건을 충족하는 장소는 **4건 그대로**. 후보는 공개 경로에서 걸러진다 |

> **주의**: 후보는 `DRAFT`라 공개 목록·지도에 뜨지 않는다. 따라서 이 적재로 **#9 모바일 마커→카드 스크롤 검증이 풀리지는 않는다.**
> 그 검증에는 공개 가능한(조건 + 검증 이력을 갖춘) 장소가 더 필요하다.
> 샘플을 지우려면: `DELETE FROM "Place" WHERE "tourApiId" LIKE 'IMPORT-SAMPLE-%';`

**새로 발견한 결함**

| 발견 | 위치 | 근거 |
|---|---|---|
| 범위 밖 배너의 `대전 장소 보기` 버튼이 모바일 폭에서 **29px** 높이였다 → **같은 날 수정** | `PlacesClient.tsx:461-467` | `DESIGN.md`가 두 곳에서 요구하는 **touch target 최소 44×44px** 위반이었다. 같은 화면의 다른 컨트롤(지도 재시도 버튼, 상세 액션 4종)은 `h-11`로 44px를 지킨다 — 의도된 예외가 아니라 누락이었다. `px-3 py-1.5`를 `inline-flex h-11 items-center px-3`으로 바꿔 44px를 확보했다. typecheck·lint·test 505건 통과 |

---

### 2026-09-08 접근성 보완

P0 이후 첫 P1 트랙. §19의 접근성 4행을 처리했다.

| 변경 | 절 | 검증 |
|---|---|---|
| **`SortDropdown` → Radix `DropdownMenu` + `RadioGroup`** | §19, §2 | 브라우저 실측 — `aria-expanded` false→true, `aria-haspopup="menu"`, `aria-controls` 존재, `role="menuitemradio"` 4개와 `aria-checked`(현재값만 true), `거리순`이 `aria-disabled="true"`, 항목 높이 계산값 43.99px(44px), Portal 렌더(`main` 바깥) |
| **드롭다운 퇴장 모션** — `popover-out` keyframe 신설 | §17 | ESC → `data-state="closed"` + `animation-name: popover-out`, 이후 언마운트되고 포커스가 트리거로 복귀. 프로덕션 CSS에 `@keyframes popover-out` 존재 |
| **`▲▼` 문자 → `ChevronDown` 아이콘** | §19 | 문서에서 `▲`·`▼` 문자 0건. 열림 시 아이콘 회전(`transform ≠ none`) |
| **Skip link** — `Header` 첫 요소, `#main-content`로 이동 | §19 | `/ko`·`/en`·`/ko/places` 각각 skip link 1개·대상 1개. **첫 tabbable 요소임을 확인**했고, 눌렀을 때 `document.activeElement`가 `<main>`으로 이동 |
| **`main` 랜드마크 추가** — 탐색 화면에 없었다 | §19 | `PlacesClient`의 콘텐츠 `div`를 `<main id="main-content" tabIndex={-1}>`으로. 나머지 3개 페이지는 기존 `<main>`에 id만 추가 |
| **결과 수 `role="status"`** (sr-only) | §19 | 필터 적용 시 같은 노드의 내용이 `장소 4곳`→`장소 3곳`으로 갱신 |

**설계 문서와 다르게 간 곳**

- §19가 적었던 `listbox 역할`이 아니라 **`menuitemradio`**다. 하나만 고르는 값이라 `RadioGroup`이 맞고, 프로젝트가 이미 쓰는 `DropdownMenu`(=`DogCard`)와 형태가 같다. 역할이 없던 문제(원래 지적)는 해소됐다.
- 메뉴가 **오른쪽 정렬**로 열린다(예전은 왼쪽). 트리거가 목록 패널 오른쪽 끝에 있어 왼쪽 정렬이면 패널 밖으로 나가 `overflow-hidden`에 잘렸다.
- 트리거 높이를 `py-2`(36px)에서 `h-11`(44px)로 올렸다 — `DESIGN.md` §11 터치 타깃.
- **선택 고지에 live region을 쓰지 않았다.** `PlacePreviewCard`가 이미 제목으로 포커스를 옮겨 스크린리더가 읽는다. 같은 내용을 live region으로 또 내보내면 한 번의 선택이 두 번 읽힌다. 대신 조용했던 **결과 수**에 live region을 뒀다.

**색 대비비 실측 (WCAG 2.1)**

코드에 실제로 존재하는 조합만 계산했다. 텍스트 19건 중 **17건 통과**.

| 미달 | 값 | 기준 | 사용처 |
|---|---|---|---|
| `danger` #dc2626 on `danger-soft` #fef2f2 | **4.41** | 4.5 | 넓게 쓰인다 — `ConditionBadge`·`DogMatchBadge`·`EligibilityBanner`·`badge`/`button` destructive·로그인/반려견 폼 오류 문구 |
| `text-muted` #6b7280 on `surface-subtle` #f2f4f7 | **4.39** | 4.5 | 실제 동시 발생 없음(hover에서 텍스트가 `content`로 바뀜, 비활성 메뉴 항목은 흰 배경) — 잠재 조합 |
| `border` #e5e7eb on `surface` | **1.24** | 3.0 (비텍스트) | 구분선 위주 — 장식이면 면제 대상 |
| `border-strong` #cfd4dc on `surface` | **1.49** | 3.0 (비텍스트) | **컨트롤 경계** — 정렬 트리거·필터 칩·입력·아웃라인 버튼. 저시력 사용자에게 경계가 사실상 보이지 않는다 |

통과한 것 중 참고할 값: 본문 `text`/`surface` 17.90, 보조 `text-secondary`/`surface` 6.05, Primary 버튼 5.17, 포커스 링 5.17, 미확인 배지 4.51.

> **수정하지 않았다.** 넷 다 `DESIGN.md` §4의 색 토큰을 바꿔야 하고, `DESIGN.md`는 이 저장소의 유일한 디자인 기준이라 임의로 건드리지 않는다. `border-strong`(1.49 → 3.0)이 영향이 가장 크고, `danger`(4.41 → 4.5)는 아주 조금만 어둡게 하면 된다.

**함께 발견한 것 (고치지 않음)**

- `places/[id]` 상세 페이지에는 **`<Header />`도 `<main>`도 없다.** 사이트 헤더가 아예 없어 skip link 대상도 없다. 이번 범위 밖이라 두었다.
- `DogCard`의 `DropdownMenu`에도 퇴장 모션이 없다. 이제 `animate-popover-out`이 있으니 두 클래스만 붙이면 되지만, 요청 범위가 아니라 건드리지 않았다.

### 2026-09-08 동반 조건 표시 정합 (DESIGN.md §13 C 묶음)

요약 컬럼(`indoor`)만 읽던 표시 계층이 세부 정책(`policyDetails.spaceExceptions`)을 함께 읽도록 바꾸고,
카드·미리보기·상세의 조건 문구를 `DESIGN.md` §9 어휘표에 맞췄다. **DB 스키마·마이그레이션 변경은 없다.**

**완료 — 코드로 확인**

| 변경 | 위치 | 근거 |
|---|---|---|
| **공통 해석 함수 신설** `resolveDogAccess` | `lib/places/dog-access.ts` (신규) | 요약 컬럼 + 구역 기록을 한 곳에서 해석한다. 카드·미리보기·상세가 같은 함수를 쓴다. 단위 테스트 24건 |
| **목록에 `policyDetails` 전달** | `queries.ts` `placeListSelect`·`toPlaceListItem`, `types/place.ts` `PlaceListItem` | 상세와 같은 `readPolicyDetailsOrWarn`을 쓴다 — 깨진 JSON은 경고 로그 후 null이 되고 "조건 없음"으로 조용히 넘어가지 않는다 |
| **카드 이동장·유모차 문구 4상태 (en/ko)** | `messages/*.json` `places.card.carrierStroller` | 유모차·이동장·안기 누락과 `또는` 누락을 고쳤다 |
| **조건 UNKNOWN을 `미확인`으로 통일** | 카드·상세의 실내·이동장·크기 | 신선도 `재확인 필요`, 상태 제목 `방문 전 확인 필요`, 행동 안내 `매장 확인 필요`는 **그대로 두었다**. 일괄 치환하지 않았다 |
| **상세 실내 라벨** `실내 동반` → `동반 가능 여부` / `Dog access` | `messages/*.json` `beforeYouGo.indoor.label` | 라벨과 값의 범위를 맞추는 최소 수정. 새 상단 상태 UI를 추가하지 않았다 |
| **`All sizes welcome` 제거** | 카드·상세 `dogSize.large` | `대형견까지` / `Up to large`. §9의 상한 표기 원칙 |
| **미리보기 중복 분기 제거** | `eligibility.ts` `getPlaceConditionBreakdown` | 전체 동반 불가를 조건 목록에 넣지 않는다. 상태 영역(`getVisitStatus` → `notAllowed`)이 단독으로 단언한다 |
| **복합 상태 표시** `실내 동반 불가 · 야외 동반 미확인` | 카드·미리보기·상세 | `indoor: UNKNOWN` + `INDOOR/ALL/NOT_ALLOWED`이고 야외·테라스에 확인된 기록이 없을 때만 |
| **정보 불일치 처리** | `dog-access.ts`, `eligibility.ts` | 판정 `unknown`, 조건 요약 `동반 조건 정보 불일치`. 방문 가능도 불가도 단언하지 않는다. 크기·세부 구역 예외는 충돌로 보지 않는다 |
| **카드 조건 항목 3개 유지** | `PlaceConditionSummary` | 크기가 미확인이면 항목이 비어 목줄이 세 번째 자리로 올라오던 문제를 고쳤다. 항목 수 기준으로 자른다(줄 수 아님) |

**검증 — 실제로 한 것**

| 방법 | 결과 |
|---|---|
| `tsc --noEmit` | 통과 |
| `next lint` | 경고 0 |
| `vitest run` | **537건 통과** (신규 `dog-access.test.ts` 24건 + `eligibility.test.ts` 확장) |
| **브라우저 실측** | dev 전용 임시 라우트 + fixture 10종으로 카드·미리보기·상세를 실제 컴포넌트로 렌더. **DB에 임시 장소를 만들지 않았다.** 확인 후 라우트 삭제 |

브라우저 실측값 (`document.fonts.ready` 이후, 목록 패널 340px 재현 · 조건 영역 = 조건 목록 + 확인일 줄):

| 상태 | KO 조건영역 | EN 조건영역 |
|---|---|---|
| 일반 5종(allowed·outdoor_only·partial_area·not_allowed·unknown) | 66px | 90px |
| 복합 상태 | 66px | 110px |
| 대형견만 실내 불가 | 90px | 134px |
| 실내 불가 + 테라스 허용 | 114px | 138px |
| 정보 불일치 | 90px | 114px |
| 최장 조합 | 110px | 130px |

- **가로 잘림 0건** — 340px, 320px(모바일 시트 폭), 텍스트 200% 확대 모두. 페이지 가로 스크롤도 발생하지 않았다.
- **`min-h-14`(56px)는 손대지 않았다.** 측정 결과 일반 상태 5종이 locale 안에서 이미 같은 높이(KO 66 / EN 90)라 최소 높이가 정렬에 관여하지 않는다. 값을 올리면 KO 카드에 빈 공간만 생긴다. `DESIGN.md` §6의 새 규칙(동일 높이보다 가독성·완전성 우선)에 맞춰 그대로 두었다.

**미검증**

| 항목 | 사유 |
|---|---|
| 실제 데이터에서의 렌더 | 공개 장소 4건이 전부 `indoor: allowed`이고 `policyDetails`에 구역 기록이 없다. 이번 확인은 **전부 fixture**다 |
| 모바일 Bottom Sheet 실제 레이아웃 | 시트 폭(320px)으로 좁혀 같은 컴포넌트를 재측정했을 뿐, 실제 시트 3단계 전환 안에서는 보지 않았다 |
| 스크린리더 | 조건 값이 상태 아이콘(`aria-hidden`) 옆의 텍스트로만 전달된다. 실제 낭독은 확인하지 않았다 |
| 텍스트 200% 확대 | `html { font-size: 32px }`로 근사했다. 브라우저 자체 확대 기능으로는 확인하지 않았다 |
| 관리자 화면 | 이번 변경 범위 밖. 폼 라벨 `확인 필요`는 그대로다 |

**후속 작업** — `DESIGN.md` §13에 기록

| # | 내용 |
|---|---|
| G-1 | **저장 단계의 모순 검증.** `indoor: ALLOWED` + 전체 반려견 실내 불가 같은 입력을 저장에서 막을지 정한다. 지금은 저장되고 표시 계층이 `정보 불일치`로 받는다. **정상적인 크기·세부 구역 예외(대형견만 실내 불가, 2층만 불가)와 구분하지 못하는 검증은 정상 데이터를 막는다** — 이 구분이 전제 조건이다 |
| C-7 | 날짜·거리 표기가 `DESIGN.md` §10과 맞는지 **미대조** |
| C-8 | 상세 라벨 `강아지 크기 제한`의 말투가 다른 라벨과 다르다 |
| C-9 | 관리자 표 영어 라벨 `Not allowed`, 관리자 폼의 `확인 필요` |

> **이번 작업은 그림자·radius·토큰 정리(§13 A·B)를 포함하지 않는다.** 섞지 않기로 한 범위다.

---

### 2026-09-10 동물병원 탐색·문의 P0 · `DESIGN.md` v2.1

**새 기능 영역이 하나 늘었다.** 상세는 §21에 적고, 여기서는 요약만 둔다.
계획 `docs/04-report/Paw_Spot_Global_Vet_Clinic_Plan_v0.1.md` · 설계 `docs/02-design/동물병원-탐색-문의-P0.design.md`
· 분석 `docs/03-analysis/동물병원-탐색-문의-P0.analysis.md` · 운영 절차 `docs/02-design/동물병원-P0-운영-반영-절차.md`

| 변경 | 절 |
|---|---|
| **동물병원 목록·상세·관리자 등록/수정/확인 기록** (D-16~D-20). 기존 `operating-hours`·`VerificationMethod`·`PlaceVisibility`를 재사용 | §21 |
| **마이그레이션 `20260910000000_vet_clinic` 작성 — 적용하지 않았다.** enum 2 · 테이블 2 · 인덱스 3 · FK 1, 전부 신규 객체 | §9, §21 |
| **AI 번역은 미구현이 아니라 제외** (2026-09-10 사용자 결정). 후속 후보로도 이월하지 않는다 | §16, §21 |
| **D-15 실내 필터 불일치 장소 제외** — 요약 컬럼과 `policyDetails.spaceExceptions`가 어긋나는 장소를 `실내 가능` 필터에서 뺀다 (아래 ⚠️ ID 충돌 참고) | §2 |
| 지원하지 않는 locale이 홈을 렌더하지 않게 라우팅 수정 | §16 |
| `DESIGN.md` v2.1 — 브랜드 그래픽, 장소 표현 가로형, 사진 없는 카드 완결 | §17 |
| 격리 DB(`scripts/test-db.mjs`) 도입 — 저장·조회·권한을 실제 함수로 확인 | §20, §21 |

### 2026-09-11 보안 후속 (의존성 · URL 검증 · CSP)

**기능 변경이 아니다.** 라우팅·화면 구성·판정 로직은 그대로다.

| 변경 | 절 |
|---|---|
| **Next.js 14.2.35 → 15.5.25.** 14.x는 **지원 종료(EOL)** 이며 `nextjs.org/support-policy` 기준 보안 패치가 오지 않는다. 14.2.35는 인증 없는 RCE 2건(GHSA-p293-qw3h-jr36 CVSS 9.0 · GHSA-2xp9-vwfh-vxw4)과 Server Actions DoS(GHSA-m99w-x7hq-7vfj, App Router+Server Action 사용 시 해당) 등 다수 공지의 영향 범위였다 | §20 |
| **`next-auth` 5.0.0-beta.31 → beta.32** (`@auth/core` 0.41.2 → 0.41.3). CVE-2026-73421(CVSS 9.1, 설정 오류 시 존재 검사 인가가 fail-open) 등 4건. **이 저장소는 취약 패턴을 쓰지 않았다** — 인가가 `session?.user?.email` 같은 구체 속성을 보고, 미들웨어는 `auth()`를 호출하지 않는다 | §12, §20 |
| **라우트 15개를 `await params` / `await searchParams`로 이행** — Next 15 필수 변경. 프롭 이름만 바꾸고 본문 참조는 그대로 뒀다 | §전반 |
| `postcss` 8.5.15 → 8.5.28, `eslint-config-next` 15.5.25. **React 18.3.1 · next-intl 4.12.0 · Node 22.14.0은 그대로** (next@15.5.25의 peer가 React `^18.2.0`을 받는다) | §20 |
| **외부 URL 스킴 검증** — `src/lib/validation/url.ts` 신설. `z.string().url()`이 `javascript:`·`data:`·`vbscript:`·`file:`을 통과시킨다(설치된 zod 4.4.3에서 실증). 장소 `website`·`thumbnailUrl`·`sourceUrl`, 병원 `website`·`sourceUrl`에 http/https 규칙 적용 | §6, §15, §21 |
| **저장 경로 두 곳 모두에 적용** — 관리자 폼(zod)뿐 아니라 `scripts/import-places.mjs`도. 이 스크립트는 폼을 거치지 않고 raw SQL로 직접 쓰며 **URL을 전혀 검사하지 않고 있었다** | §10 |
| **출력 쪽 방어** — `safeHttpUrl()`이 이미 저장된 잘못된 값을 링크로 만들지 않는다. 운영 데이터를 고치지 않고 막는다. 공개 `href` 싱크 3곳(장소 상세·병원 상세·확인 근거 출처) | §6, §21 |
| **CSP 보고 전용 도입** — `Content-Security-Policy-Report-Only` + `X-Frame-Options: DENY` + `nosniff` + `Referrer-Policy`. 그전에는 헤더 설정이 **저장소 어디에도 없었다**. 현황·전환 조건은 `docs/02-design/CSP-적용-현황.md` | §20 |

> ⚠️ **결정 ID `D-15`가 두 번 쓰였다.** 이 문서 §확정된 보완 결정의 `D-15`(설문 응답에
> `VerificationMethod.SURVEY` 추가, 2026-09-07)와 `docs/03-analysis/N-2-실내-필터-불일치-장소.decision.md`의
> `D-15`(실내 필터 불일치 장소 제외, 2026-09-10)가 서로 다른 결정이다.
> 후자의 보고서는 `D-13`이 예약된 것만 확인하고 `D-15`를 골랐고, 동물병원 설계 문서는
> "`D-01`~`D-15`가 사용 중"이라는 전제로 `D-16`부터 부여했다.
> 커밋 메시지(`2ed7cea`)에도 `D-15`가 들어가 있어 **재부여는 문서 여러 곳을 함께 고쳐야 한다.**
> 아직 고치지 않았다 — §미확정 항목에 남긴다.

### 2026-09-12 Next 16 이행 (프레임워크 · 린트 · 라우팅 규약)

**기능 변경이 아니다.** 화면·판정 로직·데이터 구조는 그대로다.

| 변경 | 절 |
|---|---|
| **Next 15.5.25 → 16.3.5.** 15.x는 Maintenance LTS이고 `nextjs.org/support-policy` 기준 **2026-10-21**에 끝난다. 16.x가 Active LTS이고, 8월 보안 릴리스가 지정한 하한이 16.3.3이라 그 위의 최신 안정 버전을 골랐다 | §20 |
| **ESLint 8 → 9.39.5 + flat config.** 선택이 아니다 — `eslint-config-next@16`의 peer가 `eslint >= 9`이고, 그 의존인 `typescript-eslint@8`은 ESLint 10을 받지 않는다. `next lint`가 16에서 제거돼 `npm run lint`는 `eslint src`다. 규칙 구성(`core-web-vitals` + `typescript`)과 검사 범위(`src`)는 이전과 같다 | §20 |
| **lint warning 12건** — `eslint-plugin-react-hooks` 5.2.0 → 7.1.1이 들여온 `react-hooks/refs`·`react-hooks/set-state-in-effect`에 걸린다. **전부 이행 이전부터 있던 코드다.** 끄지 않고 `warn`으로 낮췄다 — 고치려면 지도·폼 컴포넌트를 다시 짜야 하고, 지도는 결제 오류로 실동작 확인이 불가능하다 | §3, §15, §20 |
| **`src/middleware.ts` → `src/proxy.ts`** — Next 16의 파일 규약. 이름만 바뀌는 것이 아니라 **런타임이 Edge에서 Node.js로 고정**된다(`proxy`는 runtime 설정을 받지 않는다). 이 파일은 next-intl 로케일 협상만 하고 `auth()`를 부르지 않으며, 저장소에 `runtime = "edge"` 선언이 0건이라 Edge를 유지할 근거를 찾지 못했다. matcher와 협상 정책은 그대로고, 로케일 협상·보호 라우트 리다이렉트를 실측해 이행 전과 같은 값을 확인했다 | §12 |
| **`turbopack.resolveAlias` 2줄** — 16부터 빌드가 Turbopack 기본인데 `tw-animate-css`와 `shadcn/tailwind.css`가 CSS를 `"style"` export 조건으로만 노출해 `Module not found`가 난다(webpack css-loader는 그 조건을 적용했었다) | §17 |
| **정적 생성 전제 정정** — "빌드가 28페이지를 미리 만든다"는 서술이 틀렸다. 산출물을 직접 세어 보니 `prerender-manifest.json` 2건(`/favicon.ico`·`/_global-error`) · `.html` 1개이고, 루트 레이아웃이 `await getLocale()`로 요청 헤더를 읽어 **모든 경로가 요청 시 렌더**된다. Next 15의 `●(SSG)` 표시가 실제를 가리고 있었다. CSP nonce의 대가로 계산했던 "정적 생성 상실"은 **존재하지 않는다** | §20, `CSP-적용-현황.md` §4-1 |
| `next-env.d.ts`·`tsconfig.json`·`AGENTS.md`·`CLAUDE.md`는 Next 16 도구가 직접 고쳐 쓴 파일이다. 지우면 다음 `next dev`가 다시 만들기 때문에 함께 커밋했다 | — |

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
| 지도 오류·로딩 문구 | 완료 (2026-09-08) | `no-key`/`error`/`loading`/`noCoordinates`/`myLocation` 5개 문구를 `places.map.*`로 i18n화. `error` 상태에 재시도 버튼(`common.retry`) 추가 — `loadAttempt` 상태를 올려 초기화 effect를 다시 돌린다. `no-key`는 설정 문제라 다시 시도해도 같으므로 버튼을 주지 않는다 | — | — | `MapPanel.tsx`, `messages/{en,ko}.json` |
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
| 거리 표시 | 완료 (2026-09-08) | 주소 아래에 `내 위치에서 {거리}`. 목록에서 넘어올 때만 `lat`·`lng`가 붙고, 없으면 표시하지 않는다(개발명세서 v2 §7-2 — 좌표 fallback은 지도 중심에만 쓴다). 계산은 `haversineDistance` + `formatDistance`로 목록과 같은 함수다 | — | — | `places/[id]/page.tsx`, `PlacePreviewCard.tsx` |
| 길찾기 · 공유 · 즐겨찾기 액션 | 완료 (2026-09-08) | 헤더 카드 하단에 액션 행 신설(`DESIGN.md` §6 표시 순서 3). **길찾기가 primary**, 전화·공유는 secondary, 즐겨찾기는 아이콘 버튼. 값이 없는 액션은 비활성 버튼을 두지 않고 아예 그리지 않는다. 공유는 `navigator.share` → 클립보드 순으로 대체하며 **정규 경로만 공유해 사용자 좌표가 새지 않는다** | — | — | `places/[id]/page.tsx`, `ShareButton.tsx` |
| 운영시간 | 완료 (2026-09-08) | 장소 정보 섹션 맨 위에 요일별 표시. 이어지는 같은 시간대는 `월–금 09:00–21:00`처럼 묶고 **떨어진 요일은 묶지 않는다**. 값이 없으면 `운영시간이 아직 등록되지 않았습니다`. 요일명은 locale별 i18n | — | — | `places/[id]/page.tsx`, `lib/places/operating-hours.ts` |
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
| 마이그레이션 | 완료 (2026-09-18) | 10건 전부 운영 적용 완료. 마지막은 `20260918000000_place_image_attribution` — `migrate status`가 `Database schema is up to date!`, `migrate diff`가 빈 마이그레이션(drift 0)을 낸다 | — | — | `prisma/migrations/` |
| `Dog` 견종 코드화 | 부분 완료 | `breedCode` · `breedCustom` · `updatedAt` 추가 + 기존 값 백필. 매핑 실패분은 `other` + 원문 보존 | 읽기·쓰기 전환 확인 후 별도 마이그레이션으로 `breed` 컬럼 제거 | P1 | `prisma/schema.prisma:170-176`, `prisma/migrations/20260816000000_dog_breed_code/` |
| PostGIS extension 활성화 | 확인 필요 | 코드는 extension 존재를 전제. 실제 DB에서만 확인 가능 | 배포 환경 확인 | P0 | — |
| `Place.hours` / `hoursNote` | 완료 (2026-09-08) | D-04 구조로 추가. `hours` JSONB(요일 7키, 값이 null이면 휴무) + `hoursNote` TEXT. 마이그레이션 `20260908000000_operating_hours` 적용 완료 — 컬럼 추가만 하는 비파괴 변경이고 기존 4행은 둘 다 NULL로 남았다(backfill 없음) | — | — | `prisma/schema.prisma`, `prisma/migrations/20260908000000_operating_hours` |
| `PlaceImageAttribution` | 완료 (2026-09-18) | D-22. 이미지 1장의 출처(기관·저작권자·저작물명·작성연도·출처 링크·이용 조건)와 **사람 검토 기록**. `imageUrl`이 현재 `Place.thumbnailUrl`과 다르면 승계하지 않는다. `reviewedAt`이 NULL이거나 **공공누리 표시 항목이 비어 있으면** 공개 화면에 이미지가 나가지 않는다 — 검토 체크만으로 통과하지 않는다. 확인되지 않은 항목은 NULL로 둔다 | **운영 적용 완료 (2026-09-18)** — enum 5값·테이블 17컬럼·PK·unique index·FK(ON DELETE CASCADE) 확인, 행 0건. 기존 테이블 행 수 무변경(Place 6 / PlaceCondition 4 / Verification 4 / User 2 / Favorite 2). 관광공사 호스트 이미지 0건이라 **기존 화면 영향 없음**. 애플리케이션 배포가 남았다 | P0 | `prisma/schema.prisma`, `prisma/migrations/20260918000000_place_image_attribution/`, 문서 §12 |
| `Report` 모델 | 미구현 | 없음 | 추가 | P1 | — |
| `Review` 모델 | 미구현 | 없음 | 기획서 v3에서 P2로 이동 | P2 | — |
| `Account`/`Session` | 미구현 | 없음 (JWT 전략이라 불필요) | provider 추가 시 재검토 | P2 | `src/auth.ts:13-15` |
| 잔존 `CarrierPolicy` enum | 부분 완료 | 어떤 모델도 참조하지 않음 | 별도 마이그레이션으로 제거 | P1 | `prisma/schema.prisma:42-49` |

---

## 10. TourAPI 수집 구조

| 영역 | 상태 | 현재 구현 | 남은 작업 | 우선순위 | 근거 파일 |
|---|---|---|---|---|---|
| API 클라이언트 | 완료 (2026-09-18) | `check-tour-api.cjs`(연결 확인) · `export-tour-sample.cjs`(단건) · `collect-tour-area.cjs`(지역 목록 → 끝 페이지까지 + 상세 3종). 동시성 1~4 제한, 15초 타임아웃, 유한 재시도(최대 3, 재시도 불가 오류는 즉시 포기), 실패 내역 분리. **정상 응답(resultCode 0000)이 아닌 데이터는 수집으로 세지 않는다.** 이미 스냅샷이 있는 콘텐츠는 건너뛴다 | 지역·타입 확대는 §7-1·§7-2 결정 후 | P1 | `scripts/collect-tour-area.cjs` |
| 매퍼 | 완료 (2026-09-18) | `prepare-tour-import.cjs` — 스냅샷 → 등록용 배열. `mapy→lat`/`mapx→lng`, 복수 URL 홈페이지 제외, 대표 이미지는 `firstimage` 우선 + `firstimage2` 폴백이며 `cpyrhtDivCd=Type1`만 자동 선택. 분류는 `contentTypeId`+`lclsSystm2`로 정한다 — 12→`TRAVEL`, 39+`FD05`→`CAFE`, 39+`FD01`·`FD02`→`RESTAURANT`(2026-09-20, D-24). 그 밖은 "분류 검토 대상"으로 보고한다. 운영 정보·동반 조건은 **저장하지 않고 제안까지만** 한다 | 38·28·32 매핑(§7-2) | P1 | `scripts/prepare-tour-import.cjs` |
| 다건 변환 | 완료 (2026-09-18) | `--dir`로 여러 스냅샷을 **등록용 배열 1개 + 메타 1개**로 묶는다. 항목마다 원본 파일·해시·수집 시각·이미지 선택이 연결된다. 같은 콘텐츠 ID의 스냅샷이 겹치면 조용히 고르지 않고 멈춘다(`--latest`로 명시 선택). 변환/제외/실패 건수를 나눠 보고 | — | — | `scripts/prepare-tour-import.cjs` |
| 등록 전 사람 검토 | 완료 (2026-09-18) | D-23. 등록용 배열은 같은 이름의 `.meta.json`과 짝으로만 존재하고, `review-tour-import.cjs --reviewer --confirm`으로만 검토자·시각·**검토 대상 해시**가 기록된다. 등록기는 DB에 붙기 전에 메타 존재·해시·경로·건수·ID 대응·검토 상태를 모두 본다. 메타를 빼서 우회할 수 없고 수기 배열도 `--manual`로 같은 계약을 따른다 | — | — | `scripts/tour-import-meta.mjs`, `scripts/review-tour-import.cjs` |
| 오프라인 검증 | 완료 (2026-09-18) | `--validate-only`는 **DB·API에 접속하지 않고** 형식 검증과 사람 검토 대기를 나눠 보여준다. 기존 dry-run은 실제 DB에 접속해 INSERT 후 ROLLBACK하므로 **다른 명령이다** | — | — | `scripts/import-places.mjs` |
| 이미지 출처 연결 | 완료 (2026-09-18) | D-22. 등록 시 `PlaceImageAttribution`을 **검토 전 상태로** 만든다(새로 만든 장소에만). 공개 조회가 근거 없는 이미지를 주소째 내리고, 목록 카드·상세가 같은 `PlaceThumb`으로 ko/en 출처와 원본 링크를 낸다. 출처 링크에 serviceKey가 든 API 주소를 쓰지 않는다 | 운영 DB 마이그레이션 적용 후 실제 데이터로 확인 | P0 | `src/lib/places/image-attribution.ts`, `src/components/places/PlaceThumb.tsx` |
| 중복 방지 Import | 완료 (2026-09-08) | `tourApiId` unique + `ON CONFLICT DO NOTHING`. 관리자가 조건을 채우고 공개로 바꿔 둔 장소를 재실행이 되돌리지 않도록 **UPDATE 하지 않는다**. 같은 원본 3건을 넣어 신규 1 · 건너뜀 2로 실측 | — | — | `scripts/import-places.mjs` |
| 후보 데이터 격리 | 완료 (2026-09-08) | D-05대로 `Place` + `visibility=DRAFT`. `PlaceCondition`·`Verification`을 만들지 않는다 — Import는 조건을 추측하지 않는다. 사용자 조회가 `VISIBLE` **그리고** 검증 이력을 모두 요구하므로(`PUBLIC_PLACE_WHERE`) 후보는 두 조건 모두에서 걸러진다 | — | — | `scripts/import-places.mjs` |
| 실행 형태 | 완료 (2026-09-08) | D-06대로 `npm run import:places -- --file <경로>`. **기본이 dry-run**이고 `--commit`을 붙여야 쓴다(운영 Supabase가 하나뿐이라). 전체를 한 트랜잭션에 두고 항목마다 SAVEPOINT를 둬 부분 실패를 허용한다. 처리/신규/건너뜀/실패를 사유와 함께 출력 | — | — | `package.json`, `scripts/import-places.mjs` |
| 관리자 후보 대시보드 | 미구현 | 없음 | 목록·필터·자동 채움 | P1 | — |
| 생성물 관리 | 완료 (2026-09-18) | `/data/tour-api/`를 `.gitignore`에 넣었다(`data/` 전체는 막지 않는다). 파일을 지워도 출처가 남도록 원본 파일명·스냅샷 해시·수집 시각·변환 ID를 DB(`PlaceImageAttribution`)에 함께 저장한다 | — | — | `.gitignore`, `scripts/import-places.mjs` |
| 분류·조건 매핑 | 완료 (2026-09-20) | D-24. `tour-classification.mjs`(분류코드 → Category, 관광타입별 `detailIntro2` 필드명)와 `tour-pet-policy.mjs`(반려견 원문 → 제안 값·근거·미확인). **상호로 분류하지 않고, "전 견종"·"자유이용"·"야외 좌석"을 넓혀 읽지 않는다.** 단위 테스트 35건이 금지 해석을 고정한다 | `acmpyTypeCd` 동반 불가 값을 실데이터로 보지 못함 | — | `scripts/tour-classification.mjs`, `scripts/tour-pet-policy.mjs`, `src/lib/places/tour-classification.test.ts` |
| 검토 시트 | 완료 (2026-09-20) | 변환이 `import-<...>.review.md`를 함께 만든다. **원문 → 제안 값 → 근거 → 미확인** 대조표이고 관리자 화면 옆에 놓고 쓴다. 등록기는 읽지 않는다 | — | — | `scripts/prepare-tour-import.cjs` |
| 코드표 캐시 | 완료 (2026-09-20) | `--refresh-codes`가 `lclsSystmCode2`·`ldongCode2`를 `data/tour-api/codes.json`에 담는다. **이 명령은 장소를 수집하지 않는다** — 처음엔 지역 수집까지 이어져 상세 543회를 부른 버그가 있었고 고쳤다 | — | — | `scripts/collect-tour-area.cjs` |
| 수동 등록과의 중복 | 완료 (2026-09-20) | 등록기가 `tourApiId` 없는 기존 장소와 이름(공백·대소문자 무시)·100m 근접을 대조해 **보고만** 한다. 격리 DB에서 이름 일치·33m 근접 두 경우 모두 검출 확인. 자동 병합·삭제 없음 | — | — | `scripts/import-places.mjs` |
| 실제 호출 예산 | 완료 (2026-09-20) | D-25. `tour-api-budget.mjs`가 `fetch` 직전에 차감하고 `data/tour-api/call-budget.json`에 보존한다. 명령·재실행·병렬 레인을 가로질러 공유되고, 상한에 닿으면 그 다음 요청을 **보내지 않는다**. 호출하는 스크립트 3개 모두 같은 게이트를 쓴다. 가짜 HTTP 서버로 검증(공공 API 미사용) | — | — | `scripts/tour-api-budget.mjs`, `src/lib/places/tour-api-budget.test.ts` |
| 소개·주차 연결 | 완료 (2026-09-20) | `Place.descriptionKr`/`descriptionEn`/`parking`/`parkingNote` 추가(마이그레이션 `20260920000000_place_description_parking`). 관리자 폼 → 저장 → 공개 상세까지 격리 DB로 왕복 확인. **가져오기는 이 값을 채우지 않는다** — 검토 시트의 원문을 보고 사람이 넣는다 | 운영 DB 마이그레이션 미적용 | P0 | `prisma/schema.prisma`, `src/lib/places/place-fields.db.test.ts` |
| 응답 원문의 HTML | 완료 (2026-09-20) | `parking`·`usetime`에 `<br>`이 섞여 온다(대전 14곳 중 4곳). `decodeApiText`가 태그를 지우고 줄바꿈으로 바꾼다. 그대로 두면 화면에 태그가 글자로 나오고 운영시간 파서가 구간을 잘못 읽는다 | — | — | `scripts/tour-pet-policy.mjs` |
| 동반 범위 ≠ 실내 | 완료 (2026-09-20) | D-26. `acmpyTypeCd`로 `indoor`를 제안하지 않는다 — 공원의 `"전구역 동반가능"`은 실내 입장 확인이 아니다. 범위는 `accompanyScope`로 보존하고 `indoor`는 미확인으로 남는다 | — | — | `scripts/tour-pet-policy.mjs` |
| 원본 정보 적재 | 완료 (2026-09-20) | D-27. 등록기가 `descriptionKr`·`usageGuideKr`·`parking`·`hours`를 함께 넣는다. 계절·시설별 시간은 `hours`가 아니라 `usageGuideKr`로 간다. 격리 DB에서 importer→DB→조회→브라우저 렌더까지 확인 | 운영 DB 마이그레이션 미적용 | P0 | `scripts/import-places.mjs` |
| 마이그레이션 전 호환 | 완료 (2026-09-20) | 새 컬럼을 읽어 장소 상세가 500이던 것을 `schema-compat.ts`로 복구(운영 DB 무변경). 마이그레이션 적용 후 삭제할 임시 장치 | 적용 후 제거 필요 | P1 | `src/lib/places/schema-compat.ts` |
| 관광타입별 소개 필드 | 완료 (2026-09-20) | 12·39에 더해 **28(레포츠)·32(숙박)·38(쇼핑)** 필드명을 실제 응답에서 확인해 넣었다. 관광지 필드로 읽으면 전부 빈 값이라 "정보 없음"으로 잘못 적힌다. 숙박은 운영시간 필드가 없어 `hours: null`로 두고 입실·퇴실은 안내로만 남긴다 | — | — | `scripts/tour-classification.mjs` |
| 분류 검토 후보 11건 | 정리 완료 (2026-09-20) | 레포츠 5 · 숙박 4 · 쇼핑 1 · 문화시설 1. 결정 문서로 근거·선택지 정리. **결정 대기** | 상세 미수집 7건(21회 필요) | P1 | `docs/03-analysis/분류-검토-후보-11건.decision.md` |
| 잔존물 | 부분 완료 | 관리자 폼의 `tourApiId` 수동 입력 필드, 미사용 `TOUR_API_ERROR` 코드 | — | — | `components/admin/PlaceForm.tsx`, `src/lib/errors.ts:7` |

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
| 로그인 경로 로케일 | 완료 | `pages`를 locale 없는 `/login`으로 두고 next-intl 미들웨어가 기존 정책(NEXT_LOCALE 쿠키 → Accept-Language → `DEFAULT_LOCALE=en`)대로 `/ko/login`·`/en/login`으로 넘긴다. `?error=` 쿼리도 함께 넘어간다. 앱 쪽 진입점(`requireUser`·`requireAdminPage`·`Header`·`FavoriteButton`)은 이미 locale을 유지하고 있었다 | — | — | `src/auth.ts`, `src/proxy.ts` |
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
| 운영시간 입력 | 완료 (2026-09-08) | 요일별 시작·종료 7행(`type="time"`) + 메모 1줄(최대 100자). 양쪽을 비우면 그 요일 휴무, 전 요일을 비우면 미입력(NULL). 한쪽만 채우면 오류. 메모는 사용자 화면에 그대로 나가므로 영어 입력 안내를 뒀다 | — | — | `components/admin/PlaceForm.tsx` |
| 관리자 대시보드 | 미구현 | `/admin` 라우트 자체 없음 | 통계 화면 | P1 | — |
| 후보 목록 | 미구현 | 없음 | TourAPI 파이프라인 후속 | P1 | — |
| 신고 처리 | 미구현 | 없음 | 신고 기능 후속 | P1 | — |
| 폼 i18n | 미구현 | 옵션 라벨이 한국어 하드코딩 | i18n 적용 | P1 | `components/admin/PlaceForm.tsx:70-80` |

---

## 16. 다국어 (영어 · 한국어)

| 영역 | 상태 | 현재 구현 | 남은 작업 | 우선순위 | 근거 파일 |
|---|---|---|---|---|---|
| 로케일 라우팅 | 완료 | `next-intl` v4, `["en","ko"]`, default `en`, `localePrefix:"always"` | — | — | `src/i18n/routing.ts`, `src/proxy.ts` |
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
| 다크모드 미사용 | 완료 (2026-09-08) | `.dark{}` 블록 제거 완료. `ui/sonner.tsx`의 `useTheme` import를 걷어내고 `theme="light"`로 고정한 뒤 `next-themes` 패키지를 제거했다(`npm uninstall`). 라이트 단일이라 런타임에 테마를 고를 이유가 없다(`DESIGN.md` §4·§12) | — | — | `ui/sonner.tsx`, `package.json` |
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
| 지도 상태 | 완료 (2026-09-08) | 로딩/오류/키없음/좌표없음 4분기 전부 i18n. 오류에만 재시도 | — | — | `MapPanel.tsx` |

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
| 드롭다운 접근성 | 완료 (2026-09-08) | Radix `DropdownMenu` + `RadioGroup`. 트리거에 `aria-expanded`·`aria-haspopup="menu"`·`aria-controls`, 항목 4개가 `role="menuitemradio"` + `aria-checked`, 위치 없을 때 `거리순`은 `aria-disabled`로 키보드 이동에서 빠진다. `▲▼` 문자를 `ChevronDown` 아이콘(`aria-hidden`)으로 교체, `aria-label="정렬: {현재값}"` 추가. Portal로 나가 패널 `overflow-hidden`에 잘리지 않는다 | — | — | `SortDropdown.tsx` |
| 범위 밖 배너 버튼 터치 타깃 | 완료 (2026-09-08) | `inline-flex h-11 items-center`로 44px 확보. 프로젝트의 다른 텍스트 버튼(`MapPanel.tsx:293`)과 같은 형태 | — | — | `PlacesClient.tsx:461-467` |
| Skip link | 완료 (2026-09-08) | `Header` 첫 요소로 `본문으로 건너뛰기`/`Skip to content`. 페이지의 **첫 tabbable 요소**이고 `#main-content`로 포커스를 옮긴다 | — | — | `Header.tsx`, 대상 4곳 |
| 선택·결과 고지 | 완료 (2026-09-08) | **선택**은 `PlacePreviewCard`가 제목(`tabIndex={-1}`)으로 포커스를 옮겨 읽힌다. **결과 수**는 화면 표시가 둘 다 조건부로 숨어(`display:none`은 live region으로 동작하지 않음) 별도 sr-only `role="status"`를 뒀다 — 필터 변경 시 `장소 4곳`→`장소 3곳` 갱신 확인 | — | — | `PlacesClient.tsx`, `PlacePreviewCard.tsx:141-144` |
| 반응형 브레이크포인트 | 완료 | lg/xl 기준 3분할·오버레이·시트 전환. 모바일이 데스크톱 축소판이 아님 | — | — | `PlacesClient.tsx:119-360` |
| 대비비 실측 | 부분 완료 (2026-09-08) | **측정 완료** — 텍스트 조합 19건 중 17건이 4.5:1 통과. 미달 2건과 비텍스트(테두리) 3건은 토큰 값 변경이 필요해 `DESIGN.md` 결정 대기 (아래 §접근성 보완) | 토큰 결정 후 반영 | P1 | `globals.css` |

---

## 20. 품질 · 운영

| 영역 | 상태 | 현재 구현 | 남은 작업 | 우선순위 | 근거 파일 |
|---|---|---|---|---|---|
| 테스트 | 완료 | **vitest 4.1.11**. `npm test` = **636 통과 / 18 skip**(그 18건이 `npm run test:db`에서 **18 통과**). 09-10 동물병원 40건, 09-11 URL 검증 36건 + 병원 스키마 배선 5건 | 컴포넌트 렌더 테스트는 없음(jsdom·RTL 미도입) — P2. 브라우저 E2E는 스크립트로만 돌렸고 저장소에 테스트로 편입하지 않았다 | P1 | `vitest.config.mts`, `src/**/*.test.ts`, `scripts/test-db.mjs` |
| 오류 추적 | 미구현 | Sentry 미설치 | 도입. CSP 위반 보고 수집처가 없는 것도 같은 원인이다(`NEXT_PUBLIC_SENTRY_DSN` 비어 있음) | P1 | `package.json` |
| 보안 헤더 · CSP | 부분 완료 | **2026-09-11 도입.** `Content-Security-Policy-Report-Only`(차단 없음) + `X-Frame-Options: DENY` + `X-Content-Type-Options: nosniff` + `Referrer-Policy`. 그전에는 헤더 설정이 저장소에 **하나도 없었다** | **강제 전환 미완.** 프레임워크가 만드는 nonce 없는 인라인 스크립트가 페이지당 14~20개라 `script-src 'self'`로 바꾸면 하이드레이션이 깨진다. nonce 도입의 대가로 계산했던 **정적 생성 상실은 2026-09-12에 사실이 아님이 확인됐다** — 미리 만들어지는 페이지가 처음부터 없었다(`prerender-manifest.json` 2건 · `.html` 1개). 남은 검토는 nonce의 스트리밍·`next/script` 전파와 위반 수집처다 | P1 | `next.config.mjs`, `docs/02-design/CSP-적용-현황.md` |
| 의존성 보안 | 부분 완료 | **2026-09-12 Next 16 이행.** Next 16.3.5(Active LTS) · **ESLint 8 → 9.39.5 + flat config**(`eslint-config-next@16`의 peer가 `eslint >= 9`). `npm audit` 20건 → 17건 · critical 0 — 번들 postcss 경유 4건과 ESLint 8이 끌던 js-yaml 4건이 닫혔고, 남은 17건은 `prisma` CLI 체인이다. 직전 2026-09-11: Next 15.5.25 · **React/react-dom 19.2.8 + 타입 19.2.x** · next-auth beta.32 · postcss 8.5.28 · **vitest 4.1.11**(5.0.0 불필요 — 공지 수정 버전은 4.1.11). `npm audit` 전체 **critical 0**, Next.js·Auth.js·React·vitest 계열 공지 0건. 검증 도구로 `playwright-core` 추가 | **Next 15 EOL(2026-10-21) 대응은 끝났다.** `prisma`가 `dependencies`에 있어 CLI 개발 서버 체인(hono·mysql2 등)이 프로덕션 트리로 계산된다(런타임 경로 아님) — 이것만 남았다 | P1 | `package.json`, `nextjs.org/support-policy` |
| 빌드·타입체크 검증 | 완료 | **2026-09-12 실행(Next 16.3.5 + React 19.2.8): `tsc --noEmit` 0오류 · `eslint src` 0 error / 12 warning · `vitest run` 636 통과/18 skip · `test:db` 18/18 · production 빌드 통과.** 빌드는 Turbopack 기본이고 **격리 DB를 명시해** 돌렸다 — 운영 DB를 보면 `VetClinic`이 없어 `prisma:error`가 찍힌다. 미리 만들어지는 페이지는 `/favicon.ico`·`/_global-error` 2건뿐이다(이전 판의 `정적 28/28`은 진행 카운터였고 산출물이 아니었다) | **warning 12건**은 `eslint-config-next@16`이 들여온 `react-hooks/refs`·`set-state-in-effect`이고 전부 이행 이전 코드다. `off` 대신 `warn`이라 매 실행마다 출력된다 | P1 | `eslint.config.mjs` |
| 미사용 코드 | 부분 완료 | `mock-places.ts`, `haversineDistance`, `formatWalkingTime`, `lib/result.ts` 참조 0건 | 정리 | P1 | grep 결과 |
| 문서 버전 관리 | 완료 | `docs/*.md`를 git 추적으로 전환하고 원본 PDF 2건 제거 (커밋 `df2ffb3`) | — | — | `git log` |
| 서비스 지역 제한 (대전 단독) | 완료 | 코드에 지역 개념 없음. 공개는 "검증 이력 + `visibility=VISIBLE`"로만 통제됨 | **D-08 확정**: 코드 변경 없이 **운영 규칙으로 강제**한다 — 운영자가 대전 장소만 검증·공개. 지역 필드는 2단계 확장 시 도입 | — | `prisma/schema.prisma`(지역 필드 없음), 기획서 v3 §9-5 |

---

## 21. 동물병원 탐색 · 문의 (2026-09-10 신설)

> **이 절 전체가 "코드는 있고 운영에는 없다"는 상태다.** 마이그레이션을 적용하지 않았으므로
> 운영 DB에 테이블이 없고, 화면은 열리지만 데이터가 없다. 아래 `완료`는 **코드 기준**이다.

| 영역 | 상태 | 현재 구현 | 남은 작업 | 우선순위 | 근거 파일 |
|---|---|---|---|---|---|
| 목록 · 상세 | 완료 | `/[locale]/vets`, `/[locale]/vets/[id]`. 카드 순서 = 이름 → 구·주소 → 시간 → 응대 → 확인일 → 전화 | — | — | `src/app/[locale]/(public)/vets/` |
| 검색 · 구 선택 · 정렬 | 완료 | `filterVetClinics` + `sortVetClinics`. 위치가 있으면 가까운 순, 없으면 `최근 확인순`으로 기준을 명시 | — | — | `src/lib/vets/filtering.ts` |
| 연락 수단 | 완료 | 전화·지도·주소 복사를 카드와 상세가 공유. 지도 링크는 **API 키가 필요 없다** | — | — | `src/components/vets/VetContactActions.tsx` |
| 진료시간 · 야간 조건 | 완료 | 기존 `operating-hours` 재사용. **시간 미등록 ≠ 휴무**를 화면 문구로 구분 | — | — | `src/lib/places/operating-hours.ts`, `VetServiceBadge.tsx` |
| 영어 응대 4상태 | 완료 | `UNKNOWN`은 중립 표기. **`24시`·영어 홈페이지로 추정하지 않는다** — 상태는 관리자 입력값이다 | — | — | `src/lib/vets/types.ts` |
| 항목별 확인 근거 | 완료 | 4항목(`BASIC`·`HOURS`·`ENGLISH_SUPPORT`·`AFTER_HOURS`)을 따로 확인·표시. 재확인 임계 **30일**(일반 장소 90일과 분리) | — | — | `src/lib/vets/verification.ts`, `constants.ts` |
| 고정 한국어 문의 문구 | 완료 | 영어 뜻·복사·확대 다이얼로그 | — | — | `src/lib/vets/inquiry.ts`, `KoreanInquiryPhrases.tsx` |
| 관리자 등록 · 수정 · 공개 게이트 | 완료 | 임시저장·공개·숨김·확인 기록. 공개 기준은 **기본 정보에만** 건다(D-20) — 그러지 않으면 어떤 병원도 공개할 수 없다 | **D-20 게이트는 주소 문자열의 존재만 본다.** 동 단위 주소도 자동 통과하므로 지금 유일한 방어선은 사람 검수 | P1 | `src/app/[locale]/(admin)/admin/vets/`, `src/lib/vets/publish.ts` |
| 관리자 메모 비공개 | 완료 | `adminNote`·`verifiedBy`가 공개 `select`에 없다(테스트로 고정) | — | — | `src/lib/vets/queries.ts`, `public-visibility.test.ts` |
| 외부 URL 스킴 검증 | 완료 | 2026-09-11 추가. `website`·`sourceUrl`이 그전에는 **검증이 아예 없었다**(`optionalText`) | — | — | `src/lib/vets/validation.ts`, `src/lib/validation/url.ts` |
| **DB 마이그레이션 적용** | **미구현** | `prisma/migrations/20260910000000_vet_clinic/` 작성·검토 완료. `prisma validate` 통과 | **운영 반영 미실행.** 절차와 되돌리는 법은 문서로만 있다 | **P0(운영)** | `docs/02-design/동물병원-P0-운영-반영-절차.md` |
| 병원 데이터 | 미구현 | 대전 표본 5곳 수집(서구·유성구). 출처가 **병원명·전화·소재지(동 단위)만** 주므로 진료시간·영어 응대·야간은 전부 `UNKNOWN` | 도로명·건물번호·좌표·시간·응대 확보는 **전화 확인이 필요한 운영 작업** | P0(운영) | `scripts/vet-samples.daejeon.json` |
| AI 번역 | **제외** | 미구현이 아니라 **하지 않기로 한 결정**(2026-09-10 사용자). ko/en 메시지와 고정 문의 문구는 사람이 검수한 문안 | — | — | `docs/03-analysis/동물병원-탐색-문의-P0.analysis.md` §1 |
| P1 · P2 | 미구현 | 진료 준비 카드, 즐겨찾기·오류 제보, 예약·결제, 병원 직접 응답 | 계획서 참조 | P1/P2 | `docs/04-report/Paw_Spot_Global_Vet_Clinic_Plan_v0.1.md` |

**검증 상태**

| 확인 | 방법 | 결과 |
|---|---|---|
| 판정·필터·공개 기준·가시성 | 자동 테스트 40건 | ✅ 통과 |
| 저장 · 조회 · 권한 | 격리 DB 통합 테스트 18건 | ✅ **2026-09-11 18/18 통과.** URL 검증 스키마 변경 이후 기준이다. 마이그레이션 `20260910000000_vet_clinic`도 실제 PostGIS 17-3.5에 적용돼 통과했다 |
| 병원 화면 실제 DB 렌더 | 격리 DB에 seed(VISIBLE 4·HIDDEN 1·DRAFT 5) 후 production 빌드 | ✅ **2026-09-11 확인.** `/ko/vets` `병원 4곳` · `/en/vets` `4 clinics` · 상세 ko/en 200, 콘솔 오류·하이드레이션 오류 0건. **"빌드 성공"과 별개로 기능 동작을 확인한 것이다** |
| 병원 URL 스킴 검증 배선 | `src/lib/vets/validation.test.ts` 5건 | ✅ **2026-09-11 추가·통과.** `website`·확인기록 `sourceUrl`이 `javascript:`·`data:`·탭 삽입 변형을 저장 단계에서 막고, `""`·`null`은 그대로 `null`이 된다 |
| 화면(ko/en, 모바일 390×844) | dev 전용 임시 fixture 페이지 → 삭제 | ✅ 2026-09-10 확인 |
| 비관리자 거부 경로 | 격리 DB + 테스트 전용 `AUTH_SECRET` | ✅ **2026-09-11 확인.** `USER` 세션 → `/ko/forbidden`. **서버 액션 재생으로 저장 자체도 막히는 것을 따로 확인** |
| 관리자 폼 저장·수정·값 유지 | 브라우저 실조작(격리 DB) | ✅ **2026-09-11 확인.** 등록 → 목록 노출 → 편집 재진입 값 유지 → 수정 저장 → 새로고침 후 유지 → DB 값 일치 |
| 폼 접근성 (라디오 묶음) | DOM 점검 | 🔧 **2026-09-11 수정.** 영어 응대·야간 진료 라디오 8개에 `name`이 없어 묶음으로 인식되지 않았다. `name` + `role="radiogroup"` 추가 (제출 구조는 그대로) |
| **운영 DB 왕복** | — | ❌ 미확인. 마이그레이션을 적용하지 않았다(범위 밖) |

---

## P0 목록 (MVP 출시 차단)

**2026-09-06 재대조.** 각 항목을 요구사항 원문(`개발명세서_v2` · `기획서_v3` · D-01~D-12)과 실제 코드·사용 경로·테스트로 대조했다.
파일 존재나 import 부재만으로 완료 판정하지 않고, 요구사항이 말하는 **동작**이 성립하는지를 근거로 적었다.

| 상태 | 개수 |
|---|---|
| 완료 | 20 |
| 부분 완료 | 0 |
| 미착수 | 0 |

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
| 10 | 상세에 거리·길찾기·공유·즐겨찾기 액션 | **완료** (2026-09-08) | 액션 4종 + 거리. 브라우저 실측 — 길찾기 `rgb(37, 99, 235)`(primary)·Google Maps·새 탭, 전화 `tel:`, 공유 버튼, 즐겨찾기 `즐겨찾기 추가`, 4개 모두 높이 44px. 대전시청 좌표로 들어가면 `내 위치에서 4.6km`(DB 실측 거리와 일치), 좌표 없이 들어가면 거리 미표시. 미리보기의 `상세 정보` 링크가 위치를 실어 보낸다. **공유 경로에 좌표가 없음을 직렬화된 prop으로 확인**(`/ko/places/{id}`) | 정보 섹션의 `Google Maps에서 보기` 텍스트 링크는 길찾기 액션과 중복이라 제거했고 `info.viewOnMaps` 키도 함께 지웠다 |
| 11 | 운영시간 저장·입력·표시 (`hours`+`hoursNote`) | **완료** (2026-09-08) | D-04 구조를 전 계층에 넣었다. 마이그레이션 적용 후 실측 — 컬럼 2개 추가·기존 4행 NULL 유지, 상세 페이지가 미입력 문구를 렌더, 관리자 폼에 `type="time"` 입력 14개(`hours.{요일}.{open\|close}`)와 maxLength 100 메모. 값이 있을 때의 렌더는 임시 미리보기 + fixture로 ko/en 확인 후 페이지를 삭제했다(DB 쓰기 없음) — `월–금/토/일 휴무` 묶기, **월·수만 영업 시 4줄로 남고 합쳐지지 않음**, `금–토 18:00–23:59` | 규칙 18건을 테스트로 고정. 실제 운영시간 데이터는 아직 없다 |
| 12 | 예방접종 `UNKNOWN` 행 숨김 | **완료** | `display.ts` `showsVaccinationRow()`가 `required`/`not_required`만 통과. `BeforeYouGoCard.tsx:127`에서 실제 사용. `display.test.ts` 3건이 `unknown`·`null` 미표시를 고정 | — |
| 13 | `Ask the store in Korean` 렌더 분기 제거(코드 보존) | **완료** | 상세 페이지에 import·렌더 없음. `KoreanInquiryBox.tsx`와 메시지 키는 보존. `korean-inquiry.test.ts`가 **비노출과 보존을 동시에** 고정 | — |
| 14 | 후보 Import 로컬 스크립트 | **완료** (2026-09-08) | D-05(`Place`+`DRAFT`, 조건·검증 미생성)·D-06(로컬 스크립트 수동 실행) 둘 다 구현. 좌표 없는 항목은 기본값을 넣지 않고 건너뛰며 실패 목록에 남긴다. 검증 규칙 9건을 테스트로 고정(`import-validation.test.ts`가 스크립트의 `validate`를 직접 import). dry-run으로 실측 — 유효 1·좌표없음 1·분류오류 1 파일에서 신규 1·실패 2, 같은 원본 3건에서 신규 1·건너뜀 2, 실행 후 DB의 `DRAFT` 행 0건(되돌려짐) | **TourAPI를 직접 호출하지 않는다.** 정규화된 JSON 파일을 받는다 — 기획서 v3 §8-1이 `TourAPI 또는 원본 데이터`로 열어 둔 범위다. **2026-09-08 `--commit` 실제 적재 완료**(사용자 승인) — 샘플 2건(`IMPORT-SAMPLE-0001`·`0002`)이 `DRAFT`로 들어갔고, 같은 파일 재실행은 신규 0·건너뜀 2로 멱등, 조건·검증 행 0건(D-05 준수), 공개 조건 충족 장소는 4건 그대로다 |
| 15 | `auth.ts`의 `/en/login` 하드코딩 제거 | **완료** (2026-09-06) | NextAuth 설정은 요청별로 달라질 수 없으므로 `pages`를 `/login`(locale 없음)으로 두고 미들웨어에 협상을 맡겼다. 프로덕션 빌드에서 확인: `Accept-Language: ko` → `/ko/login?error=...`, `en` → `/en/login?error=...`, `NEXT_LOCALE=ko` 쿠키가 `Accept-Language: en`보다 우선, 헤더 없으면 `DEFAULT_LOCALE=en`. 보호 라우트 6개가 각자 locale의 로그인으로 가며 `callbackUrl`을 유지(`/ko/favorites` → `/ko/login?callbackUrl=%2Fko%2Ffavorites`), `/ko` 응답에 `/en/login` 흔적 0건, 리다이렉트 루프 없음. `FavoriteButton`은 `callbackUrl`에 쿼리를 포함하도록 고쳐 목록 필터가 로그인 후에도 남는다 | 실제 Google OAuth 왕복은 미검증(§미검증 항목) |
| 16 | 필터·정렬·카테고리 URL 반영 | **완료** (2026-09-06) | `place-list-params.ts`가 파싱·직렬화를 맡고 `usePlaceListState`가 `useSearchParams`에서 상태를 파생한다(state 복사 없음 → 양방향 동기화 자체가 불필요). 카테고리·정렬·필터는 `pushState`, 검색어는 300ms 디바운스 `replaceState`. 잘못된 값·중복 파라미터·삭제된 `exclude-unknown`은 기본값으로 흡수. 초기화는 필터 4개만 지운다. 브라우저에서 직접 접속·새로고침·뒤로가기·초기화 전부 확인, 필터 변경 시 서버 요청 0건 | — |
| 17 | `border-strong` 무효 클래스 수정 | **완료** (2026-09-06) | 6곳 전부 `border-border-strong`으로 교체. 토큰 선택 근거는 이름 유사성이 아니라 (a) `tailwind.config.ts`가 `border.strong`을 `--color-border-strong`으로 매핑한다는 점과 (b) 같은 성격의 컨트롤(칩·아웃라인 버튼·입력)에서 이미 `border-border-strong`을 쓰고 있다는 선례다. 잔여 무효 참조 0건(`bg-border-strong` 1곳은 유효 클래스라 제외). `/ko`·`/en`의 히어로 입력·정렬 드롭다운·필터 칩·초기화 버튼에서 테두리가 보이고 이상 없음 | — |
| 18 | 지도 문구 i18n + 재시도 / `next-themes` 제거 | **완료** (2026-09-08) | 하드코딩 영어 **5건**(계획 시점 3건으로 적었으나 `noCoordinates`·`myLocation` aria-label이 더 있었다)을 `places.map.*`로 옮겼다. `error`에 재시도 버튼 추가. 선언만 되고 쓰이지 않던 `placeholder` prop과 `places.list.mapPlaceholder` 키도 함께 제거했다. `next-themes`는 `sonner.tsx` 의존을 끊고 `npm uninstall` — typecheck·lint·test·클린 빌드 전부 통과. 브라우저에서 `/ko`·`/en`의 `내 위치로 이동`/`Move to my location` 렌더 확인 | `error`·`no-key`·`noCoordinates` 상태는 화면으로 재현하지 못했다(Maps 스크립트 실패나 키 제거가 필요). `route-state-messages.test.ts`가 5개 키를 고정한다 |
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
| #18 지도 `error` 화면 | **2026-09-08 재시도 실패.** `no-key`·`noCoordinates`는 이날 화면으로 확인했다(아래 검증 보강). `error`만 남았다 — Maps 스크립트 로드를 실패시켜야 하는데, 이 환경에서는 **탭이 실제로 그려질 때만 지도가 초기화된다**. 스크립트를 가로채려면 관찰자를 미리 심어야 하고 그러려면 백그라운드 창이 필요한데, 백그라운드에서는 지도 자체가 초기화되지 않아 두 조건이 동시에 성립하지 않는다. 재시도 버튼 배선은 코드로만 확인, 문구는 `route-state-messages.test.ts`가 고정 |
| ~~#20 모바일 시트에서의 범위 배너~~ | **2026-09-08 검증 완료** (아래 검증 보강) |
| #20 공개 장소 0건일 때의 대전 fallback 중심 | 좌표 있는 장소가 4건이라 `SERVICE_AREA_CENTER`가 초기 중심으로 쓰이는 경로를 화면으로 재현하지 못했다. 위치를 껐을 때의 되돌리기 경로로만 확인 |
| #4 카드 카테고리 라벨 | 공개 장소 4건이 전부 `CAFE` — `TRAVEL` 카드가 없어 라벨 렌더 미확인 |
| ~~#9 정렬·필터 변경 후 마커 재선택~~ | **2026-09-08 검증 완료** (아래 검증 보강) |
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
| `next build` / `tsc --noEmit` 통과 여부 | 로컬 실행 | 전체 | ✅ **2026-09-12 Next 16.3.5에서 전부 통과** (typecheck 0 · `eslint src` 0 error/12 warning · test 636 통과/18 skip · production 빌드). 미리 만들어지는 페이지는 2건뿐이다 — 이전 판의 `정적 28/28`은 산출물이 아니었다 |
| Google Maps API 키 도메인 제한 설정 | Google Cloud Console | 보안 | 미확인 |
| 지도 `Google 지도를 제대로 로드할 수 없습니다` 오버레이 | Google Cloud Console (결제·API 사용 설정·키 제한) | 지도 | ❌ **2026-09-11 실패 확정 — 지도가 동작하지 않는다.** production 빌드에서 공개(`/ko/places`)·관리자(`/ko/admin/places/new`) 모두 오버레이가 뜬다. Google 네트워크 응답은 **전부 200**(31·27건)이라 **스크립트 다운로드 성공은 지도 동작의 증거가 아니다.** 콘솔 오류는 `Google Maps JavaScript API error: BillingNotEnabledMapError` 하나. **관리자 지도를 클릭해도 위도·경도 칸이 채워지지 않는다.** 코드 결함이 아니라 외부 결제/API 설정 문제다 — 확인 순서와 해결 후 재검증 목록은 `docs/02-design/CSP-적용-현황.md` §3-5 |
| `데오` 장소 좌표 | DB 읽기 + 지오코딩 대조 | 데이터 | ❌ **2026-09-07 확정 — 좌표가 틀렸다.** `lat=35, lng=124`로 정확히 정수이며 스키마 유효범위(위도 33~43·경도 124~132)의 하한값이다. 실제 지점은 서해 바다, 대전시청에서 341km. 다만 주소 `대전서구도안북로93번길`에 **건물번호가 없어** 검증된 좌표를 만들 수 없다. **수정 보류 — 완전한 주소 필요** |
| `테스트 카페` 공개 여부 | 운영 판단 | 데이터 | ⚠️ **2026-09-07 발견.** 좌표가 대전시청과 정확히 일치(0.0km)하고 주소 `은계 중앙로 115`에 시·구가 없다. 이름 그대로 테스트 데이터로 보이는데 `VISIBLE`로 공개 중이다 |
| `몽베르트`·`화람` 좌표 | OSM Nominatim 교차 확인 | 데이터 | ✅ **2026-09-07 확인 — 이상 없음.** 몽베르트(36.3484, 127.4553)는 동구 충정로 구간 안, 화람(36.3358, 127.3367)은 유성구 원신흥동 안. 지번 단위 정밀도는 확인 못 했으나 틀렸다고 볼 근거가 없어 수정하지 않았다 |
| 색 대비비 4.5:1 충족 여부 | axe / Lighthouse 실측 | P1 접근성 | 미확인 |
| `Accept-Language` 기반 로케일 협상 동작 | 런타임 확인 | P1 i18n | 미확인 |
| `docs/*.md` git 추적 여부 결정 | 사용자 결정 | 문서 관리 | ✅ **추적하기로 결정** — 커밋 `df2ffb3` |
| 격리 DB 통합 테스트 18건 | `npm run test:db` (Docker 필요) | §20, §21 | ✅ **2026-09-11 해소 — 18/18 통과.** Docker Desktop을 기동해 실행했다. `vets/validation.ts` 변경 이후 기준이다 |
| CSP 위반 실측 | 브라우저에서 ko/en × 목록·상세·지도·로그인 | §20 | ✅ **2026-09-11 해소.** Chrome 확장 대신 `playwright-core`로 설치된 Chrome을 구동해 10개 화면 측정. 위반 235건 전부 `disposition: report`(차단 없음), **하이드레이션 오류 0건**. `unsafe-eval` 위반의 정체는 Maps가 아니라 **zod의 JIT 탐지 코드**이며 `try/catch`로 감싸여 있어 **`unsafe-eval`은 필요 없다** — `docs/02-design/CSP-적용-현황.md` §3-2·3-3 |
| 관리자 권한 거부 경로 (비관리자 세션) | 격리 DB + 테스트 전용 `AUTH_SECRET`으로 세션 발급 | §12, §21 | ✅ **2026-09-11 해소.** 세션 없음 → `/ko/login`, **`USER` → `/ko/forbidden`**, `ADMIN` → 200, 서명 훼손 토큰 → `/ko/login`. 공개 화면은 `USER`로 200(회귀 없음) |
| `/_next/image` 엔드포인트와 SSRF | production 빌드에 직접 요청 | 보안 | ✅ **2026-09-11 확인.** 엔드포인트는 **존재하며 로컬 경로를 처리한다**(`/favicon.ico` 200). 외부 호스트·내부 IP·메타데이터 주소는 전부 400. 이전 보고서의 "최적화 경로 자체가 구성되지 않는다"는 **설명이 틀렸고 동작은 안전하다** — `docs/03-analysis/보안-후속-재검증.analysis.md` §2 |
| 배포처가 Windows 파일시스템 호스팅인지 | 배포 설정 확인 | 보안 | ⚠️ **미확인.** 맞다면 09-11 Next 업그레이드가 인증 없는 RCE(CVSS 9.0, GHSA-p293-qw3h-jr36)를 닫는 것이라 배포 우선순위가 최상이 된다 |
| 운영 응답 헤더 · 기존 CSP 유무 | 배포 URL 조회 | 보안 | ⚠️ **확인 불가.** 저장소에 배포 URL이 없다 — `NEXT_PUBLIC_SITE_URL`·`AUTH_URL` 둘 다 `localhost:3000`이고 `vercel.json`·`Dockerfile`도 없다. `https://pawspot.global`은 **폐기된 개발명세서 v1**에만 나와 근거가 되지 못한다 |
| 운영 DB에 http/https 아닌 URL이 남아 있는지 | 승인된 읽기 전용 조회 | §6, §21 | ⚠️ **미점검.** 화면에서는 `safeHttpUrl()`이 링크로 만들지 않으므로 위험은 막혀 있다. 데이터 정리 여부는 별개 판단 |
| 관리자·사용자 폼 저장 흐름 (브라우저) | 격리 DB + production 빌드 + Chrome 자동화 | §13, §15, §21 | ✅ **2026-09-11 해소.** 병원 등록·수정·재진입 값 유지·DB 일치, 장소 등록, 반려견 등록 모두 실제 화면 조작으로 확인. URL 거부도 세 폼에서 확인 |
| **서버 액션 인가** (페이지 리디렉션과 별개) | ADMIN의 액션 POST를 캡처해 세션만 바꿔 재생 | §12, §15 | ✅ **2026-09-11 해소.** 세션없음·USER·서명훼손 재생은 **DB에 행을 만들지 못했고**, ADMIN 대조군만 성공 |
| 실제 Google 계정 로그인 왕복 | 사용자 조작 필요 | §12 | ⚠️ **부분.** OAuth **시작**은 확인(`303 → 302 → accounts.google.com/o/oauth2/v2/auth`). 계정 인증·callback 복귀·세션 생성은 **실제 계정이 있어야 한다** |
| 지도가 정상 동작할 때의 CSP 적합성 | 결제 설정 해결 후 재측정 | §20 | ⚠️ **미확인.** 타일·WebGL 출처가 지도 실패로 아예 요청되지 않았다 |

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
| D-15 ⚠️ | 설문 응답의 `VerificationMethod`는 기존 `DM`을 재사용하지 않고 **`SURVEY`를 새로 추가**한다 | 매장이 직접 답한 것과 운영자가 DM으로 확인한 것은 출처가 다르다. 나중에 바꾸려면 데이터 마이그레이션이 필요하므로 처음부터 나눈다 | 2026-09-07 (사용자 확정) · **enum 마이그레이션 미실행** · **ID 충돌 — 아래 주석** |
| D-15 ⚠️ | (다른 결정) 요약 컬럼과 `policyDetails.spaceExceptions`가 **어긋나는 장소를 `실내 가능` 필터에서 제외**한다 | 요약만 보는 필터가 구역 기록과 모순되는 장소를 통과시키고 있었다 | 2026-09-10 (구현 완료, 커밋 `2ed7cea`) · `docs/03-analysis/N-2-실내-필터-불일치-장소.decision.md` |
| D-16 ~ D-20 | 동물병원 P0의 확정 결정 5건 (데이터 계층·판정 규칙·항목별 확인 근거 분리·공개 게이트) | 공식 등록 시스템이 병원명·주소·전화만 제공하고 진료시간·영어 응대·야간 진료를 제공하지 않는다는 사실이 항목별 분리(D-17)와 기본 정보 전용 공개 게이트(D-20)의 근거다 | 2026-09-10 · `docs/02-design/동물병원-탐색-문의-P0.design.md` §2 |

> ⚠️ **`D-15`가 두 결정에 중복 부여됐다.** 2026-09-10 작업이 `D-13`이 예약된 것만 확인하고
> `D-15`를 골랐고, 동물병원 설계 문서는 "`D-01`~`D-15` 사용 중"이라는 전제로 `D-16`부터 부여했다.
> 커밋 메시지에도 `D-15`가 들어가 있어 재부여는 문서 여러 곳을 함께 고쳐야 한다. §미확정 항목 참조.

> **명세서 반영 필요**
> - `개발명세서_v2` §7-2가 아직 "공개 장소 중 최단 거리"로 적혀 있다. D-11a로 대체됐다.
> - `개발명세서_v2` T-06과 §11이 Bottom Sheet에도 focus trap·`role="dialog"`를 요구한다. D-13a로 대체됐다.
> - **기획서 v3·개발명세서 v2 어디에도 동물병원(§21)이 없다.** 별도 문서 계통으로만 존재한다.
>   기획서 v3에 편입할지 별도 트랙으로 둘지 정해진 바 없다 — §미확정 항목.

---

## 미확정 항목

P0을 차단하는 항목은 없다. 아래 둘은 해당 기능 착수 시점에 결정한다.

| ID | 항목 | 시점 |
|---|---|---|
| D-13 | 신고 Rate Limit 임계값과 식별 기준(IP / 쿠키 / 세션) | P1 신고 기능(T-21) 착수 시 |
| D-14 | 2단계 확장 시 지역 필드 설계 | 서울 확장 착수 시 |
| — | **`D-15` 중복 ID 정리** — 두 결정 중 어느 쪽을 재부여할지. 커밋 메시지·설계 문서·분석 문서가 함께 걸려 있다 | 문서 정리 시 |
| — | **동물병원(§21)을 기획서 v3에 편입할지** 별도 트랙으로 둘지 | 동물병원 운영 반영 전 |
| — | **CSP 강제 전환** — nonce(요청마다 생성)를 쓸지. **정적 생성과의 교환은 없었다**(2026-09-12 정정) | CSP 위반 실측 후 |
| — | ~~**Next 16.x 이행**~~ — **2026-09-12 완료.** 16.3.5 + ESLint 9 flat config · `middleware` → `proxy` | 해소 |

구현 중 정할 소소한 값 (별도 결정 항목 아님): 서비스 범위 밖 판정 임계 거리(기본 50 km 권장), 대전 기본 중심 좌표와 초기 zoom — 모두 P0 #20에서 처리.

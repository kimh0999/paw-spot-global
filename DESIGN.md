# Paw Spot Global — Design Guidelines (v1.2)

> 이 문서는 Paw Spot Global의 UI를 구현·수정할 때 따르는 기준이다.  
> 에어비앤비의 탐색 구조와 절제된 시각 언어, 당근의 정보 밀도와 지역 중심 UX를 참고하되 두 브랜드의 색상·로고·고유 컴포넌트를 복제하지 않는다.

**v1.2 변경 사항** (기획서 v3 결정 반영): 정보 신선도 임계값을 8주에서 **90일 단일 기준**으로 통일(D-02), Korean Inquiry Box를 **MVP 제외 / P1 재도입 예정**으로 표기(D-01).

**v1.1 변경 사항**: 다크 모드 정책, z-index 체계, 아이콘 규칙, 텍스트 색상 용도 구분, Place Card 밀도 검증 기준, 한국어 UI의 문의 박스 처리, 거리 표기 규칙 추가.

## 1. Product Direction

- 대상: 한국에 거주하거나 여행 중인 영어 사용 반려견 보호자
- 핵심 가치: **지도와 필터로 내 주변에서 반려견 동반 조건이 맞는 장소를 찾고, 방문 전에 조건과 정보의 신뢰도를 판단하게 한다.**
- 기본 언어: 영어
- 보조 언어: 한국어
- 핵심 탐색 정보:
  1. 거리와 위치
  2. 실내 동반 가능 여부
  3. 이동장·유모차 조건
  4. 허용 반려견 크기
  5. 마지막 확인일과 확인 방법

## 2. Reference Rules

### From Airbnb

- 흰색 중심의 차분한 화면
- 장소 사진, 카드, 지도 사이의 자연스러운 연결
- 둥근 필터와 간결한 탐색 컨트롤
- 테두리와 여백 중심의 계층
- 구체적이고 행동 중심적인 문구

사용하지 않는다:

- Airbnb Pink `#ff385c`
- Airbnb Cereal
- Guest, Host, Booking, Reserve 중심 구조
- 사진이 조건 정보보다 우선하는 `photography-first` 구성
- 과도하게 큰 검색 바와 모든 버튼의 pill 처리

### From Karrot

- 4px 기반 간격 체계
- 한 화면에서 여러 장소를 비교할 수 있는 정보 밀도
- 지역명과 거리의 상시 노출
- 과한 장식과 그림자가 없는 평면적 UI
- 따뜻하지만 과장하지 않는 문체

사용하지 않는다:

- Karrot Orange `#ff6f0f` 또는 `#ff6600`
- 중고 거래 카드와 채팅 중심 구조
- 당근 캐릭터·브랜드 서사
- 모든 화면에 강한 브랜드 색을 반복하는 방식

## 3. Core Principles

### 3.1 Visit eligibility leads

사진보다 먼저 사용자가 자신의 반려견과 방문할 수 있는지 판단하게 한다. `Pet-friendly`라는 포괄적 배지 대신 구체적인 조건을 표시한다.

### 3.2 Map, list, and preview behave as one

장소 카드, 미리보기 패널, 지도 마커는 동일한 선택 상태를 공유한다. 어느 영역에서 장소를 선택해도 나머지 영역이 즉시 동기화되어야 한다.

### 3.3 Trust is explicit

검증 여부만 단독 배지로 표시하지 않는다. 확인일과 확인 방법을 함께 보여주고, 모르는 정보는 `Confirmation needed`로 명확히 표시한다.

### 3.4 Proximity is always visible

장소 카드와 상세 요약에는 거리와 지역명을 숨기지 않는다. 위치가 확인되지 않았다면 임의의 거리를 표시하지 않는다.

### 3.5 One primary action per context

한 영역에서 파란색 채움 버튼은 하나만 사용한다. 나머지 행동은 outline, ghost 또는 text action으로 낮춘다.

### 3.6 Photos support the decision

사진은 장소 분위기와 식별을 돕는 정보다. 사진 때문에 동반 조건, 거리, 검증 정보가 첫 화면에서 밀려나면 안 된다.

## 4. Design Tokens

### Colors

```css
:root {
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-primary-soft: #eff6ff;
  --color-on-primary: #ffffff;

  --color-canvas: #ffffff;
  --color-background: #f7f8fa;
  --color-surface: #ffffff;
  --color-surface-subtle: #f2f4f7;

  --color-text: #171719;
  --color-text-secondary: #5f6368;
  --color-text-muted: #6b7280;
  --color-border: #e5e7eb;
  --color-border-strong: #cfd4dc;

  --color-success: #15803d;
  --color-success-soft: #f0fdf4;
  --color-warning: #b45309;
  --color-warning-soft: #fffbeb;
  --color-danger: #dc2626;
  --color-danger-soft: #fef2f2;
  --color-unknown: #667085;
  --color-unknown-soft: #f2f4f7;

  --color-focus: #2563eb;
  --color-overlay: rgb(17 24 39 / 48%);
}
```

- Primary Blue: 주요 CTA, 선택 필터, 선택 마커, focus
- Green: 조건 충족 또는 최근 확인
- Amber: 조건부 허용, 오래된 정보, 주의 필요
- Red: 동반 불가, 입력 오류, 위험한 작업
- Gray: 확인 필요, 비활성, 보조 정보
- 상태는 색상만으로 표현하지 않고 아이콘과 텍스트를 함께 사용한다.

#### Text color usage

- `--color-text`: 장소명, 조건 값, 본문 등 판단에 필요한 모든 1차 정보
- `--color-text-secondary`: 카테고리, 지역명, 확인 방법 등 1차 정보를 보조하는 라인
- `--color-text-muted`: placeholder, caption, 비활성 텍스트, 부가 디스클레이머
- 같은 텍스트 블록 안에서 secondary와 muted를 혼용하지 않는다. 구분이 애매하면 secondary를 사용한다.

#### Dark mode

- v1은 라이트 모드만 지원한다. 다크 모드 토큰과 스타일을 임의로 추가하지 않는다.
- `prefers-color-scheme: dark`에 대응하는 자동 반전을 적용하지 않는다.
- 다크 모드 도입 시 이 문서의 토큰 확장으로 진행하며, 컴포넌트별 하드코딩 색상을 만들지 않는다.

### Z-index

```css
:root {
  --z-map-control: 10;
  --z-dropdown: 50;
  --z-header: 100;
  --z-drawer: 200;
  --z-bottom-sheet: 300;
  --z-dialog: 400;
  --z-snackbar: 500;
  --z-tooltip: 600;
}
```

- 위 토큰 외의 임의 z-index 값을 사용하지 않는다.
- Dropdown은 페이지 콘텐츠 위, Header 아래에 위치한다.
- overlay(`--color-overlay`)는 해당 레이어 바로 아래에 위치한다.
- Snackbar는 Dialog 위에도 표시될 수 있다.
- 지도 라이브러리 내부 z-index는 `--z-map-control` 이하로 제한한다.

### Icons


- 아이콘 셋: lucide 단일 셋만 사용한다. 다른 셋과 혼용하지 않는다.
- 크기: 16px(조건 행, 배지, 인라인), 20px(버튼, 필터, 목록 액션), 24px(헤더, 빈 상태)
- stroke: 기본 1.5, 16px에서는 2를 허용한다.
- 색상은 함께 있는 텍스트 색상을 따른다. 상태 아이콘은 상태 색상 토큰을 사용한다.
- 의미 전달용 아이콘에는 텍스트 라벨을 병기한다. 장식용 아이콘은 `aria-hidden`으로 처리한다.
- 같은 의미에는 항상 같은 아이콘을 사용한다. (예: 실내 동반, 이동장, 크기, 확인 상태)

### Typography

현재 프로젝트의 `next/font` 기반 sans-serif를 유지한다. Airbnb Cereal이나 별도 브랜드 폰트를 추가하지 않는다.

```text
Display       40/48  700  홈 히어로 전용
Page title    28/36  700
Section title 20/28  700
Card title    16/24  600
Body          14/21  400
Body strong   14/21  600
Caption       12/18  400
Button        14/20  600
```

- 영어와 한국어 모두 가독성을 우선한다.
- 본문은 최소 14px, 주요 조건은 최소 14px로 표시한다.
- 장소명은 최대 2줄, 버튼과 상태 문구는 가능한 한 자르지 않는다.

### Spacing

4px grid만 사용한다.

```text
4, 8, 12, 16, 20, 24, 32, 40, 48, 64
```

- 카드 내부: 12–16px
- 패널 내부: 16–24px
- 섹션 사이: 24–32px
- 모바일 화면 좌우: 16px

### Radius

```text
Control   8px
Card     12px
Panel    12px
Dialog   16px
Chip    999px
Circle   50%
```

- pill은 필터 칩, 상태 배지, 카테고리 탭에만 주로 사용한다.
- 일반 버튼과 입력 필드를 무조건 pill로 만들지 않는다.

### Border and Elevation

- 기본 계층은 `1px solid var(--color-border)`로 표현한다.
- 일반 카드는 그림자를 사용하지 않는다.
- 선택 카드, floating control, Bottom Sheet에만 약한 그림자를 허용한다.
- 큰 blur, 색이 들어간 shadow, glassmorphism을 사용하지 않는다.

## 5. Layout

### Global Header

```text
[Logo] [주요 탐색 링크] [보조 링크] [EN / KO]
```

- 실제 메뉴 항목과 경로는 개발명세서(라우팅)에서 관리한다. 이 문서는 배치와 상태만 규정한다.
- 데스크톱 높이: 64px
- 모바일 높이: 56px
- 로고는 홈 링크다.
- 현재 페이지는 텍스트와 indicator로 구분한다.
- 미구현 메뉴는 404로 연결하지 않고 `Coming soon` 또는 비활성 상태로 표시한다.
- 긴급 기능은 위험을 뜻하는 빨간색 장식 대신 명확한 라벨과 아이콘으로 제공한다.

### Places Desktop

`1280px` 이상에서는 다음 3분할 구조를 사용한다.

```text
[Place list 340px] [Place preview 380px] [Map minmax(0, 1fr)]
```

- 목록과 미리보기 패널은 독립적으로 스크롤한다.
- 지도는 남은 영역을 사용하며 장소 선택 시 재마운트하지 않는다.
- 미선택 시 미리보기 패널은 닫히고 지도가 자연스럽게 확장된다.
- 패널 너비 변화는 `250ms ease-standard`로 처리한다.
- 카드 hover → 마커 hover
- 카드 선택 → 미리보기 패널 + 선택 마커
- 마커 선택 → 해당 카드 scroll into view + 미리보기 패널

`1024–1279px`에서는 목록과 지도를 유지하고 미리보기는 지도 위 overlay panel로 연다. 지도의 실사용 폭이 지나치게 좁아지는 3분할은 사용하지 않는다.

### Places Mobile

- 목록과 지도를 segmented control로 전환한다.
- 장소 선택 시 미리보기는 Bottom Sheet로 표시한다.
- Bottom Sheet는 요약 높이와 전체 높이 두 단계만 사용한다.
- 필터는 Drawer 또는 Bottom Sheet에서 제공한다.
- 지도와 목록의 필터·선택 상태를 전환 중에도 유지한다.

## 6. Core Components

### Filter Bar

- 카테고리, 실내, 크기, 이동장, 정렬을 중요도 순으로 배치한다.
- 높이: 40px, 모바일 touch target은 최소 44×44px
- 비선택: 흰색 + 회색 테두리
- 선택: `primary-soft` 배경 + primary 테두리 + primary 텍스트
- 선택된 조건 수가 많아도 필터 바를 여러 줄로 무한 확장하지 않는다.
- 전체 조건은 `All filters`에서 수정한다.

### Place Card

목록 패널에서는 세로형 대형 카드가 아니라 밀도 높은 가로형 카드를 사용한다.

```text
Place name                       620 m
Cafe · Yuseong-gu
[✓ Your dog can visit]
Indoor available · No carrier needed · Up to medium
Checked 12 days ago · Phone
```

- 카드 전체가 선택 대상이며 내부 action의 click propagation을 분리한다.
- 장소명, 거리, 지역, 핵심 조건 3개, 확인 정보가 첫 화면에 보여야 한다.
- 허용 조건만 나열하지 말고 중요한 `Conditional`, `Not allowed`, `Unknown`도 표시한다.
- 카테고리는 텍스트로만 표시한다. 같은 카테고리가 연속으로 나열되는 목록에서 아이콘 뱃지는 폭만 쓰고 구분에 기여하지 않는다.
- hover는 배경색과 테두리로만 표현한다.
- selected는 primary 테두리와 옅은 primary 배경으로 표현한다.
- 조건 영역에 최소 높이를 두어 조건 줄 수가 달라도 카드 높이가 흔들리지 않게 한다. 목록의 목적은 비교다.
- 대표 이미지는 카드에 넣지 않는다. 340px 목록에서 이미지는 조건 텍스트를 밀어내며, 조건이 판단의 근거다.
- 홈과 즐겨찾기 grid에서는 4:3 이미지의 세로형 variant를 사용할 수 있다.

#### Visit eligibility banner

반려견 프로필이 등록되어 있으면 조건을 나열하기 전에 방문 가능 여부를 한 문장으로 단언한다. 사용자가 조건 여러 개를 직접 종합하게 두지 않는다.

| 상태 | 조건 | 표현 |
|---|---|---|
| allowed | 허용 크기 ≥ 등록된 반려견 크기 | `success-soft` 배경 + check 아이콘 |
| blocked | 동반 불가이거나 허용 크기 미만 | `danger-soft` 배경 + slash 아이콘 |
| unknown | 허용 크기 미확인 | `unknown-soft` 배경 + alert 아이콘 |

- 프로필이 없으면 배너를 표시하지 않는다. 추측으로 단언하지 않는다.
- 배너는 판정만 담고, 근거가 되는 조건은 바로 아래 조건 목록에서 그대로 보여준다.

#### Density verification

- 340px 목록 기준, 영문 장소명 2줄 + 조건 3개 + 확인 정보가 잘리지 않는지 가장 긴 실제 데이터로 검증한다.
- 공간이 부족하면 조건 값을 축약형으로 표시한다. (예: `Carrier not required` → `No carrier needed`) 축약형도 의미를 생략하지 않는다.

### Place Preview

목록이나 지도에서 장소를 선택했을 때 여는 요약이다. 전체 정보를 담지 않는다. 갈 수 있는지 판단할 최소 정보와 다음 행동만 제공한다.

구조는 header, body, footer 세 영역으로 고정한다. header와 footer는 고정하고 body만 스크롤한다.

```text
header   카테고리 아이콘 · 장소명 · 카테고리 · 거리 · 주소 · 닫기
body     동반 조건 전체 · 주의사항 · 확인일과 확인 방법
footer   [상세 보기]
         [즐겨찾기] [길찾기]
```

- **미리보기는 카드보다 반드시 많은 정보를 보여준다.** 카드와 같은 내용만 반복하면 패널을 열 이유가 없다.
- 카드는 핵심 조건 3개(실내 동반, 이동장·유모차, 허용 크기)만, 미리보기는 목줄과 입마개까지 포함한 전체 조건을 세로로 나열한다.
- 카드는 주소를 한 줄로 자르고, 미리보기는 전체 주소를 보여준다.
- 주의사항이 있으면 `warning-soft` 박스로 조건 아래에 둔다. 없으면 영역 자체를 생략한다.
- 확인일에는 확인 방법을 함께 표시한다. 마지막 확인이 `90일` 이상 지났을 때만 `Recheck needed`를 경고색으로 알린다. 임계값을 낮게 잡아 모든 카드가 경고색이 되면 경고가 아무것도 강조하지 못한다. **임계값은 90일 하나만 사용한다.** 중간 단계 경고를 추가하지 않는다.
- `상세 보기`가 primary action이다. 미리보기의 목적은 상세로 이어주는 것이다.
- 대표 이미지, 운영시간, 연락처, 문의 문구 복사는 미리보기에 넣지 않는다.
- 표면은 breakpoint에 따라 컬럼, overlay panel, Bottom Sheet로 바뀌지만 내용과 순서는 동일하게 유지한다.

### Place Detail Page

`/places/{id}`. 장소의 모든 정보를 담는 최종 화면이다. 여기서 더 들어갈 곳은 없다.

표시 순서:

1. 대표 이미지
2. 장소명, 카테고리, 지역, 거리
3. 길찾기·전화·공유 action
4. `Before You Go`
5. 확인일·확인 방법·디스클레이머
6. 운영시간과 연락처
7. `Ask the store in Korean` — 영어 UI만 *(MVP 제외 / P1 재도입 예정)*
8. 신고

- `Before You Go`를 이미지 바로 아래의 핵심 영역에 둔다.
- 길찾기를 기본 primary action으로 사용하고, 전화와 문의 문구 복사는 secondary action으로 둔다.
- 전화번호나 링크가 없으면 비활성 버튼을 노출하지 말고 해당 action을 생략한다.

### Condition Row

```text
[icon] Indoor access       Available
[icon] Carrier             Required
[icon] Large dogs          Confirmation needed
```

- label과 value를 분리해 빠르게 스캔할 수 있게 한다.
- 값은 `Available`, `Outdoor only`, `Required`, `Not allowed`, `Confirmation needed`처럼 구체적으로 작성한다.
- 모든 값을 초록색 badge로 만들지 않는다.

### Verification Status

```text
Checked 12 days ago · Confirmed by phone
Last checked 8 months ago · Information may have changed
Confirmation needed
```

- `Verified`라는 단어만 표시하지 않는다.
- 확인일과 확인 방법을 함께 노출한다.
- 오래된 정보는 Amber, 미확인 정보는 Gray를 사용한다.
- 검증 정보가 없으면 날짜나 방법을 추정하지 않는다.

### Korean Inquiry Box

> ⛔ **MVP 제외 (P1 재도입 예정).** 기획서 v3 §11 결정에 따라 MVP에서는 이 컴포넌트를 사용자 화면에 노출하지 않는다. 컴포넌트 코드와 메시지 키는 P1의 동적 문의 문구 기능을 위해 보존한다.
> 아래 규칙은 **재도입 시점의 기준**으로 유지한다. 지금 이 규정을 근거로 화면에 박스를 추가하지 않는다.

- 영어 UI에서만 노출한다. 한국어 UI에서는 박스 전체를 생략하고 전화 action만 유지한다. 빈 자리를 다른 콘텐츠로 채우지 않고 다음 섹션을 자연스럽게 올린다.
- 한국어 원문을 수정 가능한 것처럼 보이게 하지 않는다.
- 안내 문구, 한국어 메시지, `Copy Korean message` 버튼 순서로 구성한다.
- 복사 성공은 `Copied to clipboard` Snackbar로 알린다.
- 사용자가 직접 보내도록 하며 자동 전송처럼 표현하지 않는다.

### Map and Markers

- 기본 마커: 흰색 surface + 회색 border
- hover 마커: primary ring
- 선택 마커: primary 배경 + 흰색 아이콘
- 카드와 마커의 hover·selected 상태를 시각적으로 구분한다.
- 지도 위 컨트롤은 우측 또는 하단 한 영역에 모아 배치한다.
- 검색 결과가 바뀌어도 지도를 불필요하게 초기화하지 않는다.
- 선택 장소를 보여주기 위해 과도하게 zoom하지 않는다.

### Buttons and Inputs

- Primary: 현재 맥락의 대표 행동 하나
- Secondary: outline
- Tertiary: ghost 또는 text
- Destructive: 삭제·신고 확정 등 실제 위험 행동에만 사용
- 입력 높이: 44–48px
- 아이콘 단독 버튼: 최소 44×44px, `aria-label` 필수
- disabled 상태에서도 크기와 배치가 바뀌면 안 된다.

### Admin

- 사용자용 카드 스타일을 억지로 재사용하지 않는다.
- 표, 폼, 상태 필터 중심의 높은 정보 밀도를 허용한다.
- 장소 조건과 검증 항목은 섹션으로 구분하고 저장 오류는 해당 필드 근처에 표시한다.
- 상태 색상 의미는 사용자 화면과 동일하게 유지한다.

## 7. States

| State | Treatment |
|---|---|
| Initial loading | 최종 카드 구조와 같은 Skeleton |
| Load more | 기존 목록을 유지하고 하단 spinner 표시 |
| No results | `No places match your filters.` + `Reset filters` |
| Location denied | `Showing places near Seoul City Hall.` + `Use my location` |
| Map error | 목록은 유지하고 지도 영역에 재시도 안내 |
| Stale verification (90일 초과) | Amber 아이콘 + `Recheck needed` + 마지막 확인일 + 정책 변경 가능 문구 |
| Unknown condition | Gray 아이콘 + `Confirmation needed` |
| Dog mismatch | 조건 불일치 항목을 명시하고 카드 전체를 error처럼 만들지 않음 |
| Copy success | 짧은 Snackbar, 3초 이내 자동 종료 |
| Network error | 원인 범위를 설명하는 한 문장 + `Try again` |
| Unauthenticated favorite | 현재 맥락을 보존한 로그인 안내 |

- 빈 상태에 장식용 일러스트를 기본으로 넣지 않는다.
- 로딩 중 기존 지도와 장소 목록을 불필요하게 가리지 않는다.
- 오류는 사용자 탓으로 표현하지 않는다.

## 8. Motion

```text
instant   0ms    checkbox, toggle
fast    150ms    hover, focus, button press
standard 250ms   panel, tab, Bottom Sheet
slow    350ms    큰 상태 전환
```

```css
--ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
--ease-enter: cubic-bezier(0, 0, 0.2, 1);
--ease-exit: cubic-bezier(0.4, 0, 1, 1);
```

- bounce와 overshoot를 사용하지 않는다.
- 지도 마커와 카드 강조는 150ms 이내로 반응한다.
- `prefers-reduced-motion: reduce`에서는 이동 애니메이션을 제거한다.

## 9. Voice and Content

- 영어 문장은 짧고 직접적으로 작성한다.
- 감성적 여행 표현보다 조건의 정확성을 우선한다.
- 지역명, 거리, 날짜, 확인 방법을 구체적으로 쓴다.
- 확인하지 않은 내용을 긍정적으로 추정하지 않는다.

권장:

```text
Indoor access confirmed
Outdoor seating only
Carrier required
Large dogs: confirmation needed
Checked by phone on July 20, 2026
Store policies may change
```

금지:

```text
Perfect for every dog
Completely pet-friendly
Dogs are always welcome
Guaranteed entry
Amazing place
Oops, something went wrong
```

## 10. Internationalization

- 영어 UI를 기본으로 설계하고 한국어 번역 후 레이아웃이 깨지지 않는지 확인한다.
- 영어 UI: 영문 장소명을 primary, 한국어명을 secondary로 표시한다.
- 한국어 UI: 한국어 장소명을 primary, 영문명을 secondary로 표시한다.
- 번역되지 않은 정보를 번역된 사실처럼 보이게 하지 않는다.
- 날짜, 거리, 시간은 locale에 맞게 표시한다.
- 한국 매장에 전달할 문의 문구는 한국어 원문을 유지한다.
- 버튼 텍스트가 길어지면 너비를 늘리거나 줄바꿈하고 의미를 생략하지 않는다.

### Distance formatting

```text
0–999 m     10 m 단위 반올림       620 m
1–9.9 km    소수 첫째 자리         1.2 km
10 km 이상   정수                  12 km
```

- 단위와 숫자 사이에 공백을 넣는다. (`620 m`, `1.2 km`)
- 영어·한국어 UI 모두 m/km 표기를 사용하고 mi로 변환하지 않는다.
- 위치 미확인 시 거리를 표시하지 않으며 `—`나 0 m로 대체하지 않는다.
- 확인일 표기: 7일 이내는 상대 표기(`Checked 3 days ago`), 그 이후는 날짜 표기(`Checked on July 20, 2026`). 한국어 UI는 `7월 20일 확인` 형식을 사용한다.

## 11. Accessibility

- WCAG 2.1 AA 대비 기준을 충족한다.
- 모든 interaction에 keyboard focus와 `focus-visible`을 제공한다.
- 색상 외에 아이콘, 텍스트, 형태로 상태를 구분한다.
- 지도만으로 결과를 제공하지 않고 동일한 장소 목록을 함께 제공한다.
- 카드 선택과 마커 선택 결과를 screen reader에 알린다.
- Bottom Sheet와 Dialog는 focus trap과 Escape 닫기를 지원한다.
- touch target은 최소 44×44px다.

## 12. Implementation Guardrails

- Airbnb·Karrot 토큰을 프로젝트에 그대로 복사하지 않는다.
- 예약, 호스트, 거래, 채팅 기능을 디자인에 추가하지 않는다.
- `Pet-friendly` 배지 하나로 동반 조건을 대체하지 않는다.
- 검증일이나 확인 방법이 없으면 임의로 생성하지 않는다.
- 장소 선택 때마다 별도 페이지로 이동시키지 않는다. 탐색 화면에서는 미리보기 패널을 우선 사용한다.
- 지도 컴포넌트를 카드 hover나 선택 때 재마운트하지 않는다.
- 장식용 gradient, glassmorphism, 큰 shadow, 과도한 emoji를 사용하지 않는다.
- 기존 shadcn/ui와 Tailwind 토큰을 우선 확장하고 동일 역할의 새 컴포넌트를 중복 생성하지 않는다.
- 기존 URL filter, selected place, hover state의 동기화를 깨뜨리지 않는다.
- 모바일을 데스크톱 3분할의 축소판으로 만들지 않는다.
- 다크 모드 스타일을 임의로 추가하지 않는다.
- z-index는 정의된 토큰만 사용한다.
- lucide 외의 아이콘 셋을 추가하지 않는다.

## Included Components

- Button
- IconButton
- Input
- SearchField
- FilterChip
- CategoryTab
- SortControl
- PlaceCard
- PlaceConditionSummary
- EligibilityBanner
- ConditionRow
- ConditionBadge
- VerificationStatus
- PlacesMap
- MapMarker
- PlacePreviewCard
- KoreanInquiryBox — *MVP 제외 / P1 재도입 예정*
- CopyButton
- LocationPermissionBanner
- EmptyState
- Skeleton
- Snackbar
- Drawer
- BottomSheet
- Dialog
- AdminTable
- PlaceForm
---
title: Paw Spot Global Design System
status: active
updated: "2026-07-26"
scope: "UI, UX, layout, responsive behavior, component states, accessibility"
---

# Paw Spot Global Design System

## 0. 문서 사용 원칙

이 문서는 Paw Spot Global의 UI/UX 구현 기준이다.

기능 요구사항과 개발 범위는 기획서, 개발명세서, 현재 코드를 기준으로 판단한다.

- 이 문서에 컴포넌트가 명시되어 있어도 요청받지 않은 기능은 구현하지 않는다.
- 기존 상태 관리, URL 구조, 데이터 모델, API, i18n 동작을 임의로 변경하지 않는다.
- UI를 수정하기 전에 현재 컴포넌트와 `globals.css`의 디자인 토큰을 확인한다.
- 현재 코드와 이 문서가 충돌하면 바로 수정하지 말고 차이를 먼저 보고한다.
- 기존 기능을 유지하면서 점진적으로 적용한다.
- `Included Components`는 디자인 대상 목록이며 전체 구현 범위를 의미하지 않는다.

---

## 1. Product Definition

Paw Spot Global은 한국에 거주하거나 여행 중인 외국인 반려견 보호자가 반려견과 함께 갈 수 있는 음식점, 카페, 여행지를 지도와 필터로 찾고, 방문 전에 필요한 동반 조건을 영어로 확인하는 서비스다.

서비스의 핵심은 장소를 많이 보여주는 것이 아니라 다음 판단을 빠르고 신뢰할 수 있게 만드는 것이다.

1. 내 주변에 조건이 맞는 장소가 있는가?
2. 실내 동반이 가능한가?
3. 이동장이나 유모차가 필요한가?
4. 내 반려견의 크기가 허용되는가?
5. 이 정보는 언제, 어떤 방법으로 확인됐는가?

### 핵심 사용자 흐름

```text
지도와 필터로 장소 발견
→ 여러 후보 비교
→ 3대 동반 조건 확인
→ 검증일과 정보 신선도 확인
→ 길찾기·전화·한국어 문의
```

### 디자인 참고 범위

여기어때(Yeogiotte)의 다음 요소만 참고한다.

- 명확한 정보 위계
- 사진 중심 장소 탐색
- 간결한 검색 UI
- Compact Filter Chip
- 일관된 Spacing과 Radius
- 명확한 Primary Action

다음 패턴은 Paw Spot에 적용하지 않는다.

- 가격 및 할인 강조
- 숙박 상품
- 객실 재고
- 예약 가능 여부
- 멤버십
- 결제
- 가격형 지도 마커

---

## 2. Design Principles

### Find first

첫 화면에서는 서비스 소개보다 지도와 필터를 통한 장소 탐색을 우선한다.

### Conditions before decoration

사진은 장소를 식별하게 하고, 동반 조건은 실제 방문 가능성을 판단하게 한다.

### Trust is visible

`Verified`, `Last checked`, 확인 방법을 숨기거나 작은 부가 정보로 처리하지 않는다.

### Unknown is a valid state

확인되지 않은 조건을 허용 또는 불가로 추정하지 않는다.

```text
Needs confirmation
```

상태를 명확하게 표시한다.

### Map and list stay synchronized

목록 카드, 지도 마커, 선택 장소 프리뷰는 동일한 Hover·Selected 상태를 공유한다.

### English first, Korean supported

사용자용 기본 정보 구조는 영어 UI를 기준으로 설계하되, 한국어에서도 텍스트가 잘리거나 정보 위계가 달라지지 않아야 한다.

### One clear next action

각 화면에서는 현재 단계에 필요한 핵심 행동 하나를 우선한다.

- 탐색 화면: 장소 선택
- 선택 프리뷰: `View details`
- 상세 화면: `Get directions`
- 문의 영역: `Copy Korean message`

### No color-only meaning

상태는 색상만으로 구분하지 않는다. 아이콘, 텍스트, Border를 함께 사용한다.

---

## 3. Visual Theme

Paw Spot의 시각적 인상은 다음과 같다.

```text
Friendly · Clear · Trustworthy · Local
```

반려동물 서비스의 친근함은 부드러운 Radius, 자연스러운 장소 사진, 제한적인 Paw 모티프로 표현한다.

신뢰성은 절제된 색상과 구조화된 조건 정보로 표현한다.

### 기본 규칙

- 기본 배경은 밝고 단순하게 유지한다.
- Primary Color는 검색, 선택 상태, 핵심 CTA에 집중한다.
- 반복 카드에 강한 그림자를 사용하지 않는다.
- 귀여운 장식이 동반 조건이나 검증 상태보다 먼저 보이지 않게 한다.
- 여행 광고처럼 지나치게 감성적으로 표현하지 않는다.
- 숙박 예약 서비스처럼 가격과 거래 중심으로 보이지 않게 한다.

---

## 4. Color System

### 색상 기준

현재 프로젝트의 `globals.css`에 선언된 디자인 토큰을 색상의 단일 기준으로 사용한다.

```css
--background
--foreground
--card
--card-foreground
--primary
--primary-foreground
--secondary
--secondary-foreground
--muted
--muted-foreground
--accent
--accent-foreground
--border
--input
--ring
--destructive
```

### 구현 규칙

- `DESIGN.md`를 적용한다는 이유로 기존 Primary Color를 임의로 변경하지 않는다.
- Tailwind 기본 색상인 `blue-600`, `slate-500` 등을 컴포넌트마다 직접 분산하지 않는다.
- 가능한 경우 Semantic Token을 사용한다.
- 새로운 색상 토큰이 필요하면 기존 `globals.css`와 사용 위치를 먼저 확인한다.
- 지도 마커와 장소 카드의 Selected 상태에는 동일한 Primary Token을 사용한다.

### 상태별 의미

| 상태 | 의미 | 표현 |
|---|---|---|
| Allowed | 확인된 허용 조건 | Success icon + label + soft surface |
| Conditional | 조건부 허용 | Warning icon + 조건 문구 |
| Not allowed | 확인된 불가 | Danger icon + 명확한 제한 문구 |
| Unknown | 정보 미확인 | Question icon + `Needs confirmation` |
| Selected | 현재 선택된 장소 | Primary border + soft surface |
| Stale | 재확인 필요 | Warning icon + `Needs reconfirmation` |

### 주의사항

- Red는 할인이나 단순 강조에 사용하지 않는다.
- Warning 색상은 평점이 아니라 조건부 허용이나 정보 신선도 경고에 사용한다.
- 확인되지 않은 조건을 Green으로 표시하지 않는다.
- `Verified`는 반드시 확인일과 함께 표시한다.

---

## 5. Typography

국문·영문·숫자는 현재 프로젝트에서 설정된 Font Family를 유지한다.

새로 설정해야 하는 경우 다음 순서를 권장한다.

```css
font-family:
  Pretendard,
  Inter,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  sans-serif;
```

### Type scale

| Role | Size / Line height | Weight | 사용 위치 |
|---|---:|---:|---|
| Display | `32 / 40px` | 700 | 랜딩 페이지 최상위 메시지 |
| Page title | `24 / 32px` | 700 | 페이지 제목, 장소 상세 제목 |
| Section title | `20 / 28px` | 700 | `Before You Go` |
| Card title | `18 / 26px` | 700 | 장소명, Dialog 제목 |
| Body | `14 / 20px` | 400 | 설명, 조건 상세 |
| Label | `13 / 18px` | 600 | Filter, Button, 상태 Label |
| Caption | `12 / 16px` | 400 | 거리, 지역, 확인일 |

### Typography rules

- 장소명과 조건 정보 사이에 크기 또는 굵기 차이를 둔다.
- 긴 영문 장소명은 최대 2줄까지 허용하고 이후 말줄임표를 적용한다.
- 영문명이 없으면 원본 한국어 장소명을 표시한다.
- 임의 번역한 장소명을 공식 영문명처럼 표시하지 않는다.
- All Caps는 짧은 상태 Label에만 제한적으로 사용한다.
- Underline은 Link에만 사용한다.
- 조건은 아이콘만으로 축약하지 않고 Text Label을 함께 표시한다.

---

## 6. Spacing, Shape and Elevation

### Spacing

4px 단위의 간격 체계를 사용한다.

```text
4, 8, 12, 16, 24, 32, 48, 64px
```

권장 기준:

- 모바일 화면 좌우 여백: 16px
- 태블릿 화면 좌우 여백: 20px
- 데스크톱 화면 좌우 여백: 24px
- 카드 내부 Padding: 16px
- 컴포넌트 그룹 간격: 12~16px
- 주요 Section 간격: 32~48px
- 조건 행 간격: 8~12px

### Radius

- Button, Input: 8px
- Filter Chip, Badge: Full Radius
- Place Card, Preview Card: 12px
- Dialog, Popover: 16px
- Mobile Bottom Sheet: 상단 20px

### Border and shadow

- 반복되는 Place Card는 1px Border를 기본으로 한다.
- Hover 상태는 Border 강조와 약한 Shadow를 사용한다.
- Selected Card는 다음 중 두 가지 이상을 함께 사용한다.

```text
Primary border
Primary soft surface
Inner focus ring
Selected label
```

- Floating Preview와 Dialog에만 Raised Shadow를 사용한다.
- Bottom Sheet에는 위쪽 방향의 Sheet Shadow를 사용한다.

---

## 7. Information Architecture

### Primary navigation

```text
Logo | Places | Near Me | My Dogs | Animal Hospital | EN/KO
```

- Logo는 Home Link다.
- `Places`와 `Near Me`는 활성 기능이다.
- `My Dogs`와 `Animal Hospital`이 미구현 상태라면 404로 연결하지 않는다.
- 미구현 메뉴는 `Coming soon` 또는 Disabled 상태로 표시한다.
- 현재 페이지의 Active Navigation 상태를 명확히 표시한다.
- 언어 전환은 현재 페이지와 가능한 검색 상태를 유지한다.

### 장소 정보 우선순위

목록과 선택 프리뷰는 다음 순서로 정보를 표시한다.

```text
Photo
→ Place name
→ Category · Distance · Area
→ Indoor
→ Carrier / Stroller
→ Dog size
→ Verification status · Last checked
```

다음 정보는 기본 Place Card의 핵심 항목이 아니다.

- 가격
- 할인
- 예약 가능 여부
- 평점
- 긴 설명
- 전체 운영시간
- 리뷰 목록

---

## 8. Responsive Layout

### Desktop: List + Map

`lg` 이상에서는 목록과 지도의 2분할 구조를 사용한다.

고정된 목록·상세·지도 3분할은 사용하지 않는다.

```text
┌──────────────────────┬────────────────────────────────────┐
│ Search and filters   │                                    │
│                      │                                    │
│ Place list           │                Map                 │
│ 400–460px            │                                    │
│                      │   SelectedPlacePreview overlay     │
└──────────────────────┴────────────────────────────────────┘
```

### Desktop layout rules

- 왼쪽 패널은 검색, 카테고리, 필터, 정렬, 결과 수, 장소 목록을 담당한다.
- 1024~1279px에서는 왼쪽 패널을 약 400px로 사용한다.
- 1280px 이상에서는 440~460px 범위를 사용한다.
- 지도는 남은 Viewport 영역을 채운다.
- 목록과 지도는 독립적으로 스크롤 또는 조작할 수 있어야 한다.
- 장소 선택 전에는 상세 패널이 별도 공간을 차지하지 않는다.
- 장소 선택 시 지도 위에 `SelectedPlacePreview`를 표시한다.
- 전체 정보는 기존 `/places/[id]` 상세 페이지에서 제공한다.
- 지도는 장소 선택 시 재마운트하지 않는다.

### SelectedPlacePreview 위치

- 지도 내부의 왼쪽 하단을 기본 위치로 사용한다.
- Google Maps Control과 겹치지 않아야 한다.
- 최대 너비는 360px로 제한한다.
- 작은 화면에서는 다음 범위를 사용한다.

```css
width: min(360px, calc(100% - 32px));
```

- 지도 전체를 가리는 Side Panel로 확장하지 않는다.
- `View details`를 Primary CTA로 사용한다.
- `Directions`와 `Call`은 Secondary Action으로 사용한다.

### Desktop selection flow

장소 카드를 선택하면 다음 동작을 수행한다.

1. 선택된 목록 카드를 강조한다.
2. 대응하는 지도 마커를 강조한다.
3. 지도의 중심을 선택 장소로 이동한다.
4. 지도 위에 `SelectedPlacePreview`를 표시한다.
5. `View details` 선택 시 `/places/[id]`로 이동한다.

목록 카드와 지도 마커는 동일한 `selectedPlaceId`, `hoveredPlaceId` 상태를 기준으로 동기화한다.

기존 상태 구조나 URL 정책은 별도 요청 없이 변경하지 않는다.

### 상세 페이지 복귀

상세 페이지에서 탐색 화면으로 돌아오면 가능한 범위에서 다음 상태를 복원한다.

- 검색어
- 필터
- 정렬
- 목록 Scroll 위치
- 선택 장소
- 지도 중심
- 지도 Zoom

복원 방식은 현재 구현과 Router 구조를 우선한다.

### Mobile and tablet: Map + Bottom Sheet

`lg` 미만에서는 지도를 기본 배경으로 사용하고, 검색 결과와 선택 장소를 Bottom Sheet로 제공한다.

- 상단에는 Search와 핵심 Filter 진입점을 제공한다.
- Bottom Sheet는 다음 세 상태를 가진다.

```text
peek
results
selected
```

#### Peek

- 현재 지역
- 검색 결과 수
- Sheet 펼치기 Action

지도를 넓게 탐색할 수 있도록 최소 높이로 표시한다.

#### Results

- 검색 결과 목록
- Filter 결과
- 정렬
- 결과 수

목록을 스크롤하며 후보를 비교할 수 있어야 한다.

#### Selected

- 선택 장소명
- 카테고리와 거리
- 3대 동반 조건
- 검증 상태와 확인일
- 핵심 Action

전체 상세 정보는 Bottom Sheet에 넣지 않고 상세 페이지에서 제공한다.

### Bottom Sheet rules

- Drag Handle만으로 조작하게 하지 않는다.
- 펼치기·접기 Button과 접근 가능한 이름을 제공한다.
- 내부 목록 Scroll과 Sheet Drag Gesture가 충돌하지 않아야 한다.
- 선택 장소를 닫으면 기존 Results 상태로 돌아간다.
- Mobile Keyboard와 Safe Area를 고려한다.
- Viewport 높이는 가능한 경우 `100dvh`를 사용한다.
- Dialog를 Bottom Sheet 안에 중첩하지 않는다.

### Detail page

장소 상세는 지도 탐색 화면과 분리된 Full Page다.

정보 순서:

```text
Place name and basic metadata
→ Before You Go
→ Verification information
→ Directions and contact actions
→ Operating hours and links
→ Ask in Korean
→ Reviews or additional information
```

- 대표 이미지는 장소 식별을 돕는 범위로 사용한다.
- `Before You Go`를 운영시간이나 리뷰보다 먼저 확인할 수 있어야 한다.
- 긴 영문 조건을 좁은 고정 패널 안에 넣지 않는다.

---

## 9. Component Specifications

### Button

#### Primary

- Background: `primary`
- Text: `primary-foreground`
- Radius: 8px
- 최소 높이: 44px
- 사용 위치: `View details`, 검색 실행, 저장·제출

#### Secondary

- Card 또는 Background Surface
- 1px Border
- Foreground Text
- 사용 위치: `Call`, `Directions`, 보조 행동

#### Ghost

- Transparent Surface
- 낮은 우선순위 행동에만 사용한다.

#### Button states

- Default
- Hover
- Pressed
- Focus visible
- Loading
- Disabled

Disabled 상태는 Opacity만 낮추지 않는다. Text, Background, Cursor를 함께 변경한다.

Loading 상태에서도 버튼 너비가 변하지 않아야 한다.

---

### SearchBar

장소명, 지역, 주소를 검색하기 위한 입력이다.

- Search Icon을 제공한다.
- Visible Label 또는 `aria-label`을 제공한다.
- 입력값이 있으면 Clear Button을 제공한다.
- Focus 상태는 Ring으로 표시한다.
- 현재 위치 탐색은 검색창 장식이 아니라 구분된 Action으로 제공한다.
- 검색창 내부에 과도한 필터 기능을 넣지 않는다.

---

### CategoryTabs

기본 카테고리:

```text
Restaurants
Cafes
Attractions
```

- 동일한 정보 계층으로 제공한다.
- 선택 상태는 Text, Border 또는 Soft Surface로 구분한다.
- Tab 전환 시 목록과 지도를 함께 갱신한다.
- 카테고리 Label은 현재 i18n 메시지를 사용한다.

---

### FilterChip

#### Default

- Background Surface
- Border
- Foreground Text

#### Hover

- Muted Surface
- 강조된 Border

#### Selected

- Primary Soft Surface
- Primary Border
- Primary Text
- Check Icon

현재 핵심 필터:

```text
Indoor
No carrier required
Dog size
```

`Open now`는 현재 확정된 MVP 필터가 아니다. 별도 요구사항이 확정되기 전에는 구현하지 않는다.

- 영어 UI에서는 축약어보다 자연어 Label을 사용한다.
- 모바일의 전체 Filter는 Drawer 또는 Bottom Sheet에서 제공할 수 있다.
- 선택 여부를 색상만으로 표현하지 않는다.

---

### PlaceCard

- 1px Border와 12px Radius를 사용한다.
- 사진은 왼쪽 또는 상단 Thumbnail로 제공할 수 있다.
- 사진이 동반 조건을 밀어내지 않아야 한다.
- 카드 전체를 선택 가능하게 할 수 있다.
- 내부 Button과 카드 선택 Click Event가 충돌하지 않아야 한다.

정보 순서:

```text
Place name
→ Category · Distance · Area
→ Indoor
→ Carrier / Stroller
→ Dog size
→ Last checked
```

확인되지 않은 조건도 숨기지 않는다.

```text
Needs confirmation
```

으로 표시한다.

#### PlaceCard states

| 상태 | 표현 |
|---|---|
| Default | 기본 Border |
| Hover | 강조 Border + 약한 Shadow |
| Selected | Primary Border + Primary Soft Surface |
| Keyboard focus | 명확한 Focus Ring |
| Stale | `Needs reconfirmation` Warning 상태 |

---

### ConditionRow

조건은 아이콘, Label, Value 구조로 표시한다.

```text
[icon] Indoor access       Available
[icon] Carrier / stroller  Required
[icon] Dog size            Small · Medium
```

- Label과 Value가 섞이지 않게 충분한 간격을 둔다.
- 단순한 Yes/No보다 조건을 직접 설명한다.
- 목록에서는 3대 조건만 표시한다.
- 상세에서는 견종 제한, 준비물, 주의사항까지 확장한다.

권장 문구:

```text
Indoor available
Outdoor only
Indoor not allowed
Carrier required
No carrier required
Small dogs only
Small and medium dogs
All sizes allowed
Needs confirmation
```

---

### ConditionBadge

| 상태 | 예시 |
|---|---|
| Allowed | `Indoor available` |
| Conditional | `Outdoor only` |
| Not allowed | `Indoor not allowed` |
| Unknown | `Needs confirmation` |

- Icon, Text, Surface를 함께 사용한다.
- Badge를 과도하게 연속 나열하지 않는다.
- 상세 화면에서는 Badge보다 ConditionRow를 우선한다.

---

### VerificationBadge

- 운영자 확인 근거와 확인일이 있을 때만 `Verified`를 표시한다.
- `Verified` 옆이나 같은 정보 그룹에 확인일을 표시한다.
- 확인일이 없다면 Blue 또는 Green Verified Badge를 사용하지 않는다.
- 검증 정보와 사용자 리뷰를 같은 의미로 표현하지 않는다.

---

### LastCheckedStatus

표시 예시:

```text
Checked 3 days ago
Checked on July 20, 2026
Needs reconfirmation
Not yet verified
```

확인 방법은 상세 화면에서 표시한다.

```text
Phone
Instagram DM
Official website
In person
```

정보 신선도 기준은 제품 정책을 따른다.

현재 90일 기준은 임시 운영 기준이며 확정 정책처럼 컴포넌트에 직접 Hard Coding하지 않는다.

```text
Temporary stale threshold: 90 days
```

가능하면 서버 또는 공통 설정에서 상태를 계산한다.

---

### MapMarker

| 상태 | 표현 |
|---|---|
| Default | 기본 Surface + Border + Place Icon |
| Hover | Primary Soft + Primary Border |
| Selected | Primary Background + White Icon + Outer Ring |
| Stale | Neutral Marker + Warning Indicator |

- 카드 Hover 시 대응 마커도 Hover 상태가 된다.
- 마커 Hover 시 대응 카드를 강조한다.
- 필요한 경우 해당 카드를 목록 Viewport 안으로 이동한다.
- 마커 선택 시 지도 중심을 이동한다.
- 위치 관계를 잃을 정도로 과도하게 Zoom하지 않는다.
- 가격표 형태의 Marker를 사용하지 않는다.

---

### SelectedPlacePreview

표시할 정보:

- 장소명
- 카테고리
- 거리
- Indoor
- Carrier / Stroller
- Dog size
- Verification 상태
- Last checked
- `View details`
- `Directions`
- `Call`

표시하지 않을 정보:

- 전체 운영시간
- 전체 준비물
- 전체 주의사항
- 긴 장소 설명
- 리뷰 목록
- 한국어 문의 문장 전체

---

### BeforeYouGo

장소 상세 화면의 핵심 Section이다.

첫 번째 그룹:

```text
Indoor
Carrier / Stroller
Dog size
```

두 번째 그룹:

```text
Breed restrictions
Required items
Warnings
Additional conditions
```

세 번째 그룹:

```text
Last checked
Verification method
Policy change disclaimer
```

- 사진 Carousel이나 리뷰보다 아래로 밀리지 않게 한다.
- Unknown 상태를 숨기지 않는다.
- 제한 조건은 짧고 직접적으로 작성한다.

---

### AskInKoreanCard

영어 UI 사용자가 매장에 전화하거나 DM을 보낼 때 사용할 한국어 문장을 제공한다.

- 실제 한국어 문장과 영어 설명을 구분한다.
- `Copy Korean message` Button을 제공한다.
- 복사 성공 시 `Copied` Feedback을 표시한다.
- 자동으로 전화하거나 DM을 전송하지 않는다.
- 한국어 UI에서는 기본적으로 표시하지 않는다.
- 장소 선택 프리뷰가 아니라 상세 페이지에서 제공한다.

예시:

```text
English:
Ask whether your dog can enter without a carrier.

Korean:
안녕하세요. 반려견과 함께 방문하려고 하는데,
이동장 없이 입장이 가능한가요?
```

---

### MobileBottomSheet

- 상단 Radius: 20px
- 지도와 결과의 현재 선택 상태를 유지한다.
- 내부 목록 Scroll과 Drag Gesture가 충돌하지 않아야 한다.
- 선택 장소를 닫으면 이전 결과 목록 상태로 돌아간다.
- Drag Handle에 접근 가능한 보조 조작을 제공한다.
- 상세 페이지 전체 내용을 Sheet에 넣지 않는다.

---

### Input and Form

- 모든 Input에 Visible Label을 사용한다.
- 필수 여부는 Label에서 표시한다.
- Placeholder만으로 입력 목적을 설명하지 않는다.
- Validation Error는 Input 아래에 표시한다.
- `aria-invalid`, `aria-describedby`를 연결한다.

관리자 조건 입력은 다음 상태를 명확히 구분한다.

```text
Allowed
Conditional
Not allowed
Unknown
```

---

### Tabs

- 관련 정보 그룹을 전환할 때만 사용한다.
- 핵심 `Before You Go` 정보를 Tab 안에 숨기지 않는다.
- 모바일 공간 절약을 이유로 너무 많은 Tab을 만들지 않는다.

---

### Dialog

다음 경우에만 사용한다.

- 삭제 확인
- 저장하지 않은 변경
- 짧은 확인 작업

다음 용도로 사용하지 않는다.

- 장소 전체 상세
- 긴 Filter Form
- 긴 운영 정책

Focus Trap, Escape Close, 명확한 제목과 설명을 제공한다.

---

### Table

관리자 화면에서만 사용한다.

표시 항목 예시:

- 장소명
- 공개 상태
- 검증 상태
- 마지막 확인일
- 관리 Action

사용자 탐색 화면에서 Place Card 대신 Table을 사용하지 않는다.

좁은 화면에서는 중요 열을 우선하고 나머지는 Row Detail로 이동한다.

---

## 10. Loading, Empty and Error States

### Loading

- 장소 목록은 실제 Place Card와 유사한 Skeleton을 사용한다.
- 지도 영역의 크기를 유지한다.
- Filter 변경 시 전체 화면을 지우지 않는다.
- 기존 결과 위에 Pending 상태를 표시할 수 있다.

### Empty

기본 문구:

```text
No places match these filters.
```

Primary Action:

```text
Reset filters
```

Secondary Action:

```text
Search a wider area
Move the map and search again
```

검증되지 않은 장소를 Empty State에 임의로 섞지 않는다.

### Location denied

위치 권한 거부를 치명적 오류로 처리하지 않는다.

- 지역 직접 검색을 제공한다.
- 기본 지역 탐색을 제공한다.
- 권한을 요청하기 전에 사용 이유를 설명한다.

### Error

- 재시도 가능한 오류와 입력 오류를 구분한다.
- 지도 오류가 발생해도 장소 목록은 유지한다.
- 가능한 경우 상세 페이지 진입 경로도 유지한다.
- 오류는 색상만으로 표시하지 않는다.
- 오류 제목, 원인, 다음 행동을 함께 제공한다.

---

## 11. Interaction and Motion

- Hover·Focus·Pressed 전환: 120~160ms
- Card·Marker 선택 전환: 160~200ms
- Bottom Sheet는 Drag 위치에 직접 반응한다.
- Drag 종료 시에만 짧게 Snap한다.
- 지도 Pan과 Zoom은 선택 피드백에 필요한 최소 범위로 제한한다.
- `prefers-reduced-motion`에서는 Scale과 큰 이동을 제거한다.
- Loading이 끝난 후 Skeleton이나 Indicator가 계속 움직이지 않게 한다.

Motion 값은 기존 프로젝트 설정이 있다면 기존 값을 우선한다.

---

## 12. Imagery and Iconography

### Imagery

다음 정보를 판단할 수 있는 실제 장소 사진을 우선한다.

- 장소 입구
- 실내 공간
- 야외 공간
- 반려견이 머무를 수 있는 영역

규칙:

- 과도하게 보정된 광고 사진보다 방문 판단에 도움이 되는 사진을 사용한다.
- 사진 위에 조건, 확인일, 핵심 CTA를 직접 올리지 않는다.
- Placeholder는 Neutral Surface 또는 단순한 장소 유형 Illustration을 사용한다.
- 사진이 없다고 해서 조건 정보를 숨기지 않는다.

### Iconography

- 기존 프로젝트의 Icon Library를 유지한다.
- 서로 다른 Icon Library를 혼합하지 않는다.
- Stroke와 크기를 일관되게 사용한다.
- Paw Icon은 브랜드 식별과 지도 Marker에 제한적으로 사용한다.
- 조건 Icon에는 Text Label 또는 접근 가능한 이름을 제공한다.

주요 Icon 대상:

- Indoor
- Carrier
- Stroller
- Dog size
- Verification
- Directions
- Call
- Copy

---

## 13. Content and Localization

### English-first copy

- 짧고 직접적인 문장을 사용한다.
- 추상적인 `Pet-friendly`보다 실제 조건을 표시한다.

권장:

```text
Indoor access available
Carrier required
Small dogs only
Checked 3 days ago
```

피해야 할 표현:

```text
Pet-friendly place
Good for pets
Probably allowed
```

### CTA copy

CTA는 동사형으로 작성한다.

```text
View details
Get directions
Call store
Copy Korean message
Reset filters
Use my location
```

### Place name priority

영어 UI에서 장소 이름은 다음 순서로 표시한다.

```text
Verified English name
→ Official romanized name
→ Original Korean name
```

임의 생성한 번역명은 공식 영문명처럼 표시하지 않는다.

### Trust copy

```text
Verified on [date] via [method].

Store policies may change. Confirm with the store before your visit
if your dog has special requirements.
```

검증 문구를 읽기 어려운 작은 회색 면책 문구로만 처리하지 않는다.

### i18n rules

- 사용자에게 표시되는 문자열을 컴포넌트에 직접 Hard Coding하지 않는다.
- 현재 `next-intl` 메시지 구조를 유지한다.
- 영어와 한국어의 문장 길이 차이를 고려한다.
- 언어 전환 시 현재 페이지의 맥락을 가능한 범위에서 유지한다.
- 번역되지 않은 Key를 그대로 화면에 노출하지 않는다.

---

## 14. Accessibility

WCAG 2.1 AA를 최소 기준으로 한다.

- 일반 텍스트 대비: 4.5:1 이상
- 큰 텍스트 대비: 3:1 이상
- 모든 Interactive Element에 Keyboard 접근 제공
- 모든 Interactive Element에 `focus-visible` 제공
- Icon Button에 `aria-label` 제공
- Toggle과 Chip에 선택 상태 제공
- Form Error에 `aria-invalid`, `aria-describedby` 연결
- 비동기 결과 수에 `aria-live="polite"` 사용
- 복사 성공 메시지에 `aria-live="polite"` 사용
- Map Marker를 대신할 수 있는 Keyboard 접근 가능 목록 제공
- 색상 외에 Text, Icon, Border로 상태 표시
- Touch Target은 최소 44×44px
- `<html lang>`을 현재 Locale과 일치시킨다.
- Bottom Sheet와 Dialog의 Focus 이동과 복귀를 보장한다.
- 의미 있는 장소 사진에는 구체적인 Alt Text를 제공한다.
- 장식용 이미지는 빈 Alt Text를 사용한다.

---

## 15. Do and Don't

### Do

- 지도와 필터를 첫 탐색 도구로 사용한다.
- 카드마다 3대 조건과 확인일을 동일한 순서로 표시한다.
- 선택 카드, 지도 마커, 프리뷰 상태를 동기화한다.
- 정보가 없으면 `Needs confirmation`이라고 표시한다.
- 상세 화면에서 `Before You Go`를 빠르게 찾을 수 있게 한다.
- 모바일에서는 지도 맥락을 유지하는 Bottom Sheet를 사용한다.
- 기존 디자인 토큰과 i18n 구조를 유지한다.
- 미구현 메뉴는 `Coming soon` 또는 Disabled 상태로 표시한다.

### Don't

- 데스크톱에서 목록, 상세, 지도를 항상 고정한 3분할로 만들지 않는다.
- 가격 Marker, 할인 Badge, 예약 CTA를 사용하지 않는다.
- 사진이 핵심 조건과 확인일을 밀어내게 하지 않는다.
- 확인되지 않은 조건을 Green으로 표시하지 않는다.
- 상세 정보를 지도 Preview에 모두 넣지 않는다.
- 상세 정보를 Mobile Bottom Sheet에 모두 넣지 않는다.
- 반려동물 장식으로 오류나 제한의 의미를 약화하지 않는다.
- 미구현 메뉴를 404 페이지로 연결하지 않는다.
- 문서에 있다는 이유로 미구현 기능을 자동으로 추가하지 않는다.
- 디자인 변경을 이유로 데이터 모델과 API를 임의로 변경하지 않는다.

---

## 16. Implementation Checklist

### Global

- [ ] 현재 `globals.css`의 디자인 토큰을 유지했는가?
- [ ] 임의의 Tailwind 색상이 여러 컴포넌트에 분산되지 않았는가?
- [ ] 영어·한국어·숫자에 Font가 일관되게 적용되는가?
- [ ] 사용자 문자열이 i18n 메시지로 관리되는가?

### Layout

- [ ] Desktop이 `400~460px 목록 + 유동 지도` 구조를 따르는가?
- [ ] 고정된 세 번째 상세 Column이 제거되었는가?
- [ ] 장소를 선택하기 전 상세 영역이 공간을 차지하지 않는가?
- [ ] Mobile과 Tablet에서 Map + Bottom Sheet가 동작하는가?
- [ ] 상세 페이지 이동 후 탐색 상태가 가능한 범위에서 복원되는가?

### Selection

- [ ] 목록 카드와 지도 마커의 Hover 상태가 동기화되는가?
- [ ] 목록 카드와 지도 마커의 Selected 상태가 동기화되는가?
- [ ] 선택 시 지도가 재마운트되지 않는가?
- [ ] 지도 이동과 Zoom이 과도하지 않은가?
- [ ] `SelectedPlacePreview`가 지도 Control과 겹치지 않는가?

### Place information

- [ ] `Indoor`가 표시되는가?
- [ ] `Carrier / Stroller`가 표시되는가?
- [ ] `Dog size`가 표시되는가?
- [ ] 세 조건이 모든 Place Card에서 동일한 순서로 표시되는가?
- [ ] Unknown 상태를 허용 또는 불가로 추정하지 않는가?
- [ ] `Verified`와 `Last checked`가 모순되지 않는가?
- [ ] 확인 방법이 상세 화면에 표시되는가?
- [ ] 90일 기준이 확정 정책처럼 UI에 Hard Coding되지 않았는가?

### Detail page

- [ ] `Before You Go`가 상위 정보 계층에 있는가?
- [ ] 검증일과 확인 방법을 쉽게 찾을 수 있는가?
- [ ] 영어 UI에서 `Ask in Korean`을 제공하는가?
- [ ] 한국어 UI에서 불필요한 문의 카드가 숨겨지는가?
- [ ] 문의 문장 복사 후 Feedback을 제공하는가?

### States

- [ ] Loading 상태가 설계되어 있는가?
- [ ] Empty 상태가 설계되어 있는가?
- [ ] 위치 권한 거부 상태가 설계되어 있는가?
- [ ] 지도 오류 상태가 설계되어 있는가?
- [ ] 모든 상태를 Text, Icon, Border로도 구분하는가?

### Accessibility

- [ ] Keyboard로 모든 주요 기능을 사용할 수 있는가?
- [ ] Focus 상태가 명확한가?
- [ ] Touch Target이 44×44px 이상인가?
- [ ] Icon Button에 접근 가능한 이름이 있는가?
- [ ] Bottom Sheet와 Dialog의 Focus가 올바르게 복귀하는가?
- [ ] 지도에 대응하는 접근 가능한 장소 목록이 있는가?

### Scope protection

- [ ] 요청받지 않은 기능을 새로 구현하지 않았는가?
- [ ] 기존 URL 구조를 임의로 변경하지 않았는가?
- [ ] 기존 상태 관리 구조를 임의로 교체하지 않았는가?
- [ ] 가격, 할인, 예약, 숙박 패턴이 섞이지 않았는가?

---

## Included Components

아래 목록은 디자인 적용 대상이며, 전체 기능 구현 요구사항이 아니다.

### Consumer

- Header / Navigation
- SearchBar
- CategoryTabs
- FilterChip
- PlaceCard
- ConditionRow
- ConditionBadge
- VerificationBadge
- LastCheckedStatus
- MapMarker
- SelectedPlacePreview
- BeforeYouGo
- AskInKoreanCard
- MobileBottomSheet
- Button
- Input
- Badge
- Tabs
- Dialog
- Skeleton
- EmptyState
- ErrorState
- Toast

### Admin

- AdminSidebar
- DataTable
- PlaceForm
- ConditionField
- VerificationForm
- StatusBadge
- ConfirmDialog
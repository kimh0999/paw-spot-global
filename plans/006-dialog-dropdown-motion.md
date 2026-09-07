# 006 — 다이얼로그·드롭다운에 진입/퇴장 모션을 넣는다 (감사 #5·#7)

- **Status**: DONE (`아래 커밋 참조`)
- **Commit(기준)**: 303ce93
- **Severity**: MEDIUM (#5) + LOW (#7)
- **Category**: Missed motion / Physicality
- **Scope**: 4 files (`tailwind.config.ts` + 3 컴포넌트)

## Problem

**#5 — 사용 중인 Radix 다이얼로그 2개가 모션 없이 튄다.**

```tsx
// src/components/dogs/DogFormDialog.tsx:39 — 이전
<Dialog.Overlay className="fixed inset-0 z-dialog bg-overlay" />
```
```tsx
// src/components/dogs/DogsManager.tsx:181 — 이전
<Dialog.Overlay className="fixed inset-0 z-dialog bg-overlay" />
```
`data-[state]` 기반 애니메이션이 전혀 없어 오버레이와 콘텐츠가 한 프레임에 나타나고 사라진다.
`DogFormDialog`은 모바일에서 하단 시트 형태(`inset-x-0 bottom-0 rounded-t-2xl`)인데도
아래에서 올라오지 않고 그 자리에 갑자기 생긴다.

**#7 — 정렬 드롭다운이 모션·기준점 없이 나타난다.**

```tsx
// src/components/places/SortDropdown.tsx:42 — 이전
<div className="absolute left-0 top-full mt-1 w-52 bg-surface border rounded-xl shadow-lg z-dropdown overflow-hidden">
```
트리거 바로 아래에서 열리는데 `transform-origin`이 기본값(중앙)이고 진입 모션이 없다.

### 감사의 전제가 틀렸다

모션 감사는 두 항목 모두 **"올바른 처리가 이미 `ui/dialog.tsx`·`ui/dropdown-menu.tsx`에
있으니 그 프리미티브를 채택하면 된다"**고 적었다. 실측 결과 **그 파일들의 애니메이션도
전부 무효**다.

| 파일 | 미컴파일 클래스 |
|---|---|
| `ui/dialog.tsx` | 후보 50개 중 13개 — `data-open:animate-in`·`data-open:fade-in-0`·`data-open:zoom-in-95`·`data-closed:*`·`supports-backdrop-filter:*` 등 |
| `ui/dropdown-menu.tsx` | 후보 86개 중 37개 — 위 + `data-[side=*]:slide-in-from-*`·`data-open:bg-accent`·`data-inset:*` 등 |

`data-open:` / `data-closed:`는 **v4 축약**이다. v3는 `data-[state=open]:` / `data-[state=closed]:`를
쓴다(계획 005와 같은 근본 원인).

**`tw-animate-css`도 쓸 수 없다.** `globals.css:1`이 import하고 있어 `@keyframes enter`·`exit`와
`@property --tw-enter-*`는 빌드 CSS에 들어오지만, `.animate-in`·`.fade-in-0` 같은 **유틸리티는
v4 `@utility` 문법으로 정의돼 있어 v3가 무시한다.** 빌드 CSS에 해당 클래스가 없다.

따라서 프리미티브를 채택하는 것이 아니라, **사용 중인 컴포넌트에 v3 문법으로 직접** 넣는다.

## Target

### 왜 transition이 아니라 keyframes인가

Radix의 `Presence`는 닫힐 때 **CSS 애니메이션이 돌고 있으면** 언마운트를 미룬다
(`animationName !== 'none'` 확인). **transition으로는 지연되지 않아** 퇴장 모션이 잘린다.
그래서 `tailwind.config.ts`에 keyframes를 정의한다.

### 중앙 정렬과 transform 충돌

중앙 정렬 다이얼로그는 `left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`로 위치를 잡는다.
keyframe이 `transform: scale(...)`만 쓰면 **정렬 translate를 덮어써 다이얼로그가 튀어나간다.**
그래서 `dialog-in`/`dialog-out`의 keyframe에 `translate(-50%, -50%)`를 함께 넣는다.

모바일 하단 시트는 정렬 translate가 없으므로 `translateY(100%) → 0`을 그대로 쓴다.

### 값

| 애니메이션 | 대상 | 지속시간 | 이징 |
|---|---|---|---|
| `overlay-in` / `overlay-out` | 오버레이 opacity | `standard` 250ms | enter / exit |
| `dialog-in` / `dialog-out` | 중앙 다이얼로그 opacity + `scale(0.97↔1)` | `standard` 250ms | enter / exit |
| `sheet-in` / `sheet-out` | 하단 시트 opacity + `translateY(100%↔0)` | `standard` 250ms | enter / exit |
| `popover-in` | 드롭다운 opacity + `scale(0.95↔1)` | `fast` 150ms | enter |

전부 계획 001이 만든 `--duration-*`·`--ease-*` 토큰을 참조한다.
`scale(0)`을 쓰지 않는다(AUDIT §3 — 아무것도 없는 데서 생기지 않는다).
`DESIGN.md` §8이 금지한 bounce·overshoot 없음.

## Reduced motion 처리

세 컴포넌트 모두 `motion-reduce:animate-none`을 건다. 계획 003에서 사용자가 확정한 기준
— **이동과 페이드를 모두 제거** — 을 그대로 따른다.

Radix는 애니메이션이 없으면 즉시 언마운트하므로, reduced motion에서 다이얼로그는
전환 없이 나타나고 사라진다. 의도된 동작이다.

## Steps (실행 완료)

1. `tailwind.config.ts`의 `theme.extend`에 `keyframes` 7개와 `animation` 7개를 추가했다.
   `transitionDuration` 바로 앞에 두어 모션 관련 설정을 한곳에 모았다.
2. `DogFormDialog.tsx` — 오버레이에 `data-[state=open]:animate-overlay-in
   data-[state=closed]:animate-overlay-out motion-reduce:animate-none`.
   콘텐츠는 모바일 `sheet-*`, `sm:` 이상에서 `dialog-*`를 쓰도록 반응형으로 걸었다.
3. `DogsManager.tsx` 삭제 확인 다이얼로그 — 오버레이 동일, 콘텐츠는 `dialog-*`.
4. `SortDropdown.tsx` — `origin-top-left animate-popover-in motion-reduce:animate-none`.

## Boundaries (지킴)

- `ui/dialog.tsx`·`ui/dropdown-menu.tsx`·`ui/sheet.tsx`를 **채택하지도 수정하지도 않았다.**
  세 파일 모두 v4 문법이 남아 있고 미사용이다. 감사 #8과 P0 #7에서 함께 다룬다.
- `SortDropdown`을 Radix `DropdownMenu`로 교체하지 않았다 — 접근성 구조 변경은 P0 #7 범위다.
- 다이얼로그의 focus 관리(`onCloseAutoFocus`)·마크업을 건드리지 않았다.
- `tw-animate-css` 의존을 추가하거나 제거하지 않았다.

## 알려진 한계

**`SortDropdown`은 퇴장 모션이 없다.** `{isOpen && ...}` 조건부 언마운트라 닫는 순간
DOM에서 사라진다. 퇴장을 넣으려면 상시 마운트 + `pointer-events` 관리가 필요한데,
그러면 닫힌 메뉴의 버튼들이 탭 순서에 남아 접근성이 나빠진다. 올바른 해법은 Radix
`DropdownMenu`(Presence 내장)로 옮기는 것이고 **P0 #7과 함께 처리한다.**
진입 모션만으로도 "어디서 나왔는지"는 전달된다.

## Verification (실행 결과)

**Mechanical** — typecheck · lint · vitest 478건 · 클린 `next build` 전부 통과.

**빌드 CSS** — `@keyframes` 7개 전부 정의됨. 변형 규칙 생성 확인:
```
.data-\[state\=open\]\:animate-dialog-in[data-state=open]{animation:dialog-in var(--duration-standard) var(--ease-enter)}
.data-\[state\=open\]\:animate-overlay-in[data-state=open]{animation:overlay-in var(--duration-standard) var(--ease-enter)}
```

**브라우저 실측**

| 확인 | 결과 |
|---|---|
| 다이얼로그 진입 | 콘텐츠 `dialog-in` 0.25s `cubic-bezier(0, 0, 0.2, 1)`, 오버레이 `overlay-in` 0.25s |
| 다이얼로그 퇴장 | 닫기 100ms 후 **콘텐츠가 여전히 마운트**된 채 `data-state="closed"` + `dialog-out` `cubic-bezier(0.4, 0, 1, 1)` — Radix가 언마운트를 미룬다 |
| 퇴장 완료 | 포그라운드에서 애니메이션 종료 후 다이얼로그·오버레이 모두 DOM에서 사라짐 |
| 드롭다운 | `popover-in` 0.15s `cubic-bezier(0, 0, 0.2, 1)`, `transform-origin: 0px 0px`(좌상단) |

> **검증 중 주의**: 브라우저 탭이 백그라운드면 Chrome이 애니메이션을 멈춘다
> (`playState: "running"`인데 `currentTime: 0`). 이 상태에서는 Radix가 `animationend`를
> 못 받아 다이얼로그가 안 사라지는 것처럼 보인다. **결함이 아니다.** 포그라운드로
> 가져온 뒤 확인해야 한다.

**미검증** — 모바일 폭에서의 `sheet-in`/`sheet-out`. 창 리사이즈가 뷰포트에 반영되지 않아
`sm:` 미만 분기를 화면으로 확인하지 못했다. 클래스와 CSS 규칙 생성까지만 확인했다.

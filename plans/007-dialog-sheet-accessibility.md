# 007 — FilterModal을 Radix Dialog로 교체하고 Bottom Sheet에 키보드 경로를 연다 (P0 #7)

- **Status**: DONE
- **Commit(기준)**: 1ba0022
- **Severity**: HIGH (P0 · MVP 출시 차단)
- **Category**: Accessibility
- **Scope**: 3 files (`tailwind.config.ts` · `FilterModal.tsx` · `PlacesClient.tsx`)

## Problem

`DESIGN.md` §11이 규정한다 — `Bottom Sheet와 Dialog는 focus trap과 Escape 닫기를 지원한다`.

```tsx
// src/components/places/FilterModal.tsx — 이전 (계획 003 이후 상태)
<div onClick={onClose} className={cn("fixed inset-0 z-drawer bg-overlay …")} />
<div className={cn("fixed top-0 right-0 z-drawer … max-w-sm …", isOpen ? "translate-x-0" : "translate-x-full")}>
  <h2 className="font-bold …">{t("filters.title")}</h2>
```

필터 드로어에 `role`·`aria-labelledby`·ESC·focus trap·스크롤 잠금이 전부 없었다.
게다가 **닫혀 있어도 DOM에 남아** 화면 밖 패널의 버튼 16개가 탭 순서에 그대로 있었다
(계획 003이 남긴 알려진 한계).

## 명세와 다르게 간 것 — Bottom Sheet에는 focus trap을 걸지 않는다

`PROJECT_STATUS`의 P0 #7과 §4 `시트 접근성` 행, 개발명세서 T-06은 **Bottom Sheet에도**
`role="dialog"`·`aria-modal`·focus trap·ESC 닫기를 요구한다. **그대로 하지 않았다.**

기획서 v3 §6-2와 개발명세서가 정의한 시트는 **닫히는 패널이 아니다.**

| 단계 | 내용 |
|---|---|
| 1단계 (요약) | 결과 개수 + 목록 열기 — **항상 화면에 있다** |
| 2단계 (목록) | 검색·카테고리·필터·정렬 + 카드 목록 |
| 3단계 (선택) | 선택한 장소 미리보기 |

지도가 배경에서 계속 조작되는 구조이고(`DESIGN.md` §5 — `지도를 배경으로 두고`),
시트에는 **닫힌 상태 자체가 없다.** 여기에 명세대로 걸면:

- **focus trap** → 지도·헤더·`내 위치` 버튼에 키보드로 도달할 수 없다. 상시 표시되는
  패널이라 빠져나올 방법이 없다.
- **`aria-modal="true"`** → 스크린리더에서 지도와 헤더가 영구히 가려진다.
- **ESC 닫기** → 닫을 대상이 없다. 1단계는 접히지 않는다.

즉 명세를 글자대로 따르면 **접근성이 나빠진다.** 그래서 시트에는 모달 시맨틱 대신
**키보드로 3단계에서 벗어나는 길**과 **토글 상태 노출**만 넣었다.

> `DESIGN.md` §11의 `Bottom Sheet와 Dialog는 focus trap과 Escape 닫기를 지원한다`는
> **모달로 뜨는 시트**(예: `DogFormDialog`의 모바일 하단 시트 — Radix Dialog로 이미 구현)에는
> 그대로 적용된다. 이 탐색 화면의 상시 시트만 예외다.

## Target

### FilterModal — Radix Dialog

```tsx
<Dialog.Root open={isOpen} onOpenChange={(next) => { if (!next) onClose(); }}>
  <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 z-drawer bg-overlay data-[state=open]:animate-overlay-in data-[state=closed]:animate-overlay-out motion-reduce:animate-none" />
    <Dialog.Content
      aria-describedby={undefined}
      className="fixed top-0 right-0 z-drawer flex h-full w-full max-w-sm flex-col bg-surface shadow-2xl outline-none data-[state=open]:animate-drawer-in data-[state=closed]:animate-drawer-out motion-reduce:animate-none"
    >
      <Dialog.Title …>{t("filters.title")}</Dialog.Title>
      <Dialog.Close aria-label={tCommon("close")} …>
```

Radix가 제공하는 것: `role="dialog"` · `aria-labelledby`(Title 연결) · ESC · focus trap ·
닫은 뒤 트리거로 focus 복귀 · 스크롤 잠금 · 바깥 클릭 닫기 · **바깥 콘텐츠 `aria-hidden`**.

`aria-describedby={undefined}` — 설명 문단이 없는 패널이라 Radix의 자동 연결을 끈다
(끄지 않으면 콘솔 경고).

**모션은 계획 003의 값을 그대로 옮겼다** — 250ms(`standard`), 진입 `ease-enter` /
퇴장 `ease-exit`, reduced motion에서 둘 다 제거. 다만 transition → keyframes로 바꿨다.
Radix는 닫을 때 CSS **애니메이션**이 돌아야 언마운트를 미루기 때문이다(계획 006과 같은 이유).
우측 드로어용 `drawer-in`/`drawer-out`(`translateX(100%)` ↔ `0`)을 새로 정의했다.

### Bottom Sheet — 모달이 아닌 채로 키보드 경로만 연다

```tsx
// 3단계에서 벗어나는 길
useEffect(() => {
  if (!selectedPlaceId || isFilterOpen) return;
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") clearSelectedPlace();
  }
  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
}, [selectedPlaceId, isFilterOpen, clearSelectedPlace]);
```

```tsx
// 목록/지도 토글의 상태 노출
aria-expanded={isSheetListOpen}
```

필터 드로어가 열려 있으면 ESC는 그쪽이 우선이므로 아무 것도 하지 않는다.

시트 자체는 이미 `<section aria-label={t("list.title")}>`이라 이름 있는 landmark다.
`role`을 덧붙이지 않았다.

## Repo conventions to follow

- **Radix는 `radix-ui` 통합 패키지에서 가져온다.** `import { Dialog } from "radix-ui"` —
  `DogFormDialog.tsx:3`이 정본이다. 미사용 래퍼 `ui/dialog.tsx`·`ui/sheet.tsx`를 쓰지 않는다
  (계획 006에서 확인 — 그 파일들의 클래스는 v4 문법이라 무효다).
- `Dialog.Title`·`Dialog.Description`·`Dialog.Close`를 쓴다(`DogFormDialog.tsx:50-60`).
- 애니메이션은 `tailwind.config.ts`의 keyframes + `data-[state=*]` 변형(계획 006).
- z-index는 토큰만(`z-drawer`).

## Reduced motion 처리

오버레이·드로어 모두 `motion-reduce:animate-none`. 계획 003에서 사용자가 확정한
**이동과 페이드를 모두 제거**를 그대로 따른다. 애니메이션이 없으면 Radix는 즉시
언마운트하므로 드로어는 전환 없이 나타나고 사라진다.

## Boundaries (지킴)

- `SortDropdown`을 Radix로 교체하지 않았다. 감사 #7의 퇴장 모션과 함께 별도 작업으로 남는다.
- `ui/dialog.tsx`·`ui/sheet.tsx`·`ui/dropdown-menu.tsx`를 채택하지도 수정하지도 않았다.
- 필터 항목·칩·`onReset`/`onApply` 동작을 바꾸지 않았다. props 시그니처도 그대로라
  `PlacesClient`의 호출부는 무변경이다.
- 시트의 3단계 로직(`sheetState` 파생)과 높이 전환을 건드리지 않았다(조사 계획 004 대상).

## Verification (실행 결과)

**Mechanical** — typecheck · lint · vitest 478건 · 클린 `next build` 전부 통과.

**브라우저 실측 — FilterModal**

| 확인 | 결과 |
|---|---|
| 닫혔을 때 DOM | `[role="dialog"]` **0개** — 화면 밖 패널이 탭 순서에 남던 문제 해소 |
| 열었을 때 | `role="dialog"`, `aria-labelledby` 있음, `aria-describedby` 없음(의도) |
| focus | 열자마자 focus가 다이얼로그 **안으로** 이동 (`dialog.contains(activeElement) === true`) |
| 바깥 가림 | 앱 루트 `<div class="flex h-[100dvh] …">`에 `aria-hidden="true"` |
| 스크롤 잠금 | `body`에 잠금 적용 |
| 모션 | `drawer-in` 0.25s `cubic-bezier(0, 0, 0.2, 1)` |
| ESC | `data-state="closed"`로 전환 후 `drawer-out` 재생, 종료 후 언마운트 |

**브라우저 실측 — Bottom Sheet**

| 확인 | 결과 |
|---|---|
| 토글 | `aria-expanded="false"` (목록 닫힘 상태) |
| ESC로 선택 해제 | `[aria-current="true"]` 개수 0 → 1(카드 선택) → **0**(ESC) |

> **`aria-modal`은 설정되지 않는다.** Radix는 대신 바깥 콘텐츠에 `aria-hidden`을 건다.
> 명세는 `aria-modal`을 지목했지만, 보조기술 지원 폭이 넓은 쪽은 `aria-hidden`이다.
> 요구된 동작(바깥이 스크린리더에 노출되지 않음)은 충족한다.

**미검증** — 모바일 폭에서의 드로어·시트 동작. 창 리사이즈가 뷰포트에 반영되지 않아
`lg` 미만 분기를 화면으로 확인하지 못했다.

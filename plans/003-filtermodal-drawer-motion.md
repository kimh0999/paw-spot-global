# 003 — FilterModal 드로어의 지속시간·이징·reduced motion·오버레이 전환을 정리한다

- **Status**: TODO
- **Commit**: 046adbb
- **Severity**: MEDIUM
- **Category**: Easing & duration / Physicality & cohesion / Accessibility
- **Estimated scope**: 1 file, 약 15줄
- **Depends on**: [001](001-motion-tokens.md) (`duration-standard`·`ease-enter`·`ease-exit` 토큰 필요)
- **Findings covered**: 감사 #3(지속시간·이징·reduced motion), #4(오버레이 전환)

## Problem

`FilterModal`은 우측에서 밀려 들어오는 드로어다. 모바일·데스크톱 양쪽에서 `필터` 버튼으로 연다(`PlacesClient.tsx:562`). 현재 코드:

```tsx
// src/components/places/FilterModal.tsx:67-77 — 현재
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-overlay z-drawer" onClick={onClose} />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-surface z-drawer shadow-2xl flex flex-col transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
```

문제가 네 가지 겹쳐 있다.

**(1) 지속시간이 스케일 밖이다.** `duration-300`은 `DESIGN.md` §8의 `0/150/250/350` 어디에도 없다. §8은 `standard 250ms — panel, tab, Bottom Sheet`로 패널을 명시한다.

**(2) 이징 토큰을 쓰지 않는다.** 이징 클래스가 아예 없어 Tailwind 기본값에 의존한다. 우연히 `--ease-standard`와 값이 같지만, 문서화된 토큰과의 연결이 코드에 없다. `DESIGN.md` §8이 `--ease-enter`·`--ease-exit`를 따로 정의한 이유 — 들어올 때와 나갈 때의 커브를 나누는 것 — 도 반영돼 있지 않다.

**(3) reduced motion 게이트가 없다.** `DESIGN.md:462`는 `prefers-reduced-motion: reduce에서는 이동 애니메이션을 제거한다`고 규정한다. 이 드로어는 화면 폭만큼 이동하는데 게이트가 없다. 같은 저장소의 Bottom Sheet(`PlacesClient.tsx:250`)와 데스크톱 패널(`PlacesClient.tsx:538`)은 둘 다 `motion-reduce:transition-none`을 걸고 있다 — **이 파일만 빠져 있다.**

**(4) 오버레이가 튄다.** 오버레이는 `{isOpen && ...}`로 마운트/언마운트되어 **즉시** 나타나고 사라진다. 반면 패널은 300ms 동안 미끄러진다. 닫을 때 특히 눈에 띈다 — 배경 어둠이 먼저 툭 사라지고, 패널만 허공에서 300ms 더 미끄러져 나간다. 두 요소가 한 덩어리로 보이지 않는다.

**수정 목적**: 드로어를 하나의 움직임으로 만들고, 문서화된 토큰과 reduced motion 규칙을 지킨다.

## Target

```tsx
// src/components/places/FilterModal.tsx:67-79 — 목표
  return (
    <>
      {/* 오버레이는 항상 마운트해 둔다. 열고 닫을 때 패널과 같은 시간·커브로 함께 사라져야
          한 덩어리로 읽힌다. 닫힌 동안에는 pointer-events를 꺼서 화면을 막지 않는다. */}
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-drawer bg-overlay transition-opacity duration-standard",
          isOpen ? "opacity-100 ease-enter" : "pointer-events-none opacity-0 ease-exit",
        )}
      />

      <div
        className={cn(
          "fixed top-0 right-0 z-drawer flex h-full w-full max-w-sm flex-col bg-surface shadow-2xl",
          "transition-transform duration-standard motion-reduce:transition-none",
          isOpen ? "translate-x-0 ease-enter" : "translate-x-full ease-exit",
        )}
      >
```

값의 근거:

| 값 | 출처 |
|---|---|
| `duration-standard` (250ms) | `DESIGN.md`:449 — `standard 250ms  panel, tab, Bottom Sheet` |
| `ease-enter` = `cubic-bezier(0, 0, 0.2, 1)` | `DESIGN.md`:456 |
| `ease-exit` = `cubic-bezier(0.4, 0, 1, 1)` | `DESIGN.md`:457 |
| `motion-reduce:transition-none` (패널만) | `DESIGN.md`:462 — 이동 애니메이션 제거 |

### 이징을 방향별로 나누는 이유

`DESIGN.md` §8은 `--ease-enter`와 `--ease-exit`를 따로 정의해 놓고 저장소 어디에서도 쓰지 않는다. 드로어는 진입·퇴장이 뚜렷하게 갈리는 몇 안 되는 표면이라 두 커브가 실제로 의미를 갖는 자리다.

`--ease-exit`는 가속 커브(느리게 시작해 빨라짐)다. "퇴장에도 감속 커브를 쓴다"는 일반 권고와는 다르지만, **`DESIGN.md`가 이 저장소의 유일한 디자인 기준이므로 문서 값을 따른다.** 커브가 마음에 들지 않더라도 이 계획에서 바꾸지 않는다 — `DESIGN.md` 개정이 선행돼야 한다. Feel check에 판단 기준을 넣어 두었으니, 어색하면 **보고만** 한다.

## Files

| 파일 | 변경 |
|---|---|
| `src/components/places/FilterModal.tsx` | `cn` import 추가 · 오버레이 상시 마운트 + opacity 전환 · 패널 토큰화 + reduced motion 게이트 |

다른 파일은 건드리지 않는다. 호출부(`PlacesClient.tsx:562`)의 props는 그대로다.

## Repo conventions to follow

- **조건부 className은 `cn()`을 쓴다.** `src/CLAUDE.md` §7이 명시하고 있고, 저장소 전반이 그렇다. `FilterModal.tsx`는 현재 백틱 템플릿 리터럴(`74-76행`)을 쓰는 예외라 이 계획에서 관행에 맞춘다.
  ```ts
  // src/lib/utils.ts — cn 정의 (clsx + tailwind-merge)
  ```
  import 형태는 `PlacesClient.tsx:25`와 동일하게:
  ```tsx
  import { cn } from "@/lib/utils";
  ```
- **정본 예시(exemplar)** — 토큰 + reduced motion 게이트를 한 줄에 두는 형태:
  ```tsx
  // src/app/[locale]/(public)/places/PlacesClient.tsx:538
  "xl:transition-[width] xl:duration-standard xl:ease-standard motion-reduce:xl:transition-none",
  ```
  ```tsx
  // src/app/[locale]/(public)/places/PlacesClient.tsx:250
  "transition-[height] duration-standard ease-standard motion-reduce:transition-none",
  ```
- **`cn()` 인자를 목적별로 줄바꿈한다.** `PlacesClient.tsx:246-253`이 `레이아웃 / 모션 / 상태별` 순으로 문자열을 나눠 넘긴다. 목표 코드가 그 형태다.
- **`bg-overlay`는 이미 있는 토큰이다.** `globals.css:40`의 `--color-overlay: rgb(17 24 39 / 48%)`를 `tailwind.config.ts:31`이 매핑한다. 새 색을 만들지 않는다.
- **z-index는 토큰만 쓴다.** `z-drawer`를 유지한다. 오버레이와 패널이 같은 `z-drawer`이고 **DOM 순서로 패널이 위에 온다** — 순서를 바꾸지 않는다.

## Reduced motion 처리

두 요소를 다르게 다룬다. 이게 이 계획에서 가장 틀리기 쉬운 부분이다.

| 요소 | 전환 속성 | reduced motion |
|---|---|---|
| 패널 | `transform` (화면 폭만큼 **이동**) | `motion-reduce:transition-none` — **즉시 제자리로.** 이동 애니메이션 제거 |
| 오버레이 | `opacity` (이동 없음) | **게이트를 걸지 않는다.** 페이드는 그대로 유지 |

근거: `DESIGN.md:462`가 제거하라고 한 대상은 **이동** 애니메이션이다. 오버레이의 투명도 변화는 이동이 아니고, 배경이 어두워지는 과정은 "지금 모달이 열렸다"를 이해시키는 신호다. 전부 없애면 화면이 깜빡 바뀌기만 해서 오히려 이해가 어려워진다.

결과적으로 reduced motion에서는 **패널이 즉시 나타나고 오버레이만 250ms에 걸쳐 어두워진다.** 의도된 동작이다. 어색해 보인다고 오버레이에도 `motion-reduce:transition-none`을 붙이지 않는다.

## Steps

1. **import를 추가한다.** `src/components/places/FilterModal.tsx`의 3-12행은 현재:
   ```tsx
   import { useTranslations } from "next-intl";
   import { X } from "lucide-react";

   import type {
     PlaceFilters,
     DogSizeFilter,
     IndoorFilter,
     CarrierFilter,
     RecentFilter,
   } from "@/types/place";
   ```
   `import type` 그룹 **앞에** `cn` import를 넣는다(`src/CLAUDE.md` §3.3 — 내부 절대경로 그룹, type import는 그룹 마지막):
   ```tsx
   import { useTranslations } from "next-intl";
   import { X } from "lucide-react";

   import { cn } from "@/lib/utils";
   import type {
     PlaceFilters,
     DogSizeFilter,
     IndoorFilter,
     CarrierFilter,
     RecentFilter,
   } from "@/types/place";
   ```

2. **오버레이를 상시 마운트로 바꾼다.** 69-71행 현재:
   ```tsx
         {isOpen && (
           <div className="fixed inset-0 bg-overlay z-drawer" onClick={onClose} />
         )}
   ```
   다음으로 교체한다:
   ```tsx
         {/* 오버레이는 항상 마운트해 둔다. 열고 닫을 때 패널과 같은 시간·커브로 함께 사라져야
             한 덩어리로 읽힌다. 닫힌 동안에는 pointer-events를 꺼서 화면을 막지 않는다. */}
         <div
           onClick={onClose}
           className={cn(
             "fixed inset-0 z-drawer bg-overlay transition-opacity duration-standard",
             isOpen ? "opacity-100 ease-enter" : "pointer-events-none opacity-0 ease-exit",
           )}
         />
   ```
   **`pointer-events-none`은 필수다.** 이걸 빠뜨리면 닫힌 상태의 투명한 오버레이가 화면 전체를 덮어 **모든 클릭이 막힌다.** 가장 위험한 실수다.

   `onClick={onClose}`는 그대로 둔다. `<div onClick>`이 `src/CLAUDE.md` §17 위반인 것은 맞지만 **기존 문제이고 P0 #7(FilterModal을 Radix `Dialog`로 교체)이 담당한다.** 여기서 고치지 않는다.

3. **패널을 `cn()`으로 바꾸고 토큰을 적용한다.** 73-77행 현재:
   ```tsx
         <div
           className={`fixed top-0 right-0 h-full w-full max-w-sm bg-surface z-drawer shadow-2xl flex flex-col transition-transform duration-300 ${
             isOpen ? "translate-x-0" : "translate-x-full"
           }`}
         >
   ```
   다음으로 교체한다:
   ```tsx
         <div
           className={cn(
             "fixed top-0 right-0 z-drawer flex h-full w-full max-w-sm flex-col bg-surface shadow-2xl",
             "transition-transform duration-standard motion-reduce:transition-none",
             isOpen ? "translate-x-0 ease-enter" : "translate-x-full ease-exit",
           )}
         >
   ```
   레이아웃 클래스는 순서만 정리했을 뿐 **집합이 같다** — `fixed top-0 right-0 z-drawer flex h-full w-full max-w-sm flex-col bg-surface shadow-2xl`. 클래스를 추가하거나 빼지 않았는지 대조한다.

4. **닫는 태그 구조가 그대로인지 확인한다.** 파일 끝(176-178행 부근)은:
   ```tsx
         </div>
       </>
     );
   }
   ```
   Fragment(`<>...</>`)와 패널 `</div>`의 짝이 유지돼야 한다. 2단계에서 `{isOpen && (...)}` 래퍼를 없앴으므로 괄호 짝이 어긋나기 쉽다.

## Boundaries

- 드로어 **내부**(헤더·필터 섹션·하단 버튼, 79-175행)를 건드리지 않는다. `chipBase`/`chipActive`/`chipInactive`(23-25행)도 그대로 둔다.
- `<div onClick>`을 `<button>`이나 Radix `Dialog`로 바꾸지 않는다 — **P0 #7 담당.**
- focus trap · ESC 닫기 · `role="dialog"` · `aria-modal`을 추가하지 않는다 — **전부 P0 #7 담당.** 이 계획은 모션만 다룬다.
- 닫힌 패널이 탭 순서에 남아 있는 문제(`translate-x-full`로 화면 밖에 있을 뿐 DOM에 존재)를 고치지 않는다. `inert`나 `hidden`을 추가하지 않는다 — P0 #7이 구조째 바꾼다.
- props 시그니처(`isOpen`/`filters`/`onClose`/`onChange`/`onReset`/`onApply`)를 바꾸지 않는다.
- `PlacesClient.tsx`를 건드리지 않는다.
- `DESIGN.md`의 이징 값을 바꾸지 않는다.
- 새 의존성을 추가하지 않는다.
- 단계에 적힌 코드가 실제 파일과 다르면 임의로 맞추지 말고 **STOP하고 보고한다.**

## Verification

**Mechanical** — 전부 통과해야 한다.

```bash
npx tsc --noEmit          # 출력 없음
npx next lint             # "✔ No ESLint warnings or errors"
npx vitest run            # 26 files / 478 tests passed
npx next build            # "✓ Compiled successfully"
```

잔여 확인:
```bash
grep -n "duration-300" src/components/places/FilterModal.tsx   # 0건
grep -n "pointer-events-none" src/components/places/FilterModal.tsx  # 1건
```

**Feel check** — `npx next start -p 3100` 후 `/ko/places`를 **데스크톱 폭**에서 연다.

- **클릭 차단(최우선)**: 페이지를 열자마자 필터를 **열지 않은 상태로** 검색창에 타이핑하고, 카테고리 칩을 누르고, 목록 카드를 눌러 본다. **하나라도 반응하지 않으면 `pointer-events-none`이 빠진 것이다.** 즉시 중단하고 2단계를 다시 확인한다.
- **한 덩어리로 보이는가**: `필터` 버튼을 눌러 연다. 배경 어둠과 패널이 **같이** 시작해 **같이** 끝나야 한다. 닫을 때가 더 중요하다 — 배경이 먼저 사라지고 패널만 남아 미끄러지면 실패다.
- DevTools **Animations 패널**에서 재생 속도를 **10%**로 낮추고 열기/닫기를 각각 한 번씩 본다. 두 애니메이션이 같은 프레임에 시작하고 같은 프레임에 끝나는지 확인한다.
- **중단 가능성**: 패널이 미끄러지는 **도중에** `필터`를 다시 눌러 닫는다. 처음 위치로 튀지 않고 **현재 위치에서** 반대 방향으로 이어져야 한다(CSS transition의 retarget). 튀면 어딘가에서 keyframe 애니메이션을 쓴 것이다.
- **이징 방향**: 열 때는 빠르게 들어와 부드럽게 멈추고(`ease-enter`), 닫을 때는 천천히 떠나 빠르게 사라진다(`ease-exit`). 닫기가 **굼뜨게 느껴지면 코드를 바꾸지 말고 그 관찰을 보고한다** — `DESIGN.md` §8 개정 사안이다.
- **reduced motion**: DevTools **Rendering 패널 → Emulate CSS media feature `prefers-reduced-motion: reduce`**를 켜고 열기/닫기를 반복한다.
  - 패널은 **즉시** 제자리에 나타나고 즉시 사라진다(이동 없음).
  - 배경 어둠은 **여전히 250ms에 걸쳐 페이드**된다. 배경까지 즉시 바뀌면 게이트를 잘못 건 것이다.
- **모바일**: DevTools 디바이스 모드(iPhone 12)로 바꿔 같은 동작을 확인한다. `max-w-sm`이라 폭이 화면에 꽉 차므로 이동 거리가 더 길다.
- **오버레이 클릭으로 닫기**: 열린 상태에서 왼쪽 어두운 영역을 눌러 닫힌다.

**Done when**

- 필터가 닫힌 상태에서 페이지의 모든 조작이 정상 동작한다.
- 오버레이와 패널이 열기·닫기 모두에서 동시에 시작하고 동시에 끝난다.
- 전환 도중 다시 토글해도 현재 위치에서 이어진다.
- reduced motion에서 패널 이동은 사라지고 오버레이 페이드는 남는다.
- `duration-300` 잔여 0건.
- Mechanical 4종 통과.

## Impact and regression risk

**영향 범위**: `FilterModal` 한 컴포넌트. 호출부는 `PlacesClient.tsx:562` 한 곳이고 props가 바뀌지 않으므로 파급이 없다. 필터 값·URL 반영·초기화 동작(계획 016 `place-list-params`)은 전혀 건드리지 않는다.

| 위험 | 수준 | 근거 / 완화 |
|---|---|---|
| **`pointer-events-none` 누락 → 앱 전체 클릭 불가** | **높음** | 오버레이를 상시 마운트로 바꾸면서 생기는 유일한 치명적 실수다. 타입체크·린트·테스트·빌드 **어느 것도 잡지 못한다.** Feel check 첫 항목을 이 검사로 둔 이유다 |
| `cn()` 도입 중 클래스 누락 | 중 | 3단계에서 레이아웃 클래스 순서를 정리했다. 추가·삭제 없이 **집합이 같은지** 대조한다. 빠뜨리면 패널 위치나 크기가 틀어져 눈에 띈다 |
| Fragment/괄호 짝 깨짐 | 중 | 2단계에서 `{isOpen && (...)}` 래퍼를 제거한다. 4단계가 이 확인이고, `tsc`가 잡는다 |
| `ease-enter`/`ease-exit` 토큰 부재 | 중 | 계획 001이 선행돼야 한다. 없으면 무효 클래스가 되어 Tailwind 기본 커브로 **조용히** 떨어진다. 동작은 하지만 방향별 이징이 사라진다. 001 완료를 먼저 확인한다 |
| 닫힌 오버레이가 스크린리더에 노출 | 낮음 | 이전에도 열렸을 때는 노출됐다. 닫힌 동안 빈 `div`가 하나 늘지만 텍스트가 없어 읽히지 않는다. 근본 해결은 P0 #7 |
| 250ms가 300ms보다 급해 보임 | 낮음 | `DESIGN.md` §8이 규정한 값이다. 느리게 느껴지면 문서 개정이 먼저다 |
| 닫힌 패널이 탭 순서에 남음 | 없음(기존) | 이 계획으로 나빠지지 않는다. P0 #7 담당 |

**롤백**: 파일 하나를 되돌리면 끝난다. 상태·데이터 영향 없음.

## 실행 순서

**선행: 계획 001 완료.** `duration-standard`는 이미 있지만 `ease-enter`·`ease-exit`는 001이 만든다.

1. 1단계 — `cn` import 추가. 여기서 `tsc`를 한 번 돌려 import 경로를 확인한다.
2. 3단계 — **패널을 먼저** 바꾼다. 오버레이는 그대로 두고 `npx next start`로 패널의 250ms·이징·reduced motion만 확인한다. 이 시점에는 오버레이가 여전히 튀는 게 정상이다.
3. 2단계 — 오버레이를 상시 마운트로 바꾼다. **바꾸자마자 Feel check의 "클릭 차단" 항목을 먼저 확인한다.**
4. 4단계 — 구조 확인.
5. Mechanical 4종 → Feel check 전체.

패널을 먼저 하는 이유는 위험도 순서다. 패널 변경은 되돌리기 쉽고 실패가 눈에 보이지만, 오버레이 변경은 실패하면 앱 전체가 먹통이 되므로 단독으로 격리해 확인한다.

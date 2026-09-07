# 001 — DESIGN.md §8 모션 토큰을 전부 구현한다

- **Status**: TODO
- **Commit**: 046adbb
- **Severity**: HIGH
- **Category**: Cohesion & tokens
- **Estimated scope**: 3 files, 소규모 (토큰 4줄 추가 + Tailwind 매핑 4줄 + 사용처 1곳 교체)

## Problem

`DESIGN.md` §8은 지속시간 4단계와 이징 3종을 **모션의 단일 출처**로 정의한다.

```text
# DESIGN.md:447-452 — 현재
instant   0ms    checkbox, toggle
fast    150ms    hover, focus, button press
standard 250ms   panel, tab, Bottom Sheet
slow    350ms    큰 상태 전환
```

```css
/* DESIGN.md:455-457 — 현재 */
--ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
--ease-enter: cubic-bezier(0, 0, 0.2, 1);
--ease-exit: cubic-bezier(0.4, 0, 1, 1);
```

그런데 실제로 구현된 것은 **7개 중 2개뿐**이다.

```css
/* src/app/globals.css:42-44 — 현재 */
    /* DESIGN.md §8 Motion */
    --duration-standard: 250ms;
    --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
```

```ts
// tailwind.config.ts:97-102 — 현재
      transitionDuration: {
        standard: "var(--duration-standard)",
      },
      transitionTimingFunction: {
        standard: "var(--ease-standard)",
      },
```

토큰이 없으니 컴포넌트가 스케일 밖 값을 손으로 적는다. 실제 사용 중인 코드에서 확인된 것:

```tsx
// src/app/[locale]/(public)/places/PlacesClient.tsx:250 — 현재
            "transition-[height] duration-300 ease-out motion-reduce:transition-none",
```

`300ms`는 §8 스케일(0/150/250/350) 어디에도 없다. 그리고 §8은 Bottom Sheet를 **`standard` 250ms**로 명시한다. `duration-300`은 문서화된 규칙을 벗어난 값이다.

`FilterModal.tsx:74`에도 같은 `duration-300`이 있으나 **그 파일은 계획 003이 담당한다** — 이 계획에서 건드리지 않는다.

**수정 목적**: 이후의 모든 모션 작업(003 포함)이 손으로 적은 값이 아니라 토큰을 쓸 수 있게 만든다. 이 계획 자체의 시각적 변화는 Bottom Sheet 300ms → 250ms 하나뿐이다.

## Target

```css
/* src/app/globals.css — 목표 */
    /* DESIGN.md §8 Motion */
    --duration-fast: 150ms;
    --duration-standard: 250ms;
    --duration-slow: 350ms;
    --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
    --ease-enter: cubic-bezier(0, 0, 0.2, 1);
    --ease-exit: cubic-bezier(0.4, 0, 1, 1);
```

```ts
// tailwind.config.ts — 목표
      transitionDuration: {
        fast: "var(--duration-fast)",
        standard: "var(--duration-standard)",
        slow: "var(--duration-slow)",
      },
      transitionTimingFunction: {
        standard: "var(--ease-standard)",
        enter: "var(--ease-enter)",
        exit: "var(--ease-exit)",
      },
```

```tsx
// src/app/[locale]/(public)/places/PlacesClient.tsx:250 — 목표
            "transition-[height] duration-standard ease-standard motion-reduce:transition-none",
```

> **`instant 0ms`는 토큰으로 만들지 않는다.** "전환 없음"을 뜻하므로 `transition-none`이 이미 그 역할을 한다. 값이 `0ms`인 토큰은 쓰이지 않은 채 남는다.

### 이징 값을 바꾸지 말 것

세 이징의 cubic-bezier는 **`DESIGN.md`에 적힌 값을 글자 그대로 옮긴다.** 더 강한 커브로 "개선"하지 않는다. `DESIGN.md`는 이 저장소의 유일한 디자인 기준이고, §8은 `bounce와 overshoot를 사용하지 않는다`를 함께 규정한 의도된 결정이다.

참고로 `--ease-exit: cubic-bezier(0.4, 0, 1, 1)`은 가속 커브(ease-in 계열)라 일반적인 "퇴장도 ease-out" 권고와는 다르다. **이 계획에서 판단하지 않는다.** 바꾸려면 `DESIGN.md` 개정이 선행돼야 하므로, 발견 사항으로만 남기고 값은 그대로 옮긴다.

## Files

| 파일 | 변경 |
|---|---|
| `src/app/globals.css` | 42-44행 모션 블록에 토큰 4개 추가 |
| `tailwind.config.ts` | 97-102행 매핑에 4개 추가 |
| `src/app/[locale]/(public)/places/PlacesClient.tsx` | 250행 한 줄 교체 |

## Repo conventions to follow

- **CSS 변수는 `globals.css`의 `:root` 안, 주석으로 구분된 블록에 모은다.** 각 블록 머리에 근거 절을 적는다 — `globals.css:42`의 `/* DESIGN.md §8 Motion */`, `globals.css:46`의 `/* DESIGN.md §4 Z-index */`가 그 형식이다. 새 토큰은 기존 `§8 Motion` 블록 **안에** 넣는다. 새 블록을 만들지 않는다.
- **Tailwind는 CSS 변수를 그대로 참조한다.** 값을 두 번 적지 않는다. `tailwind.config.ts:98`의 `standard: "var(--duration-standard)"`가 따라야 할 예시다.
- **정본 예시(exemplar)**: `src/app/[locale]/(public)/places/PlacesClient.tsx:538`이 이미 올바른 형태다.
  ```tsx
  "xl:transition-[width] xl:duration-standard xl:ease-standard motion-reduce:xl:transition-none",
  ```
  토큰 유틸리티 + `motion-reduce` 게이트가 한 줄에 함께 있다. 250행을 이 모양으로 맞춘다.
- 조건부 className은 `cn()`을 쓴다(`src/CLAUDE.md` §7). 이 계획에서는 조건부 분기를 추가하지 않으므로 해당 없음.

## Reduced motion 처리

이 계획은 **reduced motion 동작을 바꾸지 않는다.**

`PlacesClient.tsx:250`에는 이미 `motion-reduce:transition-none`이 있고 그대로 유지한다. `DESIGN.md:462`의 `prefers-reduced-motion: reduce에서는 이동 애니메이션을 제거한다`를 이미 충족한다.

토큰 추가만으로는 `prefers-reduced-motion` 동작이 생기지 않는다. **`globals.css`에 전역 `@media (prefers-reduced-motion: reduce)` 블록을 만들지 않는다** — 전역으로 모든 전환을 죽이면 이해를 돕는 opacity·색상 피드백까지 사라진다. 게이트는 지금처럼 사용처마다 `motion-reduce:` 유틸리티로 건다.

## Steps

1. **`src/app/globals.css` 42-44행을 연다.** 현재:
   ```css
       /* DESIGN.md §8 Motion */
       --duration-standard: 250ms;
       --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
   ```
   다음으로 교체한다(들여쓰기는 4칸, 주변과 동일):
   ```css
       /* DESIGN.md §8 Motion */
       --duration-fast: 150ms;
       --duration-standard: 250ms;
       --duration-slow: 350ms;
       --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
       --ease-enter: cubic-bezier(0, 0, 0.2, 1);
       --ease-exit: cubic-bezier(0.4, 0, 1, 1);
   ```
   `instant`에 해당하는 토큰은 추가하지 않는다.

2. **`tailwind.config.ts` 97-102행을 연다.** 현재:
   ```ts
         transitionDuration: {
           standard: "var(--duration-standard)",
         },
         transitionTimingFunction: {
           standard: "var(--ease-standard)",
         },
   ```
   다음으로 교체한다:
   ```ts
         transitionDuration: {
           fast: "var(--duration-fast)",
           standard: "var(--duration-standard)",
           slow: "var(--duration-slow)",
         },
         transitionTimingFunction: {
           standard: "var(--ease-standard)",
           enter: "var(--ease-enter)",
           exit: "var(--ease-exit)",
         },
   ```
   `transitionDuration`/`transitionTimingFunction`은 `theme.extend` 아래에 있어야 한다. `theme` 최상위로 옮기지 않는다 — Tailwind 기본 스케일(`duration-150` 등)이 사라진다.

3. **`src/app/[locale]/(public)/places/PlacesClient.tsx` 250행을 연다.** 현재:
   ```tsx
               "transition-[height] duration-300 ease-out motion-reduce:transition-none",
   ```
   다음으로 교체한다:
   ```tsx
               "transition-[height] duration-standard ease-standard motion-reduce:transition-none",
   ```
   `transition-[height]`와 `motion-reduce:transition-none`은 **그대로 둔다.** 애니메이션 대상 속성을 바꾸는 것은 계획 004의 조사 결과를 기다린다.

4. **잔여 확인.** 다음 명령의 결과가 `src/components/ui/` 안쪽에만 남아야 한다(그 파일들은 미사용이며 후속 작업 대상):
   ```bash
   grep -rnoE "duration-[0-9]+|ease-(out|in-out|in|linear)\b" src --include=*.tsx --include=*.ts
   ```
   기대 결과: `src/components/places/FilterModal.tsx:74:duration-300`(계획 003이 처리) + `src/components/ui/dialog.tsx`·`dropdown-menu.tsx`·`sheet.tsx`의 항목들. **그 외에 새로 나오면 STOP하고 보고한다.**

## Boundaries

- `src/components/places/FilterModal.tsx`를 건드리지 않는다 — 계획 003 담당.
- `src/components/ui/` 아래 파일을 건드리지 않는다 — 계획 002(button/badge)와 후속 작업 담당.
- `PlacesClient.tsx:250`의 `transition-[height]`를 다른 속성으로 바꾸지 않는다 — 계획 004 담당.
- `PlacesClient.tsx:538`을 건드리지 않는다. 이미 토큰을 쓰고 있고 `DESIGN.md:253`이 규정한 그대로다.
- `DESIGN.md`를 수정하지 않는다. 이 계획은 문서를 코드에 반영하는 것이지 그 반대가 아니다.
- 새 의존성을 추가하지 않는다.
- 마크업·구조를 바꾸지 않는다. 모션 속성만 다룬다.
- 단계에 적힌 코드가 실제 파일과 다르면(커밋 `046adbb` 이후 드리프트) 임의로 맞추지 말고 **STOP하고 보고한다.**

## Verification

**Mechanical** — 전부 통과해야 한다.

```bash
npx tsc --noEmit          # 출력 없음
npx next lint             # "✔ No ESLint warnings or errors"
npx vitest run            # 26 files / 478 tests passed
npx next build            # "✓ Compiled successfully"
```

토큰이 실제로 생성됐는지 확인한다. 개발 서버를 띄우고 브라우저 콘솔에서:

```js
const s = getComputedStyle(document.documentElement);
["--duration-fast","--duration-standard","--duration-slow",
 "--ease-standard","--ease-enter","--ease-exit"].map(k => [k, s.getPropertyValue(k).trim()]);
```
6개 모두 빈 문자열이 아니어야 한다. 빈 값이면 Tailwind 유틸리티가 조용히 무효가 된다.

**Feel check** — `/ko/places`를 **모바일 폭**(DevTools 디바이스 모드, 예: iPhone 12)에서 연다.

- 목록 카드를 눌러 Bottom Sheet가 `peek`(h-24) → `selected`(h-72)로 커지는 동작을 본다. 250ms로 살짝 빨라졌을 뿐, **끊기거나 두 단계로 나뉘어 보이면 안 된다.**
- DevTools **Animations 패널**에서 재생 속도를 10%로 낮추고 같은 동작을 본다. 높이 변화가 **한 번에 부드럽게** 이어져야 한다. 중간에 멈췄다 다시 가면 계획 004의 대상이므로 그 관찰을 기록해 둔다.
- 시트가 커지는 도중에 다른 카드를 눌러 **중단**시킨다. 처음부터 다시 시작하지 않고 현재 높이에서 새 높이로 이어져야 한다(CSS transition의 retarget 동작).
- DevTools **Rendering 패널 → Emulate CSS media feature prefers-reduced-motion: reduce**를 켜고 다시 카드를 누른다. 시트가 **즉시** 새 높이로 바뀌어야 한다(전환 없음). 색상·opacity 피드백은 그대로 남아야 한다.

**Done when**

- `globals.css`에 모션 토큰 6개가 있고 브라우저에서 6개 모두 값이 읽힌다.
- `tailwind.config.ts`가 duration 3개·easing 3개를 매핑한다.
- 4단계 grep 결과가 `FilterModal.tsx:74` + `src/components/ui/` 로만 남는다.
- Mechanical 4종 통과.
- reduced motion에서 시트 높이 전환이 사라진다.

## Impact and regression risk

**영향 범위**: 시각적으로 바뀌는 것은 **모바일 Bottom Sheet 높이 전환 300ms → 250ms 한 곳뿐**이다. 나머지는 미사용 토큰 추가라 렌더 결과가 같다.

| 위험 | 수준 | 근거 / 완화 |
|---|---|---|
| Tailwind 기본 duration 스케일 소실 | 중 | `theme.extend`가 아니라 `theme`에 넣으면 `duration-150` 등이 전부 사라진다. 2단계에 명시했고, `src/components/ui/`가 `duration-100`/`duration-200`을 쓰고 있어 빌드가 아니라 **런타임에 조용히** 깨진다. 4단계 grep과 build로 잡는다 |
| `ease-standard`가 기본값과 달라 보임 | 없음 | Tailwind v3 기본 `transitionTimingFunction.DEFAULT`가 `cubic-bezier(0.4, 0, 0.2, 1)`로 `--ease-standard`와 **동일**하다. 250행에서 `ease-out` → `ease-standard`는 커브가 바뀌지만, 둘 다 UI 표준 범위라 체감 차이는 작다 |
| 시트가 50ms 빨라져 급해 보임 | 낮음 | `DESIGN.md` §8이 Bottom Sheet를 `standard`로 규정한 값이다. 느리게 느껴지면 문서 개정이 먼저다 |
| 토큰 이름 충돌 | 없음 | `--duration-fast`·`--duration-slow`·`--ease-enter`·`--ease-exit`는 저장소에 존재하지 않는다(`grep -rn "duration-fast\|duration-slow\|ease-enter\|ease-exit" src tailwind.config.ts` → 0건) |

**롤백**: 3개 파일 각각 원래 블록으로 되돌리면 끝난다. 데이터·스키마 영향 없음.

## 실행 순서

1단계 → 2단계 → 3단계 → 4단계. 1·2단계를 마치기 전에 3단계를 하면 `duration-standard`만 유효하고 다른 토큰이 무효라 검증이 어긋난다.

**이 계획은 002·003보다 먼저 완료돼야 한다.** 두 계획 모두 여기서 만든 `duration-fast`/`ease-standard`를 쓴다.

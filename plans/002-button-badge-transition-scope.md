# 002 — button·badge의 `transition-all`을 필요한 속성으로 좁힌다

- **Status**: TODO
- **Commit**: 046adbb
- **Severity**: MEDIUM
- **Category**: Performance / Accessibility
- **Estimated scope**: 2 files, 각 1줄
- **Depends on**: [001](001-motion-tokens.md) (`duration-fast` 토큰 필요)

## Problem

두 디자인 시스템 프리미티브가 `transition-all`을 쓴다. shadcn 기본값이 그대로 들어온 것이다.

```tsx
// src/components/ui/button.tsx:8 — 현재 (한 줄, 발췌)
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 ...",
```

```tsx
// src/components/ui/badge.tsx:8 — 현재 (한 줄, 발췌)
const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 ...",
```

`transition-all`은 애니메이션할 의도가 없던 속성까지 전부 전환한다. 이 두 컴포넌트에서 구체적으로 문제가 되는 것은 **포커스 링**이다.

- 포커스 표시는 "지금 어디에 있는지"를 알려주는 신호다. `transition-all` + Tailwind 기본 지속시간 150ms 때문에 **키보드 포커스 표시가 150ms에 걸쳐 서서히 나타난다.** 탭을 빠르게 눌러 이동하면 표시가 따라오지 못하고 뒤처진다.
- **2026-09-07 실측 정정**: 계획 작성 시점에는 그 표시가 `focus-visible:ring-*`(box-shadow)라고 봤으나, `ring-3`는 Tailwind v4 문법이라 v3.4.19인 이 프로젝트에서 **CSS가 생성되지 않는다.** 실제 표시는 `focus-visible:border-ring`(`border-color`)이다. 자세한 내용은 아래 Target 절의 주석 참조.

`Button`은 10개 파일에서 쓰인다 — `global-error.tsx`, `[locale]/error.tsx`, `[locale]/not-found.tsx`, `(admin)/admin/error.tsx`, `(admin)/admin/places/page.tsx`, `(public)/forbidden/page.tsx`, `(public)/login/page.tsx`, `home/CategoryPlaceTabs.tsx`, `places/KoreanInquiryBox.tsx`, `places/PlacePreviewCard.tsx`. `Badge`는 2개 파일(`admin/places/page.tsx`, `places/[id]/page.tsx`)에서 쓰인다.

**수정 목적**: 전환 대상을 실제로 변하는 속성으로만 좁혀서 포커스 링을 즉시 그린다. 부수적으로 GPU 밖 속성의 불필요한 전환도 사라진다.

## Target

두 컴포넌트가 실제로 바꾸는 속성은 다르므로 대상 목록도 다르다.

**button** — variant/state가 `background-color`·`color`·`border-color`를 바꾸고, `disabled:opacity-50`이 `opacity`를, `active:not-aria-[haspopup]:translate-y-px`가 `transform`을, `link` variant가 `text-decoration-color`를 바꾼다.

```tsx
// src/components/ui/button.tsx:8 — 목표 (해당 토큰만 교체)
transition-[color,background-color,text-decoration-color,opacity,transform] duration-fast ease-standard
```

> **2026-09-07 실행 중 수정 — `border-color`를 목록에서 뺐다.**
>
> 계획 작성 시점에는 포커스 링이 `focus-visible:ring-3`(box-shadow)로 그려진다고 보고
> `box-shadow`만 제외하면 된다고 판단했다. 실제로는 **`ring-3`가 Tailwind v4 문법이라
> v3.4.19인 이 프로젝트에서 CSS가 생성되지 않는다.** 빌드 CSS에 `.focus-visible\:ring-3`
> 규칙이 없고, 브라우저에서 `:focus-visible`이 걸린 Button의 `boxShadow`가 `none`이다.
>
> Button의 포커스를 실제로 표시하는 것은 **`focus-visible:border-ring`
> (`border-color:var(--ring)`)** 이다. 따라서 `border-color`를 전환 목록에 두면
> 포커스 표시가 그대로 150ms 지연된다 — 이 계획이 없애려던 바로 그 증상이다.
>
> Button에서 `border-color`가 바뀌는 경우는 세 가지뿐이고 **전부 즉시 보여야 하는
> 상태 표시**다: `focus-visible:border-ring`(포커스), `aria-invalid:border-destructive`(오류),
> `dark:border-input`(테마). hover로 테두리 색이 바뀌는 variant는 없다.
> 따라서 목록에서 빼도 잃는 것이 없다.

**badge** — 누를 수 없으므로 `transform`이 없다. Tailwind 기본 `transition-colors`가 정확히 필요한 집합(`color, background-color, border-color, text-decoration-color, fill, stroke`)이다.

```tsx
// src/components/ui/badge.tsx:8 — 목표 (해당 토큰만 교체)
transition-colors duration-fast ease-standard
```

두 경우 모두 `box-shadow`가 목록에서 빠지므로 **포커스 링은 전환 없이 즉시 그려진다.**

### 지속시간·이징을 명시하는 이유

Tailwind v3 기본값은 이미 `150ms` / `cubic-bezier(0.4, 0, 0.2, 1)`이고, 이는 `DESIGN.md` §8의 `fast 150ms`, `--ease-standard`와 **값이 같다.** 따라서 `duration-fast ease-standard`를 붙여도 **시각적 변화는 없다.** 암묵적으로 일치하던 값을 토큰으로 고정해 두는 것이 목적이다.

## Files

| 파일 | 변경 |
|---|---|
| `src/components/ui/button.tsx` | 8행 `cva()` 기본 문자열에서 `transition-all` → 속성 목록 + 토큰 |
| `src/components/ui/badge.tsx` | 8행 `cva()` 기본 문자열에서 `transition-all` → `transition-colors` + 토큰 |

## Repo conventions to follow

- **`components/ui/`는 shadcn 스타일 프리미티브다.** `cva()` 첫 인자의 기본 문자열에 공통 클래스를 두고, variant는 두 번째 인자의 `variants` 객체에 둔다. **이 구조를 바꾸지 않는다** — 문자열 안의 토큰 하나만 교체한다.
- **필요한 속성만 나열하는 전환이 이미 저장소에 있다.** 정본 예시:
  ```tsx
  // src/app/[locale]/(public)/places/PlacesClient.tsx:250
  "transition-[height] duration-standard ease-standard motion-reduce:transition-none",
  ```
  대괄호 안 속성 목록 + duration 토큰 + easing 토큰 순서를 그대로 따른다.
- **색상만 바뀌는 곳은 `transition-colors`를 쓴다.** 저장소 전반의 관행이다 — `PlaceCard.tsx:59`, `FilterModal.tsx:23`, `Header.tsx:11`, `CategoryPlaceCard.tsx:89` 모두 이 형태다. badge가 여기에 해당한다.
- 임의 픽셀·색상 값을 넣지 않는다(`src/CLAUDE.md` §2.5). 이 계획은 토큰만 다룬다.

## Reduced motion 처리

**두 파일에 `motion-reduce:` 게이트를 추가하지 않는다.**

`DESIGN.md:462`는 `prefers-reduced-motion: reduce에서는 **이동** 애니메이션을 제거한다`로, 대상이 이동(movement)이다. 여기서 전환되는 것은 색상·투명도이며, `button`의 `translate-y-px` 1픽셀은 이동이라 부를 규모가 아니다. 색상 피드백까지 없애면 "눌렸는지" 알 수 없어져 오히려 접근성이 나빠진다.

이 계획이 개선하는 접근성은 별개 축이다 — **포커스 링을 지연 없이 그리는 것**. 이건 `prefers-reduced-motion` 설정과 무관하게 항상 적용된다.

## Steps

1. **`src/components/ui/button.tsx` 8행을 연다.** 그 줄에서 정확히 이 부분을 찾는다:
   ```
   whitespace-nowrap transition-all outline-none select-none
   ```
   다음으로 교체한다:
   ```
   whitespace-nowrap transition-[color,background-color,text-decoration-color,opacity,transform] duration-fast ease-standard outline-none select-none
   ```
   **속성 목록 안에 공백을 넣지 않는다.** `transition-[color, background-color]`처럼 쓰면 Tailwind가 클래스를 인식하지 못한다. 쉼표 뒤 공백 없이 붙여 쓴다.

   그 줄의 나머지(`focus-visible:*`, `active:*`, `disabled:*`, `aria-invalid:*`, `[&_svg]:*`)는 **한 글자도 바꾸지 않는다.**

2. **`src/components/ui/badge.tsx` 8행을 연다.** 그 줄에서 정확히 이 부분을 찾는다:
   ```
   whitespace-nowrap transition-all focus-visible:border-ring
   ```
   다음으로 교체한다:
   ```
   whitespace-nowrap transition-colors duration-fast ease-standard focus-visible:border-ring
   ```
   그 줄의 나머지는 바꾸지 않는다.

3. **잔여 확인.**
   ```bash
   grep -rn "transition-all" src
   ```
   기대 결과: **0건.**

## Boundaries

- `cva()`의 `variants` 객체를 건드리지 않는다. `default`/`outline`/`ghost` 등의 색상 클래스는 그대로 둔다.
- `button.tsx`의 `size` variant를 건드리지 않는다.
- `active:not-aria-[haspopup]:translate-y-px`를 `scale(0.97)` 같은 다른 누름 피드백으로 바꾸지 않는다. 누름 피드백 자체의 재설계는 이 계획의 범위가 아니다.
- **`focus-visible:ring-3`를 고치지 않는다.** 이것이 v4 문법이라 v3에서 무효이고, 그 결과 Button에 링이 아예 그려지지 않는다는 사실이 2026-09-07 실행 중 확인됐다. 고치면(`ring-[3px]`) **화면 모양이 바뀌므로** 모션 계획의 범위를 넘는다. 발견 사항으로만 보고하고 별도 작업으로 남긴다. badge의 `focus-visible:ring-[3px]`도 마찬가지로 건드리지 않는다.
- 손으로 만든 버튼들(`PlacesClient.tsx`의 칩, `FilterModal.tsx`의 칩, `HeroActions.tsx`, `DogsManager.tsx` 등)을 `Button` 컴포넌트로 바꾸지 않는다.
- `src/components/ui/` 아래 다른 파일(`dialog.tsx`, `sheet.tsx`, `dropdown-menu.tsx`)을 건드리지 않는다 — 후속 작업 대상.
- 새 의존성을 추가하지 않는다.
- 단계에 적힌 문자열이 실제 파일과 다르면 임의로 맞추지 말고 **STOP하고 보고한다.**

## Verification

**Mechanical** — 전부 통과해야 한다.

```bash
npx tsc --noEmit          # 출력 없음
npx next lint             # "✔ No ESLint warnings or errors"
npx vitest run            # 26 files / 478 tests passed
npx next build            # "✓ Compiled successfully"
grep -rn "transition-all" src   # 0건
```

Tailwind가 대괄호 목록을 실제 CSS로 만들었는지 확인한다. `next build` 후:

```bash
grep -rho "transition-property:[^;]*" .next/static/css/*.css | sort -u
```
`color,background-color,text-decoration-color,opacity,transform` 조합이 보여야 한다. 없으면 클래스가 무효인 것이다(대개 목록 안 공백 때문).

**목록에 `box-shadow`와 `border-color`가 없어야 한다.** 둘 중 하나라도 있으면 포커스 표시가 다시 지연된다. 브라우저에서 확인:
```js
const el = document.querySelector('[data-slot="button"]');
getComputedStyle(el).transitionProperty.split(",").map(s => s.trim())
  .filter(p => p === "box-shadow" || p === "border-color" || p === "all");   // [] 여야 한다
```

**Feel check** — `npx next start -p 3100` 후 확인한다.

- **포커스 표시(핵심)**: `/ko/forbidden`에서 `Tab`을 눌러 `홈으로 돌아가기` 버튼에 포커스를 준다. 테두리 색이 **즉시** 바뀌어야 한다. Tab을 빠르게 왕복하며 눌렀을 때 표시가 뒤처지면 실패다.
  - `/ko/login`은 이미 로그인한 세션에서 `/ko`로 리다이렉트되므로 `Button`이 렌더되지 않는다. `/ko/forbidden`을 쓴다.
  - 비교: 수정 전에는 같은 조작에서 테두리 색이 서서히 차오른다. 차이가 안 보이면 DevTools **Animations 패널 재생 속도 10%**로 낮춰 다시 본다.
- **hover**: 같은 버튼에 마우스를 올린다. 배경색은 **여전히 부드럽게** 바뀌어야 한다. 즉시 딱 바뀌면 `transition-colors` 계열 속성이 목록에서 빠진 것이다.
- **press**: 버튼을 누른 채로 있는다. 1px 내려가는 피드백이 남아 있어야 한다(`transform`이 목록에 있는지 확인).
- **disabled**: `/ko/places` 데스크톱에서 위치 권한 없이 정렬 드롭다운을 연다. 비활성 `거리순` 항목의 흐림(`opacity`)이 전환된다.
- **badge**: `/ko/admin/places`(관리자 로그인 필요)에서 공개 상태 배지를 본다. 정적 표시라 변화가 없어야 정상이다. `/ko/places/{id}` 상세의 `재확인 필요` 배지도 같다.
- DevTools **Rendering 패널 → prefers-reduced-motion: reduce**를 켜고 hover를 다시 해 본다. 색상 전환은 **그대로 남아야 한다**(의도된 동작 — 위 "Reduced motion 처리" 참조).

**Done when**

- `grep -rn "transition-all" src` → 0건.
- 빌드 CSS에 좁혀진 `transition-property` 목록이 존재한다.
- 키보드 포커스 링이 지연 없이 나타난다.
- hover 색상 전환과 press 1px 피드백이 그대로 남아 있다.
- Mechanical 5종 통과.

## Impact and regression risk

**영향 범위**: `Button` 사용처 10개 파일, `Badge` 사용처 2개 파일. 다만 바뀌는 것은 **전환 대상 속성 집합**뿐이라 레이아웃·색상·크기는 그대로다.

| 위험 | 수준 | 근거 / 완화 |
|---|---|---|
| 대괄호 목록에 공백이 들어가 클래스가 무효화 | **중** | 가장 흔한 실패다. 무효 클래스는 빌드를 깨지 않고 **조용히** 전환을 없앤다. 1단계에 명시했고, Verification의 빌드 CSS grep이 이를 잡는다 |
| 전환돼야 할 속성을 목록에서 빠뜨림 | 중 | button은 6개 속성 전부 필요하다. 하나라도 빠지면 그 상태만 딱딱 바뀐다. Feel check의 hover/press/disabled 3종이 각각 다른 속성을 검사한다 |
| `duration-fast` 토큰 부재 | 중 | 계획 001이 선행돼야 한다. 없으면 `duration-fast`가 무효 클래스가 되고 Tailwind 기본 150ms로 **떨어져도 값이 같아** 눈으로는 정상으로 보인다. 001 완료 여부를 먼저 확인한다 |
| `[a]:hover:bg-primary/80` 같은 variant hover가 안 먹음 | 낮음 | `background-color`가 목록에 있으므로 그대로 동작한다 |
| badge의 `fill`/`stroke` 전환 | 없음 | `transition-colors`에 포함된다. badge 안 SVG는 색상만 바뀐다 |
| 다크 모드 관련 클래스 영향 | 없음 | `dark:aria-invalid:*`는 색상 클래스이며 `transition-colors` 집합에 포함된다. 프로젝트는 현재 라이트 모드 단일(`DESIGN.md` §4)이라 실사용 경로도 아니다 |

**롤백**: 두 파일에서 교체한 토큰을 `transition-all`로 되돌리면 끝난다.

## 실행 순서

**선행: 계획 001 완료.** `duration-fast`·`ease-standard`가 없으면 검증이 무의미하다.

1단계(button) → 3단계 grep으로 button만 확인 → 2단계(badge) → 3단계 grep 재확인 → Mechanical → Feel check.

button과 badge를 한꺼번에 고치고 한 번만 확인해도 되지만, 실패 지점(대괄호 목록)이 button 쪽에만 있으므로 button을 먼저 끝내고 빌드 CSS를 확인한 뒤 badge로 넘어가는 편이 원인 추적이 쉽다.

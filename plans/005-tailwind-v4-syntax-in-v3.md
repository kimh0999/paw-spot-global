# 005 — v3에서 무효한 v4 문법 클래스를 되살린다 (button·badge)

- **Status**: TODO
- **Commit**: a917741
- **Severity**: HIGH (접근성) + MEDIUM (시각)
- **Category**: Correctness / Accessibility
- **Estimated scope**: 2 files, 각 1줄 (`cva` 기본 문자열)
- **출처**: 계획 002 실행 중 발견. 모션 감사 항목이 아니라 **별도 결함**이다.

## Problem

`components/ui/`의 shadcn 프리미티브가 **Tailwind v4 문법**으로 작성돼 있는데, 이 프로젝트는
**v3.4.19**다(`node_modules/tailwindcss/package.json`). v4 전용 문법은 v3에서 **CSS가 아예
생성되지 않는다.** 빌드가 깨지지 않고 클래스만 조용히 사라진다.

```tsx
// src/components/ui/button.tsx:8 — 현재 (발췌)
"... focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 ..."
```

```tsx
// src/components/ui/badge.tsx:8 — 현재 (발췌)
"... overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 ... focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!"
```

### 실측 근거

빌드 CSS(`.next/static/css/*.css`)에서 ring-width를 세팅하는 규칙의 셀렉터를 전부 뽑으면:

```
1px   <- .ring-1
2px   <- .focus\:ring-2:focus
2px   <- .focus-visible\:ring-2:focus-visible
3px   <- .focus-visible\:ring-\[3px\]:focus-visible
2px   <- .\[\&\:has\(\:focus-visible\)\]\:ring-2:has(:focus-visible)
```

`ring-3`은 없다. 문자열 검색으로도 `ring-3`·`not-aria`·`translate-y-px`·`rounded-4xl`이
빌드 CSS에 **한 번도 나오지 않는다.**

| # | 클래스 | 파일 | v3에서 | 실제 결과 |
|---|---|---|---|---|
| 1 | `focus-visible:ring-3` | button | 무효 (v3 스케일은 `0/1/2/4/8`, bare `ring`=3px) | **Button에 포커스 링이 그려지지 않는다.** 포커스 표시는 `focus-visible:border-ring`(테두리 색)뿐 |
| 2 | `active:not-aria-[haspopup]:translate-y-px` | button | 무효 (`not-*`는 v4 variant) | **Button에 누름 피드백이 없다.** `translate-y-px` 규칙 자체가 CSS에 없다 |
| 3 | `rounded-4xl` | badge | 무효 (v3 최대 `rounded-3xl`) | **배지가 사각형으로 렌더된다.** 상세 페이지에서 계산된 `border-radius`가 `0px`로 확인됨 |
| 4 | `focus-visible:ring-ring/50` | button, badge | 무효 | 투명도 없는 `ring-ring`만 생성. `--ring`이 `var()` 원시 문자열이라 v3가 알파를 합성하지 못한다 |
| 5 | `aria-invalid:*` (button 4개 · badge 3개) | 둘 다 | 무효 (v3 기본 `aria-*` 목록에 `invalid` 없음) | 오류 상태 스타일 없음. **다만 이 앱에서 Button·Badge에 `aria-invalid`를 거는 곳은 0건** |
| 6 | `has-data-[icon=inline-*]` | badge | 무효 (v4 `has-*` 축약) | 아이콘 여백 조정 없음. **`data-icon`을 세팅하는 곳 0건** |
| 7 | `[&>svg]:size-3!` | badge | 무효 (`!` 접미사는 v4) | 배지 안 SVG 크기 미지정 |

**왜 중요한가**

`DESIGN.md` §11은 `모든 interaction에 keyboard focus와 focus-visible을 제공한다`고 규정한다.
`Button`은 오류 화면·404·권한 없음·로그인·관리자 목록 등 **10개 파일**에서 쓰이는데,
키보드 사용자에게 보이는 것은 테두리 색 변화 하나뿐이다.

`DESIGN.md` §4는 `Chip 999px`와 `pill은 필터 칩, **상태 배지**, 카테고리 탭에 주로 사용한다`고
적는다. 지금 배지는 사각형이라 이 규정과 어긋난다.

**수정 목적**: 의도된 스타일이 실제로 적용되게 만든다. 새 디자인을 도입하는 것이 아니라
**이미 문서와 코드에 있는 의도를 v3 문법으로 옮기는 것**이다.

## Target

### Tier A — 접근성 (필수)

```tsx
// src/components/ui/button.tsx:8 — 목표 (해당 토큰만 교체)
focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring
active:translate-y-px
```

| 바뀌는 것 | 이유 |
|---|---|
| `focus-visible:ring-3` → `focus-visible:ring-2` | v3에 `ring-3`이 없다. 폭 2px는 **이 앱이 이미 24곳에서 쓰는 값**이라 새 값을 만들지 않는다 |
| `focus-visible:ring-ring/50` → `focus-visible:ring-ring` | `/50`은 `--ring`이 원시 `var()`라 v3에서 합성되지 않는다. 앱의 24곳도 전부 투명도 없이 쓴다 |
| `active:not-aria-[haspopup]:translate-y-px` → `active:translate-y-px` | `not-*`는 v4 문법이다. 제외 조건(`aria-haspopup` 트리거는 눌러도 안 밀림)은 **이 앱에서 `aria-haspopup`을 쓰는 곳이 0건**이라 지금은 의미가 없다 |

`focus-visible:border-ring`은 **그대로 둔다.** 이미 유효하게 동작 중이고, 테두리 + 링을 함께
쓰는 것이 shadcn의 원래 설계다.

### Tier B — 시각 (필수)

```tsx
// src/components/ui/badge.tsx:8 — 목표 (해당 토큰만 교체)
rounded-full
focus-visible:ring-2 focus-visible:ring-ring
[&>svg]:!size-3
```

| 바뀌는 것 | 이유 |
|---|---|
| `rounded-4xl` → `rounded-full` | v3에 `rounded-4xl`이 없다. `DESIGN.md` §4가 상태 배지를 `Chip 999px`(pill)로 규정하므로 `rounded-full`이 문서에 맞는 값이다 |
| `focus-visible:ring-[3px]` → `focus-visible:ring-2` | `ring-[3px]`는 v3에서 **유효하게 동작한다.** 그래도 앱 표준 2px로 맞춘다. Badge는 이 앱에서 `<span>`으로만 쓰여 포커스를 받지 않으므로 **시각적으로 no-op**이다 |
| `focus-visible:ring-ring/50` → `focus-visible:ring-ring` | button과 같은 이유 |
| `[&>svg]:size-3!` → `[&>svg]:!size-3` | v3는 `!`를 접두사로 쓴다 |

### Tier C — 죽은 코드 (삭제)

이 앱에서 **한 번도 활성화되지 않는** 클래스다. v3 문법으로 옮겨도 실행되지 않으므로 지운다.

| 삭제 대상 | 파일 | 근거 |
|---|---|---|
| `aria-invalid:border-destructive`<br>`aria-invalid:ring-3`<br>`aria-invalid:ring-destructive/20`<br>`dark:aria-invalid:border-destructive/50`<br>`dark:aria-invalid:ring-destructive/40` | button | `grep -rn "aria-invalid=" src --include=*.tsx`의 19건이 전부 **폼의 raw `<input>`/`<select>`**이고 `Button`에 거는 곳은 0건 |
| `aria-invalid:border-destructive`<br>`aria-invalid:ring-destructive/20`<br>`dark:aria-invalid:ring-destructive/40` | badge | Badge에 `aria-invalid`를 거는 곳 0건 |
| `has-data-[icon=inline-end]:pr-1.5`<br>`has-data-[icon=inline-start]:pl-1.5` | badge | `data-icon`을 세팅하는 곳 0건 |

`dark:*`는 추가로 `DESIGN.md` §12 `다크 모드 스타일을 임의로 추가하지 않는다`에도 걸린다.

> **삭제를 택한 이유**: v3 문법으로 옮기면(`aria-[invalid=true]:*`, `has-[[data-icon=inline-end]]:*`)
> 동작하지 않는 코드를 동작하지 않는 채로 더 읽기 어렵게 만든다. 나중에 필요해지면 그때
> 추가하는 편이 낫다(`src/CLAUDE.md` §2 — 추측성 코드 금지).

## Files

| 파일 | 변경 |
|---|---|
| `src/components/ui/button.tsx` | 8행 `cva` 기본 문자열 — Tier A 교체 + Tier C 삭제 |
| `src/components/ui/badge.tsx` | 8행 `cva` 기본 문자열 — Tier B 교체 + Tier C 삭제 |

## Repo conventions to follow

- **포커스 링의 정본은 앱 코드다.** `focus-visible:ring-2 focus-visible:ring-ring`이 24곳에서
  쓰인다. 정본 예시:
  ```tsx
  // src/app/[locale]/(public)/places/PlacesClient.tsx:274
  "... outline-none transition-colors hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring"
  ```
  일부는 `focus-visible:ring-offset-2`를 덧붙인다(`PlaceCard.tsx`의 오버레이 버튼).
  **Button에는 offset을 넣지 않는다** — 정본 다수가 offset 없이 쓴다.
- **`cva()` 구조를 바꾸지 않는다.** 첫 인자의 기본 문자열 안에서 토큰만 교체·삭제한다.
  `variants` 객체는 건드리지 않는다.
- **radius는 `DESIGN.md` §4 스케일만 쓴다.** `Chip 999px` → `rounded-full`.
  `rounded-[2rem]` 같은 임의값을 넣지 않는다(`src/CLAUDE.md` §2.5).
- **`--ring`은 이미 있는 토큰이다.** `globals.css:78`의 `--ring: var(--color-focus)`
  (= `#2563eb`). 새 색을 만들지 않는다.

## Reduced motion 처리

**게이트를 추가하지 않는다.**

이 계획은 `active:translate-y-px`를 되살린다. 1px 이동이라 `DESIGN.md`:462가 제거하라고 한
`이동 애니메이션`의 규모가 아니고, 누름 피드백을 없애면 "눌렸는지"를 알 수 없어져 오히려
접근성이 나빠진다. 계획 002가 같은 판단을 기록해 두었다.

전환 속성 목록은 계획 002가 정한 그대로 유지한다:
`transition-[color,background-color,text-decoration-color,opacity,transform]`.
**`box-shadow`와 `border-color`를 다시 넣지 않는다** — 넣으면 이번에 살린 포커스 링이
150ms 지연되어 나타나 계획 002를 되돌리는 셈이 된다. 링은 `box-shadow`로 그려지므로
이 점이 특히 중요하다.

## Steps

1. **`src/components/ui/button.tsx` 8행을 연다.** 그 줄에서 다음 구간을 찾는다:
   ```
   focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40
   ```
   다음으로 교체한다:
   ```
   focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px disabled:pointer-events-none disabled:opacity-50
   ```
   그 줄의 나머지(`group/button` … `transition-[...]` … `[&_svg]:*`)는 **한 글자도 바꾸지 않는다.**

2. **`src/components/ui/badge.tsx` 8행을 연다.** 먼저 `rounded-4xl`을 `rounded-full`로 바꾼다:
   ```
   overflow-hidden rounded-4xl border border-transparent
   ```
   →
   ```
   overflow-hidden rounded-full border border-transparent
   ```

3. **같은 줄에서** 다음 구간을 찾는다:
   ```
   focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!
   ```
   다음으로 교체한다:
   ```
   focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring [&>svg]:pointer-events-none [&>svg]:!size-3
   ```

4. **v4 문법 잔여 확인.** 두 파일에 대해:
   ```bash
   grep -nE "ring-3|not-aria|rounded-4xl|aria-invalid|has-data-|size-3!|ring-ring/" src/components/ui/button.tsx src/components/ui/badge.tsx
   ```
   기대 결과: **0건.**

## Boundaries

- **`src/components/ui/dialog.tsx`·`sheet.tsx`·`dropdown-menu.tsx`를 건드리지 않는다.**
  세 파일도 v4 문법(`data-open:`, `supports-backdrop-filter:`, `w-(--radix-…)`,
  `origin-(--radix-…)`)을 갖고 있지만 **현재 미사용**이다. 감사 #8·P0 #7과 함께 처리한다.
- `cva()`의 `variants`·`size` 객체를 건드리지 않는다.
- Tailwind를 v4로 올리지 않는다. 이 계획은 **v3에 맞추는** 작업이다.
- `tailwind.config.ts`의 색 정의(`ring: "var(--ring)"`)를 함수형으로 바꿔 `/50`을
  살리려 하지 않는다. 앱 표준이 투명도 없는 링이다.
- 손으로 만든 버튼들을 `Button` 컴포넌트로 교체하지 않는다.
- `focus-visible:ring-offset-2`를 추가하지 않는다.
- 계획 002가 정한 `transition-[…]` 목록을 바꾸지 않는다.
- 단계에 적힌 문자열이 실제 파일과 다르면 임의로 맞추지 말고 **STOP하고 보고한다.**

## Verification

**Mechanical**

```bash
npx tsc --noEmit          # 출력 없음
npx next lint             # "✔ No ESLint warnings or errors"
npx vitest run            # 26 files / 478 tests passed
npx next build            # "✓ Compiled successfully"
```

4단계 grep이 0건이어야 한다.

**빌드 CSS에서 되살아났는지 확인** — 이 계획의 핵심 검증이다.

```bash
grep -rho "\.active\\\\:translate-y-px:active{[^}]*}" .next/static/css/*.css
grep -rho "\.rounded-full{[^}]*}" .next/static/css/*.css
grep -c "ring-3\|not-aria\|rounded-4xl" .next/static/css/*.css   # 0
```
`active:translate-y-px`와 `rounded-full` 규칙이 **존재해야** 한다. 없으면 클래스가 여전히
무효인 것이다.

**Feel check** — `npx next build && npx next start -p 3100` 후.

- **포커스 링(핵심)**: `/ko/forbidden`에서 `Tab`을 눌러 `홈으로 돌아가기` 버튼에 포커스를 준다.
  이제 **파란 링(2px, `#2563eb`)이 보여야 한다.** 수정 전에는 테두리 색만 바뀌었다.
  브라우저에서 확인:
  ```js
  const b = document.querySelector('[data-slot="button"]');
  b.focus();  // 또는 Tab 으로 이동
  getComputedStyle(b).boxShadow;   // "none" 이 아니어야 한다
  ```
- **링이 지연 없이 나타나는가**: Tab을 빠르게 왕복한다. 링이 즉시 붙어야 한다.
  뒤처지면 계획 002가 되돌려진 것이다 — 전환 목록에 `box-shadow`가 들어갔는지 확인한다.
- **누름 피드백**: 같은 버튼을 마우스로 누른 채 있는다. 1px 내려가야 한다.
  ```js
  getComputedStyle(document.querySelector('[data-slot="button"]')).transform;
  // 누르는 동안 matrix(1, 0, 0, 1, 0, 1)
  ```
- **배지 모양**: `/ko/places/57e3d955-c1f2-4c1a-86ce-80c2e35866af`(화람)를 연다.
  `카페`·`재확인 필요` 배지가 **pill(양끝이 둥근 캡슐)** 이어야 한다.
  ```js
  [...document.querySelectorAll('[data-slot="badge"]')]
    .map(b => getComputedStyle(b).borderRadius);   // "0px" 이 아니어야 한다
  ```
  수정 전에는 `0px`(사각형)였다.
- **테두리 + 링이 과하지 않은가**: Button은 `border-ring`과 `ring-2`를 함께 쓴다.
  두 겹이 두껍게 보이면 **코드를 바꾸지 말고 보고한다** — `focus-visible:border-ring`을
  뺄지는 디자인 판단이라 이 계획의 범위가 아니다.
- **reduced motion**: DevTools Rendering → `prefers-reduced-motion: reduce`. 누름 피드백과
  포커스 링은 **그대로 남아야 한다**(의도된 동작 — 위 "Reduced motion 처리" 참조).

**Done when**

- 4단계 grep 0건, 빌드 CSS에 `ring-3`·`not-aria`·`rounded-4xl` 0건.
- `active:translate-y-px`·`rounded-full` 규칙이 빌드 CSS에 존재.
- Button 포커스 시 `boxShadow`가 `none`이 아니다.
- Button 누름 시 `transform`이 1px 이동.
- Badge `borderRadius`가 `0px`이 아니다.
- Mechanical 4종 통과.

## Impact and regression risk

**영향 범위**: `Button` 10개 파일, `Badge` 2개 파일. **눈에 보이는 변화가 있다** — 이 계획은
계획 001~003과 달리 화면이 달라진다.

| 위험 | 수준 | 근거 / 완화 |
|---|---|---|
| 포커스 링이 새로 나타나 시각적으로 낯설다 | **중(의도됨)** | 그게 목적이다. `DESIGN.md` §11이 요구하는 동작이고, 앱의 나머지 24곳과 같은 모양(2px `#2563eb`)이 된다 |
| 테두리 + 링 두 겹이 두꺼워 보임 | 중 | `focus-visible:border-ring`이 이미 동작 중이라 링이 더해지면 두 겹이 된다. Feel check에 판단 항목을 뒀다. **어색해도 코드를 바꾸지 말고 보고한다** — 어느 쪽을 뺄지는 디자인 결정이다 |
| 배지가 사각형에서 pill로 바뀜 | 중(의도됨) | `DESIGN.md` §4 규정대로다. 관리자 목록(공개 상태 배지)과 상세 페이지(카테고리·재확인 필요)에서 보인다 |
| 누름 피드백이 새로 생김 | 낮음 | 1px이라 미묘하다. `DESIGN.md` §8이 `fast 150ms — button press`로 press를 스케일에 넣어 두었으므로 의도에 부합한다 |
| `aria-invalid` 삭제로 폼 오류 표시가 사라짐 | **없음** | `Button`·`Badge`에 `aria-invalid`를 거는 곳이 0건이다. 폼의 19곳은 전부 raw `<input>`/`<select>`이고 자체 클래스를 쓴다 |
| `has-data-[icon]` 삭제로 아이콘 여백이 깨짐 | **없음** | `data-icon`을 세팅하는 곳이 0건이다 |
| 계획 002를 되돌림 | 중 | `border-color`나 `box-shadow`를 전환 목록에 되넣으면 이번에 살린 링이 다시 지연된다. Boundaries에 명시했고 Feel check가 검사한다 |
| shadcn 업스트림과 멀어짐 | 낮음 | 이미 v4 컴포넌트를 v3에 붙인 상태라 어차피 어긋나 있다. 이 계획은 **실제로 동작하는 방향**으로 정리한다 |

**롤백**: 두 파일의 해당 문자열을 되돌리면 끝난다. 다만 되돌리면 포커스 링·누름 피드백·
pill 배지가 다시 사라진다.

## 실행 순서

**선행: 계획 002 완료**(`36505db`). 002가 정한 전환 목록 위에서 동작한다.

1. 1단계 — button. `npx next build` 후 빌드 CSS에서 `active:translate-y-px`가 생겼는지
   먼저 확인한다. 여기서 실패하면 v3 문법이 틀린 것이므로 badge로 넘어가지 않는다.
2. 브라우저에서 Button 포커스 링·누름 피드백을 확인한다.
3. 2·3단계 — badge.
4. 4단계 grep → Mechanical 4종 → Feel check 전체.

button을 먼저 끝내고 확인하는 이유는, 이 계획의 v3 문법 변환이 맞는지를 **가장 중요한
항목(포커스 링)으로 먼저 검증**하기 위해서다. 거기서 통과하면 나머지는 같은 원리다.

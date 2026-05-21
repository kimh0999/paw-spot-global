# Frontend Rules for AI Coding Agents

이 문서는 사람이 아니라 AI 코딩 에이전트(Claude Code, Cursor, Copilot Agent 등) 가 읽고 따르기 위한 프론트엔드 작업 규칙이다.
목적은 빠르게 코드를 만드는 것이 아니라, 나중에 수정하기 쉽고 예측 가능한 프론트엔드 코드를 만드는 것이다.
모든 규칙은 가능한 한 코드만 보고 위반 여부를 판단할 수 있어야 한다.


## 0. Scope
이 문서는 다음 환경을 가정한다.

React / Vue / Next.js / Nuxt 기반 프론트엔드
TypeScript 사용
Tailwind CSS, CSS-in-JS, CSS Modules 또는 디자인 시스템 사용
컴포넌트 기반 UI 개발
AI 코딩 에이전트를 활용한 코드 생성 및 수정

| 원칙 | 의미 |
|---|---|
| Readability | 처음 보는 사람도 쉽게 읽을 수 있어야 한다. |
| Predictability | 이름, props, 반환값만 봐도 동작을 예측할 수 있어야 한다. |
| Cohesion | 같이 바뀌는 코드는 가까운 곳에 있어야 한다. |
| Coupling | 서로 관련 없는 코드끼리 강하게 의존하지 않아야 한다. |

## 1. Core Principles
프론트엔드 코드는 다음 4가지를 기준으로 작성한다.
원칙의미Readability처음 보는 사람도 쉽게 읽을 수 있어야 한다.Predictability이름, props, 반환값만 봐도 동작을 예측할 수 있어야 한다.Cohesion같이 바뀌는 코드는 가까운 곳에 있어야 한다.Coupling서로 관련 없는 코드끼리 강하게 의존하지 않아야 한다.

## 2. Golden Rules
아래 규칙을 어기면 코드를 머지하지 않는다.
### 2.1 요청 범위 밖 작업 금지
사용자가 요청하지 않은 작업을 임의로 하지 않는다.
금지 예시:

요청하지 않은 리팩터링
요청하지 않은 의존성 추가
요청하지 않은 디자인 변경
요청하지 않은 기능 추가
폴더 구조 전체 변경
기존 API 시그니처 변경

필요하다고 판단되면 먼저 사용자에게 묻는다.

### 2.2 기존 컴포넌트 재사용 우선
새 컴포넌트를 만들기 전에 반드시 기존 컴포넌트를 확인한다.
우선 확인할 위치 예시:
```txt
src/components
src/components/ui
src/components/common
src/components/layout
src/features
src/shared
```
비슷한 컴포넌트가 있으면 새로 만들지 말고 재사용하거나 확장한다.
새 컴포넌트는 다음 경우에만 만든다.

기존 컴포넌트로 요구사항을 충족할 수 없음
기존 컴포넌트를 확장하면 오히려 복잡도가 커짐
해당 기능이 독립적인 책임을 가짐


### 2.3 단일 책임
하나의 컴포넌트는 한 가지 역할만 담당한다.
분해가 필요한 신호:

props가 7개를 초과한다.
boolean props가 3개를 초과한다.
조건부 렌더링이 3단계 이상 중첩된다.
컴포넌트 파일이 200줄을 넘는다.
컴포넌트가 UI, API 호출, 데이터 가공, 폼 검증, 상태 관리를 모두 처리한다.


### 2.4 타입 우선
TypeScript 타입을 명확히 작성한다.
금지:
- `any`
- `as any`
- 비타입 props
- 암묵적인 API 응답 추측
허용:
- `unknown`
단, `unknown`은 반드시 타입 좁히기 후 사용한다.

### 2.5 하드코딩 최소화
색상, 브랜드 값, shadow, z-index, transition, breakpoint 등은 디자인 토큰을 우선 사용한다.
Tailwind 기본 spacing, radius, typography scale은 사용할 수 있다.
허용 예시:
```tsx
<div className="p-4 rounded-lg text-sm" />
```
금지 예시:
```tsx
<div className="p-[13px] text-[15px] bg-[#123456] rounded-[7px]" />
```
금지되는 패턴:

bg-[#xxxxxx]
text-[15px]
p-[13px]
rounded-[7px]
z-[9999]
정적 색상 inline style
의미 없는 magic number


## 3. Pre-flight Checklist
모든 작업은 아래 순서로 시작한다.
### 3.1 요청 범위 확인
작업 전 다음을 명확히 한다.
```txt
- 어떤 화면을 수정하는가?
- 어떤 컴포넌트를 수정하는가?
- 새 파일이 필요한가?
- 기존 파일만 수정하면 되는가?
- 새 라이브러리가 필요한가?
- 사용자가 요청하지 않은 변경이 포함되어 있지 않은가?
```
불확실하면 작업하지 말고 질문한다.

### 3.2 기존 컴포넌트 검색
새 컴포넌트를 만들기 전에 유사 컴포넌트를 검색한다.
예시:
```bash
grep -ri "Card\|Button\|Filter\|Modal\|Form" src/components src/features
```
작업 후 응답에는 다음을 포함한다.
```txt
기존 컴포넌트 확인 여부:
- 확인한 폴더:
- 재사용한 컴포넌트:
- 새로 만든 컴포넌트:
- 새로 만든 이유:
```

### 3.3 기존 패턴 확인
같은 폴더의 파일 1~2개를 먼저 확인하고 다음 패턴을 따른다.

import 순서 (아래 기준을 따른다)
파일 네이밍
컴포넌트 네이밍
props 네이밍
className 작성 방식
export 방식
상태 관리 방식

임의로 새로운 스타일이나 구조를 도입하지 않는다.
Import 순서 기준 (프로젝트에 별도 규칙이 없을 때):
```ts
// 1. 외부 라이브러리 (node_modules)
import { useState } from "react";
import { useRouter } from "next/navigation";

// 2. 내부 절대 경로 (alias)
import { Button } from "@/components/ui/button";
import { useProductList } from "@/features/products/hooks";

// 3. 내부 상대 경로
import { formatPrice } from "../utils";
import type { Product } from "./types";
```
그룹 사이에는 빈 줄 하나를 둔다.
type import는 해당 그룹 마지막에 모은다.

### 3.4 디자인 토큰 확인
다음 파일이 있으면 먼저 확인한다.
```txt
tailwind.config.*
tokens.css
theme.ts
globals.css
design-tokens.ts
components/ui/*
```
필요한 토큰이 없으면 임의 값을 사용하지 말고 사용자에게 제안한다.

## 4. Recommended Folder Structure
프로젝트 구조는 기존 컨벤션을 우선 따른다.
새 프로젝트라면 아래 구조를 기준으로 한다.
```txt
src/
├── app/ 또는 pages/
│   └── ...
│
├── components/
│   ├── ui/              # Button, Input, Badge 등 디자인 시스템
│   ├── common/          # SearchBar, EmptyState 등 앱 전반 공용
│   └── layout/          # Header, Footer, Sidebar, PageContainer
│
├── features/
│   └── feature-name/
│       ├── components/
│       ├── hooks/
│       ├── api/
│       ├── services/
│       ├── constants.ts
│       └── types.ts
│
├── hooks/
│   └── ...
│
├── lib/
│   ├── utils.ts
│   ├── format.ts
│   └── validators.ts
│
├── types/
│   └── ...
│
```
└── styles/
    └── ...

## 5. Component Hierarchy
컴포넌트는 4단계 계층을 유지한다.
```txt
1. Primitives
   Button, Input, Badge, Icon

2. Composites
   Card, Modal, FormField, Table, EmptyState

3. Features
   UserCard, ProductFilter, LoginForm, PlaceCard 등 도메인 컴포넌트

4. Pages / Routes
```
   페이지 조립, 데이터 페칭, 레이아웃 배치

### 5.1 계층 규칙
하위 계층은 상위 계층을 import하지 않는다.
허용:
```txt
features/product/ProductCard → components/ui/Button import 가능
```
금지:
```txt
components/ui/Button → features/product/ProductCard import 금지
```

### 5.2 도메인 용어 사용 기준
Primitive와 Composite에는 도메인 용어를 넣지 않는다.
금지:
```txt
components/ui/ProductButton.tsx
components/ui/UserCard.tsx
```
허용:
```txt
features/products/components/product-card.tsx
features/users/components/user-card.tsx
components/ui/button.tsx
components/ui/card.tsx
```

## 6. Design Tokens
시각적 값은 가능한 한 디자인 토큰을 통해 관리한다.
### 6.1 토큰화 대상
| 항목 | 예시 |
|---|---|
| Color | `primary`, `secondary`, `muted`, `destructive` |
| Background | `bg-surface`, `bg-muted`, `bg-card` |
| Text | `text-primary`, `text-muted`, `text-danger` |
| Radius | `rounded-sm`, `rounded-md`, `rounded-lg` |
| Shadow | `shadow-card`, `shadow-popover` |
| Z-index | `z-dropdown`, `z-modal`, `z-toast` |
| Transition | `duration-fast`, `duration-base` |
| Breakpoint | `sm`, `md`, `lg`, `xl` |

### 6.2 금지 예시
```tsx
<div className="bg-[#1F4FE6] p-[14px] rounded-[6px]" />
```

### 6.3 권장 예시
```tsx
<div className="bg-primary p-4 rounded-md" />
```

### 6.4 제한적 예외
다음은 제한적으로 허용한다.

지도 라이브러리가 요구하는 inline style
차트 width, marker position 등 동적 계산값
사용자 입력 기반 위치 값
third-party 라이브러리에서 강제하는 style

단, 정적 디자인 값이면 토큰을 사용한다.

## 7. Variant Management
className을 if-else나 삼항 중첩으로 조립하지 않는다.
권장 도구:

class-variance-authority (cva)
tailwind-variants
객체 매핑

여러 조건의 className을 조합할 때는 clsx 또는 cn() 유틸을 사용한다.
cn()은 일반적으로 clsx + tailwind-merge를 감싼 프로젝트 공용 유틸이다.
```ts
// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 7.1 금지 예시
```tsx
<button
  className={`px-4 py-2 rounded ${
    variant === "primary"
      ? "bg-primary text-white"
      : variant === "ghost"
        ? "bg-transparent border"
        : "bg-muted"
  }`}
/>
```

### 7.2 권장 예시
```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md transition-colors",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground",
        ghost: "bg-transparent hover:bg-muted",
        danger: "bg-destructive text-destructive-foreground",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-base",
        lg: "h-12 px-6 text-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

// 사용 시
<button className={cn(buttonVariants({ variant, size }), className)} />
```

## 8. Props Rules
### 8.1 기본 규칙

props 수가 7개를 초과하면 분해를 검토한다.
boolean props가 3개를 초과하면 variant union으로 합친다.
이벤트 핸들러는 on* 접두사를 사용한다.
디자인 시스템 컴포넌트는 native HTML attributes를 forward한다.
단순 텍스트 prop보다 가능한 경우 children을 우선한다.


### 8.2 금지 예시
```tsx
<Button isPrimary isLarge isRounded isLoading isFullWidth />
```

### 8.3 권장 예시
```tsx
<Button variant="primary" size="lg" fullWidth loading>
  Submit
</Button>
```

### 8.4 Composition over Configuration
복잡한 컴포넌트는 prop을 계속 늘리지 말고 composition을 사용한다.
금지:
```tsx
<Modal
  title="Delete item"
  description="Are you sure?"
  showCloseButton
  showFooter
  primaryButtonText="Delete"
  secondaryButtonText="Cancel"
  onPrimaryClick={handleDelete}
/>
```
권장:
```tsx
<Modal>
  <Modal.Header>Delete item</Modal.Header>
  <Modal.Body>Are you sure?</Modal.Body>
  <Modal.Footer>
    <Button variant="ghost">Cancel</Button>
    <Button variant="danger">Delete</Button>
  </Modal.Footer>
</Modal>
```

## 9. TypeScript Rules
### 9.1 기본 규칙

strict: true를 기준으로 작성한다.
any를 사용하지 않는다.
as any를 사용하지 않는다.
props는 항상 interface 또는 type으로 명시한다.
API 응답 타입은 한 곳에서 관리한다.
finite state는 union type으로 표현한다.
variant는 union literal을 사용한다.
enum은 프로젝트에서 기존에 쓰지 않는다면 새로 도입하지 않는다.


### 9.2 권장 예시
```ts
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type FetchState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: Error };
```

### 9.3 금지 예시
```ts
function Button(props: any) {
  return <button>{props.label}</button>;
}
```

### 9.4 권장 예시
```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

function Button({ variant = "primary", size = "md", children, ...rest }: ButtonProps) {
  return <button {...rest}>{children}</button>;
}
```

## 10. Readability Rules
### 10.1 복잡한 조건에는 이름을 붙인다
금지:
```ts
if (user.role === "admin" && user.status === "active" && !user.deletedAt) {
  showAdminMenu();
}
```
권장:
```ts
const isActiveAdmin =
  user.role === "admin" &&
  user.status === "active" &&
  !user.deletedAt;

if (isActiveAdmin) {
  showAdminMenu();
}
```

### 10.2 Magic Number는 상수로 분리한다
금지:
```ts
await delay(300);
```
권장:
```ts
const ANIMATION_DELAY_MS = 300;

await delay(ANIMATION_DELAY_MS);
```

### 10.3 중첩 삼항 연산자를 피한다
금지:
```ts
const message = isLoading
  ? "Loading..."
  : hasError
    ? "Error occurred"
    : data
      ? "Data loaded"
      : "No data";
```
권장:
```ts
function getMessage() {
  if (isLoading) return "Loading...";
  if (hasError) return "Error occurred";
  if (data) return "Data loaded";
  return "No data";
}

const message = getMessage();
```

### 10.4 로직 종류를 섞지 않는다
하나의 hook이나 컴포넌트에 다음을 모두 넣지 않는다.

API 호출
UI 상태
폼 검증
라우팅
로깅
데이터 포맷팅

필요하면 hook, util, component로 분리한다.

## 11. Predictability Rules
### 11.1 비슷한 함수는 같은 반환 패턴을 가진다
금지:
```ts
function useUser() {
  return query;
}

function usePosts() {
  return query.data;
}
```
권장:
```ts
function useUser() {
  return query;
}

function usePosts() {
  return query;
}
```

### 11.2 숨겨진 side effect를 만들지 않는다
금지:
```ts
async function fetchUser() {
  const user = await api.getUser();
  analytics.track("user_fetched");
  return user;
}
```
권장:
```ts
async function fetchUser() {
  return api.getUser();
}

const user = await fetchUser();
analytics.track("user_fetched");
```

### 11.3 이름은 동작을 정확히 설명해야 한다
금지:
```ts
function handleData() {}
function process() {}
function doSomething() {}
```
권장:
```ts
function formatUserName() {}
function submitLoginForm() {}
function filterVisibleProducts() {}
```

## 12. Cohesion Rules
### 12.1 같이 바뀌는 코드는 가까운 곳에 둔다
기능별로 자주 함께 수정되는 파일은 같은 feature 폴더에 둔다.
권장:
```txt
features/
└── products/
    ├── components/
    ├── hooks/
    ├── api/
    ├── constants.ts
    └── types.ts
```

### 12.2 공통화는 3번 반복 후 고려한다
처음부터 과하게 추상화하지 않는다.
기준:
```txt
1번 사용 → 그냥 둔다.
2번 사용 → 중복 허용 가능.
3번 이상 반복 → 공통화 검토.
```
잘못된 추상화보다 약간의 중복이 나을 수 있다.

### 12.3 Form cohesion
독립적인 필드는 field 단위로 분리할 수 있다.
필드 간 의존성이 강하면 form 단위로 검증한다.
예시:
```txt
독립 필드:
- email
- name
- phone

상호 의존 필드:
- password / confirmPassword
- startDate / endDate
- minPrice / maxPrice
```

## 13. Coupling Rules
### 13.1 Props drilling은 2~3단계 이상 넘기지 않는다
금지 신호:
```txt
Page → Section → List → Item → Button
```
위처럼 같은 props가 여러 단계 그대로 전달되면 구조를 검토한다.
해결 방법:

composition
context
feature-level provider
컴포넌트 위치 재배치


### 13.2 잘못된 공통화 금지
모든 케이스를 처리하는 거대한 hook이나 component를 만들지 않는다.
금지:
```ts
function useUniversalModal(type) {
  if (type === "product") {}
  if (type === "user") {}
  if (type === "order") {}
}
```
권장:
```ts
function useProductModal() {}
function useUserModal() {}
function useOrderModal() {}
```

### 13.3 하위 컴포넌트가 상위 비즈니스 로직을 알지 않게 한다
금지:
```txt
Button이 결제 상태, 로그인 상태, 상품 상태를 직접 판단
```
권장:
```txt
상위 feature에서 판단
Button은 disabled, children, onClick만 받음
```

## 14. State Management Rules
상태는 종류에 따라 위치를 분리한다.
| 상태 종류 | 위치 |
|---|---|
| Server state | Server Component, React Query, SWR, Pinia Query 등 |
| URL state | router query, searchParams |
| Form state | react-hook-form, VeeValidate 등 |
| Global UI state | Context, Zustand, Pinia 등 |
| Local UI state | useState, ref 등 |

### 14.1 금지 패턴
서버에서 받은 데이터를 이유 없이 local state로 복사하지 않는다.
금지:
```tsx
const { data } = useQuery(...);
const [items, setItems] = useState(data);
```
필요한 경우:

사용자가 직접 편집하는 임시 상태
optimistic update
drag & drop
local-only interaction


### 14.2 파생 상태(Derived State)는 별도 state로 만들지 않는다
기존 state나 props로부터 계산할 수 있는 값은 useState로 관리하지 않는다.
렌더링 중 직접 계산하거나, 비용이 크면 useMemo를 사용한다.
금지:
```tsx
const [filteredItems, setFilteredItems] = useState([]);

useEffect(() => {
  setFilteredItems(items.filter((i) => i.active));
}, [items]);
```
권장:
```tsx
const filteredItems = items.filter((i) => i.active);

// 계산 비용이 클 때
const filteredItems = useMemo(
  () => items.filter((i) => i.active),
  [items]
);
```

### 14.3 URL에 남아야 할 상태
다음 상태는 URL에 반영한다.

검색어
필터
정렬
페이지
탭
카테고리

예시:
```txt
/products?category=book&sort=latest&page=2
```

## 15. Framework Rules
### 15.1 React / Next.js

기본은 Server Component를 우선한다.
useState, useEffect, 이벤트 핸들러가 필요한 경우에만 Client Component로 분리한다.
모든 파일에 무조건 "use client"를 붙이지 않는다.
지도, 차트, 브라우저 API 사용 컴포넌트는 Client Component로 분리한다.
URL에 남아야 하는 상태는 searchParams로 관리한다.
이미지는 반드시 next/image의 <Image> 컴포넌트를 사용한다. <img> 태그를 직접 사용하지 않는다.

```tsx
// 금지
<img src="/hero.png" alt="hero" />

// 권장
import Image from "next/image";
<Image src="/hero.png" alt="hero" width={800} height={400} />
```

### 15.2 Vue / Nuxt

Composition API를 우선한다.
composable은 use* 네이밍을 사용한다.
페이지 단위 데이터 fetching과 컴포넌트 내부 UI 상태를 분리한다.
props와 emits 타입을 명시한다.
전역 상태가 필요할 때만 Pinia 등을 사용한다.


### 15.3 useEffect Rules
useEffect는 외부 시스템과의 동기화에만 사용한다.
아래 목적에는 사용하지 않는다.
금지: 파생 상태 계산
```tsx
// 금지
useEffect(() => {
  setFullName(`${firstName} ${lastName}`);
}, [firstName, lastName]);

// 권장: 렌더 중 직접 계산
const fullName = `${firstName} ${lastName}`;
```
금지: props 변경에 반응해 state 초기화
```tsx
// 금지
useEffect(() => {
  setComment("");
}, [postId]);

// 권장: key prop으로 컴포넌트 재마운트
<CommentForm key={postId} />
```
금지: 이벤트 핸들러 대신 사용
```tsx
// 금지
useEffect(() => {
  if (submitted) {
    sendAnalytics();
  }
}, [submitted]);

// 권장: 이벤트 핸들러 안에서 직접 호출
function handleSubmit() {
  setSubmitted(true);
  sendAnalytics();
}
```
허용: 실제 외부 동기화
```tsx
// 허용 예시
useEffect(() => {
  const subscription = externalStore.subscribe(callback);
  return () => subscription.unsubscribe();
}, []);
```
useEffect 의존성 배열에 eslint-plugin-react-hooks 경고를 무시하는 주석(// eslint-disable-next-line)을 임의로 추가하지 않는다.

## 16. Styling Rules
다음 패턴은 금지한다.
| 금지 | 대안 |
|---|---|
| `style={{ color: "#fff" }}` | `className` + token |
| `className="mb-[13px]"` | Tailwind scale 또는 token |
| `bg-[#1F4FE6]` | `bg-primary` |
| `z-[9999]` | z-index token |
| `!important` 남용 | 스타일 구조 수정 |
| `<div onClick>` | `<button>` |
| global selector 남용 | 컴포넌트 스코프 |
| absolute + magic number | flex/grid 우선 |
| 직접 미디어쿼리 남발 | breakpoint token 사용 |

## 17. Accessibility Rules
다음은 반드시 지킨다.

interactive 요소는 <button>, <a> 등 시멘틱 태그를 사용한다.
<div onClick>은 사용하지 않는다.
<img>는 alt를 반드시 작성한다.
장식용 이미지는 alt=""를 사용한다.
input에는 label 또는 aria-label을 연결한다.
색상만으로 상태를 전달하지 않는다.
focus 스타일을 제거하지 않는다.
outline-none만 단독으로 사용하지 않는다.
모달, 드롭다운, 툴팁은 접근성이 보장된 라이브러리를 우선 사용한다.


## 18. File and Naming Rules
### 18.1 파일 네이밍
프로젝트 기존 컨벤션을 따른다.
새로 정해야 한다면 아래 중 하나로 통일한다.
txtkebab-case.tsx
PascalCase.tsx
혼용하지 않는다.

### 18.2 컴포넌트 네이밍
컴포넌트 이름은 역할을 명확히 드러낸다.
금지:
txtBox
Wrapper
Thing
DataView
권장:
txtProductCard
UserProfileForm
FilterPanel
EmptyState

### 18.3 barrel export
index.ts barrel export는 디자인 시스템 또는 shared 모듈에만 제한적으로 사용한다.
feature 내부에서 무분별하게 barrel export를 만들지 않는다.
순환 참조 위험이 있다.

## 19. Loading / Empty / Error States
목록, 상세, 비동기 화면은 아래 상태를 처리한다.
txtLoading
Empty
Error
Success
예시:
txtLoading: skeleton 표시
Empty: 결과 없음 메시지
Error: 재시도 버튼 또는 에러 안내
Success: 실제 데이터 표시
AI는 정상 데이터가 있는 경우만 구현하지 않는다.

## 20. Form Rules
폼은 직접 useState 여러 개로 관리하지 않는다.
권장:

React: react-hook-form
Vue: VeeValidate 또는 프로젝트 기존 폼 패턴

폼 구현 시 포함할 것:

label
validation message
disabled / loading state
submit error
success feedback
required 표시
접근성 속성


## 21. AI Work Process
AI는 작업할 때 반드시 다음 순서를 따른다.

요청 내용을 짧게 요약한다.
수정할 파일 후보를 먼저 판단한다.
기존 컴포넌트 재사용 가능 여부를 확인한다.
필요한 경우에만 새 컴포넌트를 만든다.
관련 없는 파일은 수정하지 않는다.
작업 후 수정한 파일 목록과 이유를 정리한다.
실행이나 테스트를 하지 못했다면 확인 필요하다고 명시한다.


## 22. Communication Rules
AI는 다음 상황에서 반드시 사용자에게 질문한다.

새 라이브러리 설치가 필요한 경우
기존 컴포넌트의 props 구조를 바꿔야 하는 경우
폴더 구조를 변경해야 하는 경우
디자인 토큰을 추가해야 하는 경우
요청 범위를 벗어나는 리팩터링이 필요한 경우
API, 인증, 결제, 배포 설정처럼 환경변수가 필요한 경우
요구사항이 서로 충돌하는 경우


## 23. Self-review Checklist
코드 작성 후 다음 항목을 확인한다.

 기존 컴포넌트와 중복되지 않는가?
 요청 범위 밖 작업을 하지 않았는가?
 any, as any를 사용하지 않았는가?
 정적 색상/픽셀값을 하드코딩하지 않았는가?
 props가 7개 이하인가?
 boolean props가 3개 이하인가?
 컴포넌트가 단일 책임을 지키는가?
 복잡한 조건에 이름을 붙였는가?
 magic number를 상수로 분리했는가?
 Server state를 불필요하게 local state로 복사하지 않았는가?
 파생 상태를 useState로 만들지 않았는가?
 useEffect를 외부 동기화 외 목적으로 사용하지 않았는가?
 URL에 남아야 하는 상태가 URL에 반영되는가?
 interactive 요소가 시멘틱 태그를 사용하는가?
 Loading / Empty / Error 상태가 있는가?
 Next.js에서 <img> 대신 <Image>를 사용했는가?
 수정한 파일 목록과 이유를 설명했는가?
 테스트하지 못한 부분을 명확히 표시했는가?


## 24. Refactoring Signals
다음 상황이 발생하면 리팩터링을 고려한다.

파일이 200줄을 넘는다.
함수가 50줄을 넘는다.
같은 코드가 3번 이상 반복된다.
props drilling이 3단계 이상 발생한다.
조건부 렌더링이 3단계 이상 중첩된다.
컴포넌트 하나가 3개 이상의 책임을 가진다.
boolean props가 계속 늘어난다.
비슷한 UI가 여러 곳에서 다르게 구현된다.

단, 리팩터링이 사용자 요청 범위를 벗어나면 먼저 허락을 구한다.

## 26. Performance Rules
성능 최적화는 측정 후 적용한다. 근거 없는 사전 최적화를 하지 않는다.
### 26.1 메모이제이션 오용 금지
React.memo, useMemo, useCallback은 실제 성능 문제가 확인된 경우에만 사용한다.
모든 컴포넌트와 함수에 기계적으로 붙이지 않는다.
금지:
```tsx
// props가 거의 바뀌지 않는 단순 컴포넌트에 무조건 memo 사용
const SimpleLabel = React.memo(({ text }: { text: string }) => <span>{text}</span>);
```
권장:
```tsx
// 렌더링 비용이 크거나, 부모가 자주 리렌더링되는 경우에만 적용
const HeavyChart = React.memo(({ data }: { data: ChartData[] }) => <ExpensiveChart data={data} />);
```

### 26.2 Code Splitting / Lazy Loading
초기 번들 크기를 줄이기 위해 페이지 단위 또는 무거운 컴포넌트는 lazy import를 사용한다.
```tsx
// React
const HeavyModal = lazy(() => import("./HeavyModal"));

// Next.js
const HeavyModal = dynamic(() => import("./HeavyModal"), { ssr: false });
```
지도, 에디터, 차트 등 third-party 라이브러리가 포함된 컴포넌트는 특히 lazy load를 적극 검토한다.

### 26.3 목록 렌더링
긴 목록(100개 이상)을 렌더링할 때는 가상화(virtualization)를 검토한다.
권장 라이브러리: @tanstack/react-virtual, react-window
단, 도입 전 사용자에게 먼저 확인한다.

### 26.4 이미지 최적화

Next.js: next/image의 <Image> 사용 (Section 15.1 참고)
priority prop은 LCP(Largest Contentful Paint) 대상 이미지에만 붙인다.
아이콘은 SVG sprite 또는 icon 컴포넌트로 관리한다.


## 25. Quick Reference
```txt
새 컴포넌트 만들기 전        → 기존 컴포넌트 검색
요청 범위 밖 작업            → 하지 않음
색상/브랜드 값              → 토큰 사용
임의 px 값                  → 금지
variant 분기                → cva / tailwind-variants / 객체 매핑
className 조합              → cn() / clsx 사용
props 7개 초과              → 분해 검토
boolean props 3개 초과      → variant union 검토
서버 데이터                 → useState 복사 금지
파생 상태                   → useState 금지, 렌더 중 계산
useEffect                   → 외부 동기화 목적으로만
필터/검색/정렬/페이지        → URL query 반영
폼                           → 폼 라이브러리 사용
모달/툴팁/드롭다운           → 접근성 보장 라이브러리 우선
복잡한 조건                 → 이름 붙이기
magic number                → 상수화
중복 3회 이상               → 공통화 검토
Next.js 이미지              → next/image 사용
무거운 컴포넌트             → lazy / dynamic import
메모이제이션                → 측정 후 적용, 기계적 사용 금지
모르면                      → 질문
테스트 못 했으면            → 확인 필요 표시
```

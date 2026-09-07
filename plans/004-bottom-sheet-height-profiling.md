# 004 — 모바일 Bottom Sheet 높이 전환을 실기기에서 프로파일링한다 (조사 전용)

- **Status**: TODO
- **Commit**: 046adbb
- **Severity**: HIGH (미확인 — 이 조사가 확정한다)
- **Category**: Performance
- **Estimated scope**: **소스 코드 변경 없음.** 산출물은 `plans/004-findings.md` 문서 1개
- **Depends on**: [001](001-motion-tokens.md) — 지속시간이 250ms로 정리된 뒤 측정해야 결과가 최종 코드와 일치한다

> **이 계획은 리팩터링 계획이 아니다.** 측정하고 판단 근거를 남기는 것까지가 범위다.
> 코드를 고치는 것은 이 조사 결과를 근거로 별도 계획(005)을 작성한 뒤에 한다.

## Problem

모바일 Bottom Sheet가 **레이아웃 속성인 `height`를 애니메이션**한다.

```tsx
// src/app/[locale]/(public)/places/PlacesClient.tsx:246-253 — 현재
        <section
          aria-label={t("list.title")}
          className={cn(
            "absolute inset-x-0 bottom-0 z-bottom-sheet flex flex-col overflow-hidden rounded-t-2xl border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] shadow-lg",
            "transition-[height] duration-300 ease-out motion-reduce:transition-none",
            SHEET_HEIGHT[sheetState],
            "lg:static lg:z-auto lg:h-auto lg:w-[340px] lg:shrink-0 lg:rounded-none lg:border-r lg:border-t-0 lg:pb-0 lg:shadow-none lg:transition-none",
          )}
        >
```

```tsx
// src/app/[locale]/(public)/places/PlacesClient.tsx:42-48 — 현재
type SheetState = "peek" | "results" | "selected";

const SHEET_HEIGHT: Record<SheetState, string> = {
  peek: "h-24",
  results: "h-[75vh]",
  selected: "h-72",
};
```

```tsx
// src/app/[locale]/(public)/places/PlacesClient.tsx:177-181 — 현재
  const sheetState: SheetState = selectedPlace
    ? "selected"
    : isSheetListOpen
      ? "results"
      : "peek";
```

**왜 의심스러운가**

1. `height`는 `transform`/`opacity`와 달리 **레이아웃 → 페인트 → 합성**을 매 프레임 다시 돌린다.
2. 이 `<section>`은 잎 노드가 아니다. 검색 입력·카테고리 칩·필터/정렬 컨트롤·배너 3종·장소 카드 목록 전체·미리보기 카드를 담고 있다(`PlacesClient.tsx:255-530`). 높이가 프레임마다 바뀌면 그 서브트리가 프레임마다 다시 배치된다.
3. **모바일에서 가장 잦은 조작**에 걸려 있다. 지도 마커나 목록 카드를 누를 때마다 `peek`(h-24) ↔ `selected`(h-72)로 바뀌고, 목록 토글로 `results`(h-75vh)까지 간다. 한 세션에서 수십 번 발생한다.

**왜 아직 고치지 않는가**

규칙만 보면 명백한 위반이지만, **실제로 프레임을 떨어뜨리는지는 코드만 봐서 알 수 없다.** 서브트리 비용, 기기 성능, 목록 항목 수에 달렸다. 현재 공개 장소는 4곳뿐이라 개발 환경에서는 아무 문제가 없어 보일 가능성이 높고, 목표치인 30~50곳에서는 달라질 수 있다.

대안(고정 높이 + `transform: translateY()`)은 시트 자식들이 `flex-1`·`overflow-y-auto`로 부모 높이에 의존하고 있어 **구조 변경이 필요한 리팩터링**이다. 측정 없이 착수할 만한 규모가 아니다.

**조사 목적**: "고칠 가치가 있는가"를 숫자로 답하고, 있다면 어떤 조건에서 그런지 남긴다.

## Target

`plans/004-findings.md` 파일 하나. 아래 6개 절을 채운다.

```markdown
# 004 조사 결과 — Bottom Sheet 높이 전환

## 측정 환경
- 기기 / OS / 브라우저 :
- 빌드 : `next build` + `next start` (프로덕션)
- 공개 장소 수 :
- 측정일 :

## 측정값

| 시나리오 | 장소 수 | 평균 FPS | 최저 FPS | 드롭 프레임 | Recalculate Style (ms) | Layout (ms) |
|---|---|---|---|---|---|---|
| peek → selected | 4 | | | | | |
| selected → peek | 4 | | | | | |
| peek → results | 4 | | | | | |
| peek → selected | 40 | | | | | |
| selected → peek | 40 | | | | | |
| peek → results | 40 | | | | | |

## 대조군 (transform 프로토타입)
| 시나리오 | 장소 수 | 평균 FPS | 최저 FPS |
|---|---|---|---|

## 판정
- [ ] 문제 없음 — 현행 유지
- [ ] 조건부 — (조건: ) 
- [ ] 리팩터링 필요

## 근거

## 다음 작업
```

## Files

**소스 파일을 수정하지 않는다.**

| 파일 | 변경 |
|---|---|
| `plans/004-findings.md` | 신규 생성 (조사 결과) |
| `plans/README.md` | 004의 Status를 `DONE (findings)`으로 갱신 |

프로토타입 측정을 위해 임시로 코드를 고치는 경우 **커밋하지 않고 반드시 되돌린다**(6단계 참조).

## Repo conventions to follow

- **문서는 한국어로 쓰고 근거 파일을 `path:line`으로 인용한다.** `docs/PROJECT_STATUS.md`가 그 형식이다 — 판정마다 근거 파일과 확인 방법을 함께 적는다.
- **확인하지 못한 것은 `확인 필요`로 남기고 추측하지 않는다.** `docs/PROJECT_STATUS.md` 머리말의 원칙이다. 측정하지 못한 시나리오는 빈칸이 아니라 **미측정 + 사유**로 적는다.
- **측정 없는 단정을 하지 않는다.** 같은 문서의 `§확인 필요 목록`에 `지도 For development purposes only 경고 — 이전 보고에서 'API 키 도메인 제한'으로 단정했으나 근거가 없었다`는 전례가 있다. 같은 실수를 반복하지 않는다.
- 프로덕션 빌드로 측정한다. `next dev`는 개발용 오버헤드가 섞여 수치가 의미 없다.

## Reduced motion 처리

**조사 대상이 아니다.** `PlacesClient.tsx:250`의 `motion-reduce:transition-none`은 이미 올바르게 걸려 있고, reduced motion에서는 전환 자체가 없으므로 성능 문제도 없다.

다만 측정할 때 **`prefers-reduced-motion`이 꺼져 있는지 먼저 확인한다.** 켜져 있으면 전환이 일어나지 않아 측정값이 전부 0이 나온다. DevTools **Rendering 패널**에서 `No emulation` 상태인지, 실기기라면 OS 설정(iOS: 손쉬운 사용 → 동작 → 동작 줄이기 / Android: 접근성 → 애니메이션 제거)이 꺼져 있는지 확인한다.

## Steps

1. **프로덕션 빌드를 띄우고 실기기에서 접근할 수 있게 한다.**
   ```bash
   npx next build
   npx next start -p 3100 -H 0.0.0.0
   ```
   개발 PC의 LAN IP를 확인해 실기기 브라우저에서 `http://<IP>:3100/ko/places`로 접속한다. 같은 Wi-Fi여야 한다.

   > **DevTools 디바이스 모드는 이 측정에 쓰지 않는다.** 데스크톱 CPU/GPU로 렌더링하므로 실제 모바일 성능이 나오지 않는다. 이 조사의 전제가 무너진다.

2. **실기기를 원격 디버깅에 연결한다.**
   - Android: USB 연결 후 데스크톱 Chrome에서 `chrome://inspect` → 해당 탭 `inspect`.
   - iOS: Safari 설정 → 고급 → 웹 속성 켜기, macOS Safari → 개발자 메뉴. (iOS만 가능하면 Safari 타임라인으로 대체하고 그 사실을 결과 문서에 적는다.)

   연결이 불가능하면 **여기서 멈추고 보고한다.** 데스크톱 에뮬레이션으로 대체해 측정값을 만들지 않는다 — 근거 없는 숫자가 문서에 남는 것이 측정 실패보다 나쁘다.

3. **장소 4곳 상태에서 측정한다.** 각 시나리오를 5회 반복하고 중앙값을 적는다.

   | 시나리오 | 조작 |
   |---|---|
   | `peek → selected` | 지도 마커를 누른다 (h-24 → h-72) |
   | `selected → peek` | 미리보기의 닫기를 누른다 (h-72 → h-24) |
   | `peek → results` | `목록 보기` 버튼을 누른다 (h-24 → h-75vh) |

   각 회차에서 기록할 것:
   - **Performance 패널** 녹화 → 전환 구간의 **평균 FPS**, **최저 FPS**, **드롭 프레임 수**
   - 같은 구간의 **Recalculate Style**과 **Layout** 합계 시간(ms)
   - **Rendering 패널 → Paint flashing**을 켜고 전환 중 다시 칠해지는 영역을 관찰. 시트 전체가 매 프레임 깜빡이면 서브트리 전체가 재배치되는 것이다. 스크린샷을 남긴다.

4. **장소 수를 목표치까지 늘려 다시 측정한다.** 이게 이 조사의 핵심이다 — 4곳에서 문제없는 것은 아무것도 증명하지 못한다.

   **운영 DB에 데이터를 만들지 않는다.** 목록은 `PlacesClient`가 `initialPlaces` prop으로 받으므로, 서버 쪽 조회를 건드리지 않고 클라이언트에서 배열만 부풀려 측정할 수 있다. `PlacesClient.tsx`의 `initialPlaces` 사용 지점 바로 위에 임시로 다음을 넣는다:

   ```tsx
   // TEMP(004): 프로파일링용. 커밋 금지. 측정 후 반드시 제거.
   const initialPlaces = Array.from({ length: 40 }, (_, i) => ({
     ...props.initialPlaces[i % props.initialPlaces.length],
     id: `tmp-${i}`,
   }));
   ```

   정확한 삽입 형태는 실제 코드에 맞춘다. 중요한 것은 **서버·DB를 건드리지 않는다**는 점이다(`docs/PROJECT_STATUS.md`의 `UI 검증은 DB 쓰기 없이` 원칙).

   다시 `next build && next start`한 뒤 3단계의 세 시나리오를 반복한다.

5. **대조군을 만든다.** 리팩터링이 실제로 이득인지 확인하지 않으면 판정할 수 없다.

   임시로 250행을 다음으로 바꾼다 — **측정용이며 커밋하지 않는다**:
   ```tsx
   // TEMP(004): transform 대조군. 커밋 금지.
   "transition-transform duration-standard ease-standard motion-reduce:transition-none",
   ```
   그리고 `SHEET_HEIGHT`를 고정 높이 + `translate-y` 조합으로 임시 대체한다(예: 높이를 `h-[75vh]`로 고정하고 `peek`은 `translate-y-[calc(75vh-6rem)]`, `selected`는 `translate-y-[calc(75vh-18rem)]`, `results`는 `translate-y-0`).

   **레이아웃이 깨져도 된다.** 목적은 화면을 완성하는 게 아니라 `transform` 전환의 프레임 비용을 재는 것이다. 장소 40곳 상태에서 3단계의 세 시나리오를 측정해 대조군 표를 채운다.

6. **임시 변경을 전부 되돌린다.**
   ```bash
   git status --short          # PlacesClient.tsx가 M으로 남아 있으면 안 된다
   git checkout -- "src/app/[locale]/(public)/places/PlacesClient.tsx"
   git status --short          # plans/ 아래 파일만 남아야 한다
   ```
   **이 단계를 건너뛰지 않는다.** 4·5단계의 임시 코드가 커밋되면 목록에 가짜 장소가 표시된다.

7. **`plans/004-findings.md`를 작성한다.** Target 절의 틀을 채운다. 판정 기준:

   | 관찰 | 판정 |
   |---|---|
   | 장소 40곳에서도 최저 FPS ≥ 55, Layout 합계 < 4ms | **문제 없음 — 현행 유지** |
   | 4곳에선 괜찮지만 40곳에서 최저 FPS < 50 또는 드롭 프레임 발생 | **조건부** — 장소 수 임계를 명시하고, 데이터 확보 시점에 착수할 리팩터링으로 예약 |
   | 4곳에서도 최저 FPS < 50, 또는 대조군 대비 Layout 시간이 3배 이상 | **리팩터링 필요** |

   판정이 `조건부` 또는 `리팩터링 필요`면 문서 마지막에 다음을 적는다:
   - 대조군에서 확인된 개선 폭(수치)
   - `flex-1`·`overflow-y-auto`에 의존하는 자식이 어디인지(`PlacesClient.tsx`의 해당 라인)
   - 계획 005의 범위 초안

8. **`plans/README.md`의 004 Status를 `DONE (findings)`으로 바꾸고 판정을 한 줄로 적는다.**

## Boundaries

- **최종 산출물에 소스 코드 변경이 포함되면 안 된다.** 6단계의 `git status`가 이를 보장한다.
- 4·5단계의 임시 코드를 커밋하지 않는다.
- **DB에 쓰지 않는다.** 측정용 장소를 운영 데이터로 만들지 않는다. 4단계는 클라이언트 배열만 부풀린다.
- 이 조사에서 실제 리팩터링을 하지 않는다. 대조군은 측정 후 폐기한다.
- `motion-reduce:transition-none`을 제거하지 않는다.
- 데스크톱 레이아웃(`lg:` 이상)을 건드리지 않는다. `lg:transition-none`이 걸려 있어 조사 대상이 아니다.
- 데스크톱 패널 폭 전환(`PlacesClient.tsx:538`)을 조사하지 않는다. `DESIGN.md:253`이 규정한 의도된 동작이다.
- **측정하지 못한 값을 추정으로 채우지 않는다.** 미측정은 미측정으로 적는다.
- 단계에 적힌 코드가 실제 파일과 다르면 임의로 맞추지 말고 **STOP하고 보고한다.**

## Verification

이 계획은 코드를 바꾸지 않으므로 통상적인 mechanical 검증이 아니라 **조사 자체의 유효성**을 확인한다.

**측정이 유효한가**

- 프로덕션 빌드(`next start`)에서 측정했다. `next dev`가 아니다.
- **실기기**에서 측정했다. DevTools 디바이스 에뮬레이션이 아니다.
- `prefers-reduced-motion`이 꺼진 상태였다(켜져 있으면 전환이 없어 측정값이 무의미).
- 각 시나리오를 5회 반복하고 중앙값을 적었다. 1회 측정값이 아니다.
- 장소 4곳과 40곳 **양쪽** 수치가 있다.
- 대조군(`transform`) 수치가 있다.

**문서가 유효한가**

- 6개 절이 모두 채워졌고, 빈 칸은 `미측정 + 사유`로 적혀 있다.
- 판정이 7단계의 세 기준 중 하나에 해당하고, 그 근거 수치가 표에 있다.
- 측정 환경(기기·OS·브라우저·측정일)이 적혀 있다.

**작업 트리가 깨끗한가**

```bash
git status --short
```
`plans/` 아래 파일만 나와야 한다. `src/` 파일이 하나라도 `M`으로 남아 있으면 실패다.

**Done when**

- `plans/004-findings.md`가 존재하고 판정이 하나 선택돼 있다.
- `git status --short`에 소스 변경이 없다.
- `plans/README.md`의 004 Status가 갱신됐다.
- 판정이 `조건부`/`리팩터링 필요`면 계획 005의 범위 초안이 문서에 있다.

## Impact and regression risk

**영향 범위**: 정상 종료 시 **소스 코드 0줄**. 산출물은 문서뿐이다.

| 위험 | 수준 | 근거 / 완화 |
|---|---|---|
| 4·5단계 임시 코드가 커밋됨 | **높음** | 가짜 장소 40개가 목록에 노출되거나 시트 레이아웃이 깨진 채 배포된다. 6단계 `git checkout`과 Verification의 `git status`로 두 번 막는다. 임시 코드마다 `TEMP(004): 커밋 금지` 주석을 단다 |
| 실기기 없이 에뮬레이션으로 측정 | **높음** | 조사 전체가 무의미해진다. 데스크톱 CPU/GPU 성능이 섞이면 "문제 없음" 판정이 나올 수밖에 없다. 2단계에서 연결 불가 시 **중단하고 보고**하도록 했다 |
| 장소 4곳으로만 측정하고 종결 | 중 | 현재 데이터로는 거의 확실히 "문제 없음"이 나오고, 30~50곳 확보 후 재발한다. 4단계가 필수인 이유 |
| 측정 중 DB에 테스트 데이터 생성 | 중 | 운영 DB가 단일이다(메모리: Supabase 단일 DB). 4단계를 클라이언트 배열 복제로 설계한 이유 |
| 판정을 근거 없이 내림 | 중 | 7단계에 수치 기준을 못박았다. 기준에 걸치면 `조건부`를 고른다 |
| 조사 후 아무도 후속하지 않음 | 낮음 | 8단계에서 README Status와 판정을 남긴다. `조건부`면 착수 조건(장소 수)이 문서에 남는다 |

**롤백**: 조사 계획이므로 되돌릴 것이 없다. 6단계가 실행되면 작업 트리는 원상태다.

## 실행 순서

**선행: 계획 001 완료.** 250행이 `duration-standard`(250ms)로 정리된 상태에서 측정해야, 나중에 최종 코드와 수치가 어긋나지 않는다. 001 전에 측정하면 300ms 기준 수치가 남는다.

1단계(빌드·서버) → 2단계(실기기 연결, **실패 시 중단**) → 3단계(4곳 측정) → 4단계(40곳 측정) → 5단계(대조군) → **6단계(원복 — 건너뛰지 않는다)** → 7단계(문서 작성) → 8단계(README 갱신).

3·4·5단계는 임시 코드 상태가 서로 다르므로 순서를 지킨다. 특히 5단계 대조군은 4단계의 40곳 상태를 **유지한 채로** 측정해야 비교가 성립한다.

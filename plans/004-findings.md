# 004 조사 결과 — Bottom Sheet 높이 전환

- **Status**: **BLOCKED — 측정 미수행**
- **시도일**: 2026-09-07
- **기준 커밋**: `ada93e4` (소스는 `046adbb`와 동일)
- **계획**: [004-bottom-sheet-height-profiling.md](004-bottom-sheet-height-profiling.md)

## 측정 환경

| 항목 | 값 |
|---|---|
| 기기 / OS / 브라우저 | **확보 실패 — 아래 참조** |
| 빌드 | 미수행 |
| 공개 장소 수 | 미측정 (DB 실측 기준 4곳) |
| 측정일 | — |

### 중단 사유

계획 004의 2단계는 실기기 원격 디버깅 연결을 전제하고, 불가능하면 중단하도록 규정한다.
2026-09-07 확인 결과 세 경로가 모두 막혔다.

| 경로 | 확인 방법 | 결과 |
|---|---|---|
| Android USB 디버깅 | `which adb` | `adb` 미설치 |
| Android 기기 연결 | `Get-PnpDevice -PresentOnly` (Class `WPD`/`AndroidUsbDeviceClass`/`USBDevice`, FriendlyName `Android|ADB` 매칭) | 0건 |
| iOS 원격 디버깅 | 호스트 OS 확인 — `MINGW64_NT-10.0-26200` (Windows 11) | macOS Safari 개발자 도구 경로 없음 |

**데스크톱 DevTools 디바이스 모드로 대체하지 않았다.** 계획 004의 Boundaries가 명시적으로 금지한다:
디바이스 에뮬레이션은 데스크톱 CPU/GPU로 렌더링하므로 모바일 성능이 반영되지 않고,
현재 공개 장소가 4곳뿐이라 거의 확실히 `문제 없음` 판정이 나온다. 그 판정은 근거가 없다.

이 저장소에는 같은 종류의 실수 전례가 있다 —
`docs/PROJECT_STATUS.md` §확인 필요 목록의 `지도 For development purposes only 경고`
항목이 `이전 보고에서 'API 키 도메인 제한'으로 단정했으나 근거가 없었다`로 정정돼 있다.
근거 없는 수치를 남기는 것이 측정 실패보다 나쁘다.

## 측정값

전 항목 **미측정**. 사유는 위와 같다.

| 시나리오 | 장소 수 | 평균 FPS | 최저 FPS | 드롭 프레임 | Recalculate Style (ms) | Layout (ms) |
|---|---|---|---|---|---|---|
| peek → selected | 4 | 미측정 | 미측정 | 미측정 | 미측정 | 미측정 |
| selected → peek | 4 | 미측정 | 미측정 | 미측정 | 미측정 | 미측정 |
| peek → results | 4 | 미측정 | 미측정 | 미측정 | 미측정 | 미측정 |
| peek → selected | 40 | 미측정 | 미측정 | 미측정 | 미측정 | 미측정 |
| selected → peek | 40 | 미측정 | 미측정 | 미측정 | 미측정 | 미측정 |
| peek → results | 40 | 미측정 | 미측정 | 미측정 | 미측정 | 미측정 |

## 대조군 (transform 프로토타입)

**미수행.** 대조군은 본 측정과 비교할 때만 의미가 있다.

| 시나리오 | 장소 수 | 평균 FPS | 최저 FPS |
|---|---|---|---|
| — | — | 미측정 | 미측정 |

## 판정

- [ ] 문제 없음 — 현행 유지
- [ ] 조건부
- [ ] 리팩터링 필요
- [x] **미판정 — 측정 불가로 중단**

## 근거

코드 수준에서 확인된 사실은 그대로 유효하다. 다만 **어느 것도 판정 근거가 되지 못한다.**

1. `src/app/[locale]/(public)/places/PlacesClient.tsx:250`이 `transition-[height]`로
   **레이아웃 속성**을 애니메이션한다. `transform`/`opacity`와 달리 매 프레임
   레이아웃 → 페인트 → 합성을 다시 돈다.
2. 대상 `<section>`은 잎 노드가 아니다. 검색 입력·카테고리 칩·필터/정렬 컨트롤·배너 3종·
   장소 카드 목록 전체·미리보기 카드를 담는다(`PlacesClient.tsx:255-530`).
3. 트리거가 모바일에서 가장 잦은 조작이다. `sheetState`는 `selectedPlace` 유무에서
   파생되므로(`PlacesClient.tsx:177-181`), 마커나 카드를 누를 때마다
   `peek`(h-24) ↔ `selected`(h-72)가 오간다.

**규칙 위반은 명백하나 실제 비용은 미지수다.** 서브트리 렌더 비용, 기기 성능, 목록 항목 수에
달렸고, 세 변수 모두 현재 측정되지 않았다. 특히 공개 장소가 4곳뿐인 지금 상태는
목표치(기획서 v3 §9 — 대전 30~50곳)와 크게 다르다.

## 다음 작업

### 재개 조건

아래 중 **하나**가 충족되면 계획 004를 처음부터 실행한다.

1. **Android 기기 + USB 디버깅** — `adb`(Android Platform Tools) 설치 후 기기를 연결하고
   `chrome://inspect`에서 탭이 보이는 상태.
2. **iOS 기기 + macOS** — Safari 개발자 도구로 원격 인스펙션이 가능한 환경.

두 경우 모두 개발 PC와 기기가 같은 Wi-Fi에 있어야 한다
(계획 004 1단계: `npx next start -p 3100 -H 0.0.0.0`).

### 재개 시 유의

- 계획 004는 **001 완료 후** 측정하도록 돼 있다. 001이 `PlacesClient.tsx:250`을
  `duration-300` → `duration-standard`(250ms)로 바꾸므로, 그 뒤에 재면 수치가 최종 코드와 맞는다.
  001이 이미 적용된 뒤라면 그대로 진행하면 된다.
- 장소 4곳 측정만으로 종결하지 않는다. 계획 004의 4단계(클라이언트 배열 복제로 40곳 재현)가
  이 조사의 핵심이다. **DB에는 쓰지 않는다.**

### 그동안의 취급

`PlacesClient.tsx:250`은 **현행 유지**한다. 계획 001이 지속시간·이징 토큰만 정리하고
`transition-[height]`는 그대로 둔다(계획 001 Boundaries에 명시).

`docs/PROJECT_STATUS.md` §미검증 항목에 남길 문장:

> 모바일 Bottom Sheet 높이 전환의 프레임 비용 — 실기기·원격 디버깅 환경이 없어 미측정.
> 계획 `plans/004-bottom-sheet-height-profiling.md` 참조. 장소 수가 목표치(30~50곳)에
> 근접하면 재개 우선순위가 올라간다.

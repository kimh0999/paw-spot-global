# 모션 개선 계획

`improve-animations` 감사(2026-09-07, 커밋 `046adbb`)에서 나온 계획들이다.
각 계획은 **자체 완결**이다 — 이 README를 읽지 않아도 실행할 수 있게 썼다.

## 계획 목록

| # | 제목 | 심각도 | 분류 | Status |
|---|---|---|---|---|
| [001](001-motion-tokens.md) | DESIGN.md §8 모션 토큰을 전부 구현 | HIGH | Cohesion & tokens | **DONE** `3aae719` |
| [002](002-button-badge-transition-scope.md) | button·badge의 `transition-all` 범위 축소 | MEDIUM | Performance / a11y | **DONE** `36505db` |
| [003](003-filtermodal-drawer-motion.md) | FilterModal 드로어의 지속시간·이징·reduced motion·오버레이 | MEDIUM | Easing / Physicality / a11y | **DONE** `d3a9b2d` |
| [004](004-bottom-sheet-height-profiling.md) | Bottom Sheet 높이 전환 프로파일링 (**조사 전용**) | HIGH (미확인) | Performance | **BLOCKED** — 실기기 없음 ([결과](004-findings.md)) |
| [005](005-tailwind-v4-syntax-in-v3.md) | v3에서 무효한 v4 문법 클래스 되살리기 (button·badge) | HIGH (a11y) | Correctness | TODO |

## 실행 순서

```
001 ──┬── 002 ──> 005
      ├── 003
      └── 004 ──> (006: 조사 결과에 따라 작성)
```

**001을 먼저 끝낸다.** 002·003·004가 모두 001이 만드는 토큰에 의존한다.

| 순서 | 계획 | 이유 |
|---|---|---|
| 1 | **001** | `duration-fast`·`duration-slow`·`ease-enter`·`ease-exit`를 만든다. 없으면 나머지 계획의 클래스가 **무효가 되어도 빌드가 통과**해 조용히 실패한다 |
| 2 | **002** | 파일 2개·각 1줄. 위험이 가장 낮고 001의 토큰이 실제로 동작하는지 먼저 확인된다 |
| 3 | **003** | 사용자에게 보이는 변화가 가장 크다. 002에서 토큰 동작을 확인한 뒤 하는 편이 안전하다 |
| 4 | **004** | 코드를 바꾸지 않는 조사다. 001 이후 아무 때나 해도 되지만, 250행이 250ms로 정리된 뒤 측정해야 수치가 최종 코드와 맞는다 |
| 5 | **005** | 002 실행 중 발견된 별도 결함. **모션이 아니라 correctness/a11y 작업**이고 계획 001~003과 달리 화면이 눈에 띄게 바뀐다(포커스 링 신설·배지 pill화) |

002와 003은 서로 독립이라 순서를 바꿔도 되고 병렬로 진행해도 된다. 다만 003이 훨씬 위험하므로 002를 먼저 두었다.

## 의존 관계

| 계획 | 선행 | 이유 |
|---|---|---|
| 002 | 001 | `duration-fast` 토큰 |
| 003 | 001 | `ease-enter`·`ease-exit` 토큰 |
| 004 | 001 | 250ms 확정 후 측정해야 수치가 유효 |
| 005 | 002 | 002가 정한 전환 목록 위에서 동작한다 |
| 006 (미작성) | 004 | Bottom Sheet 리팩터링. 조사 판정이 `조건부`/`리팩터링 필요`일 때만 작성 |

## 실행 시 반드시 지킬 것

- **각 계획의 `Boundaries` 절을 먼저 읽는다.** 이 저장소에는 별도 트랙에서 처리 중인 항목이 섞여 있다 — 특히 **P0 #7**(FilterModal을 Radix `Dialog`로 교체, focus trap·ESC·`role="dialog"`)은 003과 같은 파일을 건드리지만 **다른 작업**이다. 003에서 접근성 구조를 손대지 않는다.
- **`DESIGN.md`를 수정하지 않는다.** 이 저장소의 유일한 디자인 기준이며, 계획들은 문서를 코드에 반영하는 방향으로만 움직인다. 커브나 지속시간이 어색하게 느껴지면 **보고만 하고 값은 그대로 둔다.**
- 각 계획의 코드가 실제 파일과 다르면(커밋 `046adbb` 이후 드리프트) 임의로 맞추지 말고 **중단하고 보고한다.**
- 모든 계획에 `Verification` 절의 **Feel check**가 있다. 기계적 검증만으로 끝내지 않는다 — 003의 `pointer-events-none` 누락처럼 **typecheck·lint·test·build를 전부 통과하면서 앱을 먹통으로 만드는** 실수가 있다.

## 실행 중 발견 (계획에 없던 것)

| 발견 | 위치 | 조치 |
|---|---|---|
| **v4 문법 클래스가 v3에서 무효** — `ring-3`(포커스 링 없음) · `not-aria-[haspopup]:translate-y-px`(누름 피드백 없음) · `rounded-4xl`(배지가 사각형, 계산된 `border-radius`가 `0px`) 등 7종 | `ui/button.tsx:8`, `ui/badge.tsx:8` | **→ 계획 [005](005-tailwind-v4-syntax-in-v3.md)로 작성됨** |
| `ui/sheet.tsx:65`가 bare `transition`을 써서 `box-shadow`·`filter`까지 전환 목록에 넣는다 | `ui/sheet.tsx:65` | 미사용 파일. 감사 #8과 함께 처리 |

## 감사에서 나왔으나 아직 계획하지 않은 것

후속 작업으로 남긴 항목이다. 필요할 때 `improve-animations`로 계획을 만든다.

| 감사 # | 심각도 | 내용 | 비고 |
|---|---|---|---|
| #5 | MEDIUM | `DogFormDialog.tsx:38-46`·`DogsManager.tsx:180-188`의 Radix 다이얼로그가 모션 없이 튄다 | 올바른 처리가 미사용 파일 `ui/dialog.tsx:42,64`에 이미 있다 |
| #7 | LOW | `SortDropdown.tsx:41-42`가 모션·trigger 기준 `transform-origin` 없이 나타난다 | `ui/dropdown-menu.tsx:46`이 올바른 형태 |
| #8 | LOW | `ui/sheet.tsx:65`의 `ease-in-out`(진입엔 `ease-out`이 맞음), keyframe 기반이라 중단 시 재시작, `slide-in-from-bottom-10`이 자기 높이가 아닌 2.5rem | **현재 미사용.** P0 #7이 이 파일을 채택하면 활성화되므로 그 전에 처리한다 |
| MO-1 | — | `CategoryPlaceTabs.tsx:86-131` 스켈레톤 → 카드 전환이 한 프레임에 교체된다 | 150ms opacity 크로스페이드. 스태거는 부적절(탭 전환은 빈번한 조작) |
| MO-2 | — | `FavoriteButton.tsx:71-76` 즐겨찾기 토글이 테두리 색만 바뀐다 | `DESIGN.md` §8이 overshoot를 금지하므로 튕김 없는 scale settle |

**#5와 #7은 함께 처리하는 편이 효율적이다.** 둘 다 "이미 저장소에 있는 올바른 `ui/` 프리미티브를 손으로 만든 구현 대신 채택한다"는 같은 작업이고, P0 #7의 접근성 작업과도 겹친다.

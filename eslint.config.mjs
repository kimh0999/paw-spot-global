import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Next 16이 `next lint`를 제거해 ESLint CLI로 옮겼다.
 *
 * 규칙 구성은 이전 `.eslintrc.json`과 **같은 두 가지**다 —
 * `next/core-web-vitals` → `eslint-config-next/core-web-vitals`,
 * `next/typescript` → `eslint-config-next/typescript`.
 * 이름만 flat config 진입점으로 바뀌었고 아래 예외 2건 외에는 더하지도 빼지도 않았다.
 *
 * 검사 대상도 그대로 `src`다. `next lint`는 존재하는 기본 디렉터리만 봤고
 * 이 저장소에서 그것은 `src` 하나였다 — 루트 설정 파일과 `scripts/*.mjs`는
 * 그전에도 검사되지 않았다. 범위를 넓히는 것은 이행과 별개 판단이라 하지 않는다.
 */
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    /**
     * `eslint-config-next` 16이 `eslint-plugin-react-hooks`를 **5.2.0 → 7.1.1**로 올린다.
     * v7 recommended에 아래 두 규칙이 새로 들어왔고 기본값이 `error`다.
     * 이 저장소에는 그 규칙에 걸리는 코드가 12곳 있는데 **전부 이행 이전부터 있던 것**이다 —
     * 이번 업그레이드가 만든 문제가 아니라, 그전까지 볼 규칙이 없었을 뿐이다.
     *
     * 끄지 않고 `warn`으로 낮춘다. 근거:
     *   - 고치려면 `MapPanel`·`LocationPickerMap`의 "렌더 중 ref 갱신"(이펙트 의존성을
     *     줄이려고 일부러 쓴, 주석까지 달린 패턴)과 setState-in-effect 3곳을 다시 짜야 한다.
     *     이번 작업 범위(프레임워크 이행)를 벗어나고 동작을 바꿀 위험이 있다.
     *   - 지도는 Google Cloud 결제 오류로 실동작 확인이 불가능해, 지금 고치면 검증할 수 없다.
     * `off`가 아니라 `warn`이므로 12건은 매 실행마다 그대로 출력된다. 숨기지 않는다.
     *
     * 후속 과제로 `docs/PROJECT_STATUS.md` §20에 남겼다.
     */
    rules: {
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // eslint-config-next의 기본 무시 목록. globalIgnores를 쓰면 기본값이 대체되므로 다시 적는다.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

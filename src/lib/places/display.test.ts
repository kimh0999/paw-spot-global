import { describe, expect, it } from "vitest";

import { showsVaccinationRow } from "@/lib/places/display";

/**
 * 확인되지 않은 증빙 조건을 "매장 확인 필요"로 채우면 확인된 조건과 같은 무게로 읽힌다.
 * 행을 만들지 않는 판단만 여기서 하고, 화면은 이 결과를 그대로 따른다.
 */
describe("예방접종 증빙 요약 행", () => {
  it.each(["required", "not_required"])("확인된 조건(%s)은 보여준다", (policy) => {
    expect(showsVaccinationRow(policy)).toBe(true);
  });

  // UNKNOWN을 "필요 없음"으로 바꾸지 않는다 — 행 자체를 만들지 않을 뿐이다.
  it("확인되지 않은 조건은 행을 만들지 않는다", () => {
    expect(showsVaccinationRow("unknown")).toBe(false);
  });

  it.each([null, undefined])("값이 없으면(%s) 행을 만들지 않는다", (policy) => {
    expect(showsVaccinationRow(policy)).toBe(false);
  });
});

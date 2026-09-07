import { describe, expect, it } from "vitest";

import {
  RECHECK_AFTER_DAYS,
  daysSinceVerified,
  needsRecheck,
  showsVaccinationRow,
} from "@/lib/places/display";

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

/**
 * 결정 D-02 — 재확인 임계는 **90일 하나**다. 8주(56일) 임계와 중간 경고 단계는 폐기했다.
 *
 * 경계는 "90일 이상 지났을 때"다(`DESIGN.md` §6). 시각을 고정해 89·90·91일을 직접 짚는다.
 */
const NOW = new Date(2026, 8, 6); // 2026.09.06

/** NOW에서 `days`일 전 날짜를 `YYYY.MM.DD` 문자열로. */
function verifiedDaysAgo(days: number): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() - days);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}.${m}.${day}`;
}

describe("재확인 필요 판정 (90일)", () => {
  it("임계는 90일 하나뿐이다", () => {
    expect(RECHECK_AFTER_DAYS).toBe(90);
  });

  it("89일은 아직 재확인 대상이 아니다", () => {
    expect(needsRecheck(verifiedDaysAgo(89), NOW)).toBe(false);
  });

  // 경계가 어긋나기 가장 쉬운 지점이라 정확히 90일을 따로 짚는다.
  it("정확히 90일이면 재확인 대상이다", () => {
    expect(needsRecheck(verifiedDaysAgo(90), NOW)).toBe(true);
  });

  it("91일은 재확인 대상이다", () => {
    expect(needsRecheck(verifiedDaysAgo(91), NOW)).toBe(true);
  });

  // 폐기한 8주(56일) 임계가 되살아나면 여기서 걸린다.
  it("56일에는 배지를 띄우지 않는다", () => {
    expect(needsRecheck(verifiedDaysAgo(56), NOW)).toBe(false);
  });

  it("확인일이 없으면 최근 확인된 것으로 보지 않는다", () => {
    expect(needsRecheck(null, NOW)).toBe(true);
  });

  it("읽을 수 없는 확인일도 최근 확인된 것으로 보지 않는다", () => {
    expect(needsRecheck("어제", NOW)).toBe(true);
    expect(needsRecheck("2026.13", NOW)).toBe(true);
  });

  it("미래 날짜는 방금 확인한 것으로 본다 (기존 정책)", () => {
    expect(needsRecheck(verifiedDaysAgo(-10), NOW)).toBe(false);
  });
});

describe("경과 일수 계산 — 재확인 판정과 분리", () => {
  it("지난 일수를 그대로 센다", () => {
    expect(daysSinceVerified(verifiedDaysAgo(0), NOW)).toBe(0);
    expect(daysSinceVerified(verifiedDaysAgo(90), NOW)).toBe(90);
  });

  it("확인일을 알 수 없으면 0이 아니라 null이다", () => {
    expect(daysSinceVerified(null, NOW)).toBeNull();
    expect(daysSinceVerified("어제", NOW)).toBeNull();
  });

  it("미래 날짜는 0일로 눕힌다", () => {
    expect(daysSinceVerified(verifiedDaysAgo(-5), NOW)).toBe(0);
  });
});

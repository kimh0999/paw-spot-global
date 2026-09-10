import { describe, expect, it } from "vitest";

import { VET_RECHECK_AFTER_DAYS } from "./constants";
import {
  isServiceConfirmed,
  resolveVetItem,
  serviceSnapshot,
  vetNeedsRecheck,
  type VetVerificationRecord,
} from "./verification";

/**
 * 확인 근거는 **항목별**이고 **값에 묶인다** (D-17), 재확인 경계는 **30일**이다 (D-18).
 * 이 두 규칙이 무너지면 확인하지 않은 정보가 확인된 것처럼 표시된다.
 */

const NOW = new Date("2026-09-10T00:00:00Z");

function record(overrides: Partial<VetVerificationRecord> = {}): VetVerificationRecord {
  return {
    target: "ENGLISH_SUPPORT",
    method: "PHONE",
    verifiedAt: new Date("2026-09-01T00:00:00Z"),
    sourceUrl: null,
    note: null,
    verifiedValue: "AVAILABLE",
    ...overrides,
  };
}

describe("vetNeedsRecheck — 30일 경계 (D-18)", () => {
  it("29일은 아직 유효하다", () => {
    const at = new Date(NOW.getTime() - 29 * 24 * 60 * 60 * 1000);
    expect(vetNeedsRecheck(at, NOW)).toBe(false);
  });

  it("정확히 30일째부터 재확인이 필요하다", () => {
    const at = new Date(NOW.getTime() - VET_RECHECK_AFTER_DAYS * 24 * 60 * 60 * 1000);
    expect(vetNeedsRecheck(at, NOW)).toBe(true);
  });

  it("미래 시각은 0일로 본다", () => {
    const at = new Date(NOW.getTime() + 24 * 60 * 60 * 1000);
    expect(vetNeedsRecheck(at, NOW)).toBe(false);
  });
});

describe("resolveVetItem — 값에 묶인 확인 근거 (D-17)", () => {
  it("확인한 값과 현재 값이 같으면 확인됨이다", () => {
    const item = resolveVetItem("ENGLISH_SUPPORT", "AVAILABLE", [record()], NOW);
    expect(item.confirmed).toBe(true);
    expect(item.needsRecheck).toBe(false);
    expect(item.evidence).not.toBeNull();
  });

  /**
   * 이것이 핵심이다. "불가"를 확인한 기록이 남아 있는데 값을 "가능"으로 고치면,
   * 그 기록은 새 값을 검증하지 않는다.
   */
  it("값을 고치면 이전 기록은 새 값을 검증하지 않는다", () => {
    const item = resolveVetItem(
      "ENGLISH_SUPPORT",
      "AVAILABLE",
      [record({ verifiedValue: "UNAVAILABLE" })],
      NOW,
    );
    expect(item.confirmed).toBe(false);
    expect(item.evidence).toBeNull();
    expect(item.staleByValueChange).toBe(true);
  });

  it("기록이 없으면 미확인이고 값 변경과 구분된다", () => {
    const item = resolveVetItem("ENGLISH_SUPPORT", "AVAILABLE", [], NOW);
    expect(item.confirmed).toBe(false);
    expect(item.staleByValueChange).toBe(false);
    expect(item.evidence).toBeNull();
  });

  it("다른 항목의 기록은 이 항목을 확인해 주지 않는다", () => {
    const item = resolveVetItem(
      "ENGLISH_SUPPORT",
      "AVAILABLE",
      [record({ target: "BASIC", verifiedValue: "AVAILABLE" })],
      NOW,
    );
    expect(item.evidence).toBeNull();
  });

  it("값이 같아도 30일이 지나면 재확인 필요이며 이력은 남는다", () => {
    const at = new Date(NOW.getTime() - 40 * 24 * 60 * 60 * 1000);
    const item = resolveVetItem("ENGLISH_SUPPORT", "AVAILABLE", [record({ verifiedAt: at })], NOW);
    expect(item.confirmed).toBe(false);
    expect(item.needsRecheck).toBe(true);
    expect(item.evidence).not.toBeNull();
  });

  it("같은 값을 확인한 기록이 여러 건이면 가장 최근 것을 쓴다", () => {
    const older = record({ verifiedAt: new Date("2026-08-01T00:00:00Z") });
    const newer = record({ verifiedAt: new Date("2026-09-05T00:00:00Z") });
    const item = resolveVetItem("ENGLISH_SUPPORT", "AVAILABLE", [older, newer], NOW);
    expect(item.evidence?.verifiedAt).toEqual(newer.verifiedAt);
  });
});

describe("serviceSnapshot — 조건 문구는 조건부일 때만 값의 일부다", () => {
  it("조건부는 조건 문구가 바뀌면 다른 값이 된다", () => {
    expect(serviceSnapshot("CONDITIONAL", "평일 오전만")).not.toBe(
      serviceSnapshot("CONDITIONAL", "주말만"),
    );
  });

  it("가능·불가는 조건 문구가 화면에 나오지 않으므로 값에 넣지 않는다", () => {
    expect(serviceSnapshot("AVAILABLE", "남은 메모")).toBe(serviceSnapshot("AVAILABLE", null));
  });
});

describe("isServiceConfirmed — 안내 확인 필터의 통과 조건 (D-19)", () => {
  const confirmed = resolveVetItem("ENGLISH_SUPPORT", "AVAILABLE", [record()], NOW);
  const overdue = resolveVetItem(
    "ENGLISH_SUPPORT",
    "AVAILABLE",
    [record({ verifiedAt: new Date("2026-07-01T00:00:00Z") })],
    NOW,
  );
  const none = resolveVetItem("ENGLISH_SUPPORT", "AVAILABLE", [], NOW);

  it("가능·조건부는 유효한 근거가 있으면 통과한다", () => {
    expect(isServiceConfirmed("AVAILABLE", confirmed)).toBe(true);
    expect(isServiceConfirmed("CONDITIONAL", confirmed)).toBe(true);
  });

  it("불가·미확인은 근거가 있어도 통과하지 않는다", () => {
    expect(isServiceConfirmed("UNAVAILABLE", confirmed)).toBe(false);
    expect(isServiceConfirmed("UNKNOWN", confirmed)).toBe(false);
  });

  it("재확인 기한이 지났거나 근거가 없으면 통과하지 않는다", () => {
    expect(isServiceConfirmed("AVAILABLE", overdue)).toBe(false);
    expect(isServiceConfirmed("AVAILABLE", none)).toBe(false);
  });
});

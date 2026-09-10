import { describe, expect, it } from "vitest";

import { basicSnapshot, canPublishClinic, findPublishBlockers } from "./publish";
import type { VetVerificationRecord } from "./verification";

/**
 * 공개 기준은 **기본 정보에만** 걸린다 (D-20).
 * 영어 응대·야간 진료가 미확인이라고 연락처까지 숨기면 사용자가 병원에 전화할 길이 사라진다.
 */

const NOW = new Date("2026-09-10T00:00:00Z");

const CLINIC = {
  nameKr: "테스트동물병원",
  address: "대전 서구 둔산동 1",
  phone: "042-000-0000",
};

function basicRecord(overrides: Partial<VetVerificationRecord> = {}): VetVerificationRecord {
  return {
    target: "BASIC",
    method: "PHONE",
    verifiedAt: new Date("2026-09-01T00:00:00Z"),
    sourceUrl: null,
    note: null,
    verifiedValue: basicSnapshot(CLINIC),
    ...overrides,
  };
}

describe("공개 기준 (D-20)", () => {
  it("이름·주소·전화와 기본 정보 확인 근거가 있으면 공개할 수 있다", () => {
    expect(canPublishClinic({ ...CLINIC, records: [basicRecord()] }, NOW)).toBe(true);
  });

  it("영어 응대·야간 진료가 미확인이어도 공개를 막지 않는다", () => {
    // 서비스 항목 기록이 하나도 없는 상태다.
    expect(findPublishBlockers({ ...CLINIC, records: [basicRecord()] }, NOW)).toEqual([]);
  });

  it("기본 정보 확인 근거가 없으면 막는다", () => {
    expect(findPublishBlockers({ ...CLINIC, records: [] }, NOW)).toContain("basicVerification");
  });

  it("기본 정보를 고친 뒤 다시 확인하지 않았으면 막는다", () => {
    const blockers = findPublishBlockers(
      { ...CLINIC, address: "대전 서구 둔산동 2", records: [basicRecord()] },
      NOW,
    );
    expect(blockers).toContain("basicVerification");
  });

  it("이름·주소·전화가 비면 각각 막는다", () => {
    const blockers = findPublishBlockers(
      { nameKr: " ", address: "", phone: "", records: [basicRecord()] },
      NOW,
    );
    expect(blockers).toEqual(
      expect.arrayContaining(["nameKr", "address", "phone"]),
    );
  });

  /**
   * 재확인 기한이 지난 것만으로는 공개를 막지 않는다 (D-18).
   * 병원을 자동으로 숨기지 않고 목록에서 상태를 보여주는 것이 방침이다.
   */
  it("확인 기한이 지나도 공개 자체는 막지 않는다", () => {
    const stale = basicRecord({ verifiedAt: new Date("2026-06-01T00:00:00Z") });
    expect(canPublishClinic({ ...CLINIC, records: [stale] }, NOW)).toBe(true);
  });
});

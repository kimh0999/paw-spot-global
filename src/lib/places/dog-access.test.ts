import { describe, expect, it } from "vitest";

import { resolveDogAccess, type SpaceRecord } from "./dog-access";
import { EMPTY_POLICY_DETAILS, readPolicyDetails, type PolicyDetails } from "./policy-details";
import type { PlaceListItem } from "@/types/place";

function details(spaceExceptions: SpaceRecord[]): PolicyDetails {
  return { ...EMPTY_POLICY_DETAILS, spaceExceptions };
}

const indoorBlockedAll: SpaceRecord = {
  area: "INDOOR",
  appliesToSize: "ALL",
  access: "NOT_ALLOWED",
};
const indoorBlockedLarge: SpaceRecord = {
  area: "INDOOR",
  appliesToSize: "LARGE",
  access: "NOT_ALLOWED",
};
const terraceAllowedAll: SpaceRecord = {
  area: "TERRACE",
  appliesToSize: "ALL",
  access: "ALLOWED",
};
const outdoorBlockedAll: SpaceRecord = {
  area: "OUTDOOR",
  appliesToSize: "ALL",
  access: "NOT_ALLOWED",
};
const indoorUnknownAll: SpaceRecord = {
  area: "INDOOR",
  appliesToSize: "ALL",
  access: "UNKNOWN",
};

describe("resolveDogAccess — 세부 정책이 없을 때는 요약 컬럼을 그대로 옮긴다", () => {
  const cases: Array<[PlaceListItem["indoor"], string]> = [
    ["allowed", "allowed"],
    ["outdoor_only", "outdoorOnly"],
    ["partial_area", "partialArea"],
    ["not_allowed", "notAllowed"],
    ["unknown", "unknown"],
    [null, "unknown"],
  ];

  it.each(cases)("indoor=%s → key=%s", (indoor, expected) => {
    expect(resolveDogAccess(indoor, null).key).toBe(expected);
  });

  it("요약 컬럼 원본을 함께 돌려준다", () => {
    expect(resolveDogAccess("outdoor_only", null).summary).toBe("outdoor_only");
    expect(resolveDogAccess(null, null).summary).toBe("unknown");
  });
});

describe("resolveDogAccess — 실내 불가 · 야외 미확인", () => {
  it("UNKNOWN + 전체 반려견 실내 불가 + 야외 정보 없음이면 복합 상태다", () => {
    const facts = resolveDogAccess("unknown", details([indoorBlockedAll]));

    expect(facts.key).toBe("indoorBlockedOutdoorUnconfirmed");
    expect(facts.conflictingRecords).toEqual([]);
  });

  it("확인된 실내 불가 사실을 구역 기록으로 보존한다", () => {
    const facts = resolveDogAccess("unknown", details([indoorBlockedAll]));

    expect(facts.areaRecords).toEqual([indoorBlockedAll]);
  });

  it("대형견만 실내 불가면 복합 상태가 아니다 — 전체 반려견 제한으로 넓히지 않는다", () => {
    const facts = resolveDogAccess("unknown", details([indoorBlockedLarge]));

    expect(facts.key).toBe("unknown");
    expect(facts.areaRecords).toEqual([indoorBlockedLarge]);
  });

  it("야외에 확인된 출입 정보가 있으면 복합 상태를 쓰지 않는다 (허용)", () => {
    const facts = resolveDogAccess("unknown", details([indoorBlockedAll, terraceAllowedAll]));

    expect(facts.key).toBe("unknown");
    expect(facts.areaRecords).toEqual([indoorBlockedAll, terraceAllowedAll]);
  });

  it("야외에 확인된 출입 정보가 있으면 복합 상태를 쓰지 않는다 (불가)", () => {
    const facts = resolveDogAccess("unknown", details([indoorBlockedAll, outdoorBlockedAll]));

    expect(facts.key).toBe("unknown");
  });

  it("실내·야외 모두 불가여도 장소 전체 NOT_ALLOWED로 바꾸지 않는다", () => {
    const facts = resolveDogAccess("unknown", details([indoorBlockedAll, outdoorBlockedAll]));

    expect(facts.key).not.toBe("notAllowed");
    expect(facts.areaRecords).toHaveLength(2);
  });

  it("access가 UNKNOWN인 기록은 불가의 근거로 쓰지 않는다", () => {
    const facts = resolveDogAccess("unknown", details([indoorUnknownAll]));

    expect(facts.key).toBe("unknown");
    expect(facts.areaRecords).toEqual([]);
  });

  it("UNKNOWN 기록만으로는 야외 정보가 있다고 보지 않는다", () => {
    const facts = resolveDogAccess(
      "unknown",
      details([indoorBlockedAll, { area: "TERRACE", appliesToSize: "ALL", access: "UNKNOWN" }]),
    );

    expect(facts.key).toBe("indoorBlockedOutdoorUnconfirmed");
  });
});

describe("resolveDogAccess — 명백한 정보 불일치", () => {
  it("ALLOWED인데 전체 반려견 실내 불가 기록이 있으면 충돌이다", () => {
    const facts = resolveDogAccess("allowed", details([indoorBlockedAll]));

    expect(facts.key).toBe("conflict");
    expect(facts.conflictingRecords).toEqual([indoorBlockedAll]);
  });

  it("ALLOWED + 대형견만 실내 불가는 정상적인 크기 예외다", () => {
    const facts = resolveDogAccess("allowed", details([indoorBlockedLarge]));

    expect(facts.key).toBe("allowed");
    expect(facts.conflictingRecords).toEqual([]);
  });

  it("ALLOWED + 특정 층만 불가는 정상적인 세부 구역 예외다", () => {
    const floorBlocked: SpaceRecord = {
      area: "FLOOR",
      floor: 2,
      appliesToSize: "ALL",
      access: "NOT_ALLOWED",
    };
    const facts = resolveDogAccess("allowed", details([floorBlocked]));

    expect(facts.key).toBe("allowed");
    expect(facts.conflictingRecords).toEqual([]);
  });

  it("장소 전체 불가인데 전체 반려견 허용 구역이 있으면 충돌이다", () => {
    const facts = resolveDogAccess("not_allowed", details([terraceAllowedAll]));

    expect(facts.key).toBe("conflict");
  });

  it("실외만 가능인데 야외가 전체 불가면 충돌이다", () => {
    const facts = resolveDogAccess("outdoor_only", details([outdoorBlockedAll]));

    expect(facts.key).toBe("conflict");
  });

  it("일부 구역 가능은 구역 기록과 어긋날 수 없다", () => {
    const facts = resolveDogAccess("partial_area", details([indoorBlockedAll]));

    expect(facts.key).toBe("partialArea");
    expect(facts.conflictingRecords).toEqual([]);
  });
});

describe("resolveDogAccess — policyDetails가 없거나 깨졌을 때", () => {
  it("null이면 요약 컬럼만 쓴다", () => {
    expect(resolveDogAccess("allowed", null).key).toBe("allowed");
    expect(resolveDogAccess("allowed", null).areaRecords).toEqual([]);
  });

  it("형식이 깨진 JSON은 readPolicyDetails가 null로 걸러 내고 요약 컬럼만 남는다", () => {
    const read = readPolicyDetails({ version: 1, spaceExceptions: "구조가 아님" });

    expect(read.status).toBe("invalid");
    expect(resolveDogAccess("unknown", read.value).key).toBe("unknown");
  });

  it("깨진 값을 실내 불가로 읽지 않는다", () => {
    const read = readPolicyDetails({ nope: true });

    expect(resolveDogAccess("allowed", read.value).key).toBe("allowed");
  });
});

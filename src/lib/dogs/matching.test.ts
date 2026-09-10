import { describe, expect, it } from "vitest";

import {
  getAllowedSizes,
  matchDogToPlace,
  matchDogsToPlace,
  resolveWorstMatch,
  type MatchablePlace,
} from "@/lib/dogs/matching";
import type { PolicyDetails } from "@/lib/places/policy-details";

const place = (overrides: Partial<MatchablePlace> = {}): MatchablePlace => ({
  indoor: "allowed",
  maxDogSize: "large",
  breedRestrictions: null,
  policyDetails: null,
  ...overrides,
});

/** 구역 기록 하나만 담은 상세 조건. 나머지 그룹은 판정과 무관해 비워 둔다. */
const withSpaceException = (
  record: PolicyDetails["spaceExceptions"][number],
): PolicyDetails =>
  ({
    version: 1,
    entry: { vaccinationCompletionPolicy: "UNKNOWN" },
    preparation: [],
    handling: [],
    admission: [],
    hygiene: [],
    behaviorRestrictions: [],
    spaceExceptions: [record],
    uncertainties: [],
  }) as unknown as PolicyDetails;

const INDOOR_BLOCKED_FOR_ALL = withSpaceException({
  area: "INDOOR",
  access: "NOT_ALLOWED",
  appliesToSize: "ALL",
  note: null,
} as PolicyDetails["spaceExceptions"][number]);

describe("getAllowedSizes", () => {
  it("상한값을 허용 크기 목록으로 펼친다", () => {
    expect(getAllowedSizes("small")).toEqual(["SMALL"]);
    expect(getAllowedSizes("medium")).toEqual(["SMALL", "MEDIUM"]);
    expect(getAllowedSizes("large")).toEqual(["SMALL", "MEDIUM", "LARGE"]);
  });

  it("미확인과 조건 없음은 빈 목록이다", () => {
    expect(getAllowedSizes("unknown")).toEqual([]);
    expect(getAllowedSizes(null)).toEqual([]);
  });
});

describe("matchDogToPlace", () => {
  it("SMALL + [SMALL, MEDIUM] → MATCH", () => {
    expect(
      matchDogToPlace({ size: "SMALL" }, place({ maxDogSize: "medium" })),
    ).toEqual({ status: "MATCH", reason: null });
  });

  it("LARGE + [SMALL] → MISMATCH", () => {
    expect(
      matchDogToPlace({ size: "LARGE" }, place({ maxDogSize: "small" })),
    ).toEqual({ status: "MISMATCH", reason: "SIZE_LIMIT" });
  });

  // maxDogSize는 허용 크기 하나가 아니라 "이 크기까지 허용"이라는 상한값이다.
  // 개발명세서 v2가 allowedSizes[] 대신 단일 상한을 택한 근거이므로 경계를 모두 고정한다.
  const sizeMatrix = [
    { limit: "small", dog: "SMALL", expected: "MATCH" },
    { limit: "small", dog: "MEDIUM", expected: "MISMATCH" },
    { limit: "small", dog: "LARGE", expected: "MISMATCH" },
    { limit: "medium", dog: "SMALL", expected: "MATCH" },
    { limit: "medium", dog: "MEDIUM", expected: "MATCH" },
    { limit: "medium", dog: "LARGE", expected: "MISMATCH" },
    { limit: "large", dog: "SMALL", expected: "MATCH" },
    { limit: "large", dog: "MEDIUM", expected: "MATCH" },
    { limit: "large", dog: "LARGE", expected: "MATCH" },
  ] as const;

  for (const { limit, dog, expected } of sizeMatrix) {
    it(`maxDogSize=${limit} + ${dog} → ${expected}`, () => {
      const result = matchDogToPlace({ size: dog }, place({ maxDogSize: limit }));
      expect(result.status).toBe(expected);
      expect(result.reason).toBe(expected === "MATCH" ? null : "SIZE_LIMIT");
    });
  }

  it("PlaceCondition이 없으면 CHECK_REQUIRED / UNKNOWN_CONDITION", () => {
    expect(
      matchDogToPlace({ size: "SMALL" }, place({ indoor: null, maxDogSize: null })),
    ).toEqual({ status: "CHECK_REQUIRED", reason: "UNKNOWN_CONDITION" });
  });

  it("허용 크기가 비어 있으면 CHECK_REQUIRED / UNKNOWN_CONDITION", () => {
    expect(
      matchDogToPlace({ size: "SMALL" }, place({ maxDogSize: "unknown" })),
    ).toEqual({ status: "CHECK_REQUIRED", reason: "UNKNOWN_CONDITION" });
  });

  /**
   * 동반 가능 여부가 미확인이면 **불가도 일치도 아니다.**
   * 예전에는 MATCH(`조건 일치`)를 단언해서, 같은 장소를 두고 상세·즐겨찾기는
   * `동반 조건 미확인`이라고 하는데 지도 목록만 `조건 일치`라고 말했다.
   */
  it("동반 가능 여부가 미확인이면 동반 불가도 조건 일치도 아니다", () => {
    expect(
      matchDogToPlace({ size: "SMALL" }, place({ indoor: "unknown" })),
    ).toEqual({ status: "CHECK_REQUIRED", reason: "UNKNOWN_CONDITION" });
  });

  it("구역 기록이 실내 전체 불가인데 요약이 미확인이면 조건 일치로 단언하지 않는다", () => {
    expect(
      matchDogToPlace(
        { size: "SMALL" },
        place({ indoor: "unknown", policyDetails: INDOOR_BLOCKED_FOR_ALL }),
      ),
    ).toEqual({ status: "CHECK_REQUIRED", reason: "UNKNOWN_CONDITION" });
  });

  it("요약과 구역 기록이 어긋나면 조건 일치로 단언하지 않는다", () => {
    // 요약은 `실내 가능`인데 구역 기록은 `실내 전체 불가` — 어느 쪽도 사실로 확정하지 않는다.
    expect(
      matchDogToPlace(
        { size: "SMALL" },
        place({ indoor: "allowed", policyDetails: INDOOR_BLOCKED_FOR_ALL }),
      ),
    ).toEqual({ status: "CHECK_REQUIRED", reason: "UNKNOWN_CONDITION" });
  });

  it("요약과 구역 기록이 어긋나면 동반 불가도 단언하지 않는다", () => {
    // 요약은 `동반 불가`인데 구역 기록은 전체 반려견 실내 허용이다.
    const indoorAllowedForAll = withSpaceException({
      area: "INDOOR",
      access: "ALLOWED",
      appliesToSize: "ALL",
      note: null,
    } as PolicyDetails["spaceExceptions"][number]);

    expect(
      matchDogToPlace(
        { size: "SMALL" },
        place({ indoor: "not_allowed", policyDetails: indoorAllowedForAll }),
      ),
    ).toEqual({ status: "CHECK_REQUIRED", reason: "UNKNOWN_CONDITION" });
  });

  it("크기 상한이 확인됐다면 동반 여부가 미확인이어도 크기 제한은 그대로 단언한다", () => {
    expect(
      matchDogToPlace(
        { size: "LARGE" },
        place({ indoor: "unknown", maxDogSize: "small" }),
      ),
    ).toEqual({ status: "MISMATCH", reason: "SIZE_LIMIT" });
  });

  it("실외만 가능한 장소는 동반 불가가 아니다", () => {
    expect(
      matchDogToPlace({ size: "SMALL" }, place({ indoor: "outdoor_only" })),
    ).toEqual({ status: "MATCH", reason: null });
  });

  it("일부 구역만 가능한 장소도 동반 불가가 아니다", () => {
    expect(
      matchDogToPlace({ size: "SMALL" }, place({ indoor: "partial_area" })),
    ).toEqual({ status: "MATCH", reason: null });
  });

  it("크기는 허용되지만 견종 제한이 있으면 CHECK_REQUIRED / BREED_RESTRICTION", () => {
    expect(
      matchDogToPlace(
        { size: "SMALL" },
        place({ maxDogSize: "large", breedRestrictions: "대형견 불가" }),
      ),
    ).toEqual({ status: "CHECK_REQUIRED", reason: "BREED_RESTRICTION" });
  });

  it("크기가 아예 허용되지 않으면 견종 제한보다 SIZE_LIMIT이 먼저다", () => {
    expect(
      matchDogToPlace(
        { size: "LARGE" },
        place({ maxDogSize: "small", breedRestrictions: "대형견 불가" }),
      ),
    ).toEqual({ status: "MISMATCH", reason: "SIZE_LIMIT" });
  });

  it("크기 미확인 + 견종 제한이면 더 구체적인 BREED_RESTRICTION을 쓴다", () => {
    expect(
      matchDogToPlace(
        { size: "SMALL" },
        place({ maxDogSize: "unknown", breedRestrictions: "대형견 불가" }),
      ),
    ).toEqual({ status: "CHECK_REQUIRED", reason: "BREED_RESTRICTION" });
  });

  it("빈 문자열 견종 제한은 제한으로 보지 않는다", () => {
    expect(
      matchDogToPlace({ size: "SMALL" }, place({ breedRestrictions: "   " })),
    ).toEqual({ status: "MATCH", reason: null });
  });

  // 동반 불가는 크기·견종보다 앞선다. 크기가 맞는다고 초록색 "조건 일치"를 보여주면
  // 갈 수 없는 장소를 갈 수 있다고 단언하게 된다 (DESIGN.md §6 blocked).
  it("동반 불가 + 크기 허용 → MISMATCH / PET_NOT_ALLOWED", () => {
    expect(
      matchDogToPlace(
        { size: "SMALL" },
        place({ indoor: "not_allowed", maxDogSize: "large" }),
      ),
    ).toEqual({ status: "MISMATCH", reason: "PET_NOT_ALLOWED" });
  });

  it("동반 불가 + 크기 초과 → MISMATCH / PET_NOT_ALLOWED", () => {
    expect(
      matchDogToPlace(
        { size: "LARGE" },
        place({ indoor: "not_allowed", maxDogSize: "small" }),
      ),
    ).toEqual({ status: "MISMATCH", reason: "PET_NOT_ALLOWED" });
  });

  it("동반 불가 + 크기 미확인 → MISMATCH / PET_NOT_ALLOWED", () => {
    expect(
      matchDogToPlace(
        { size: "SMALL" },
        place({
          indoor: "not_allowed",
          maxDogSize: "unknown",
          breedRestrictions: "대형견 불가",
        }),
      ),
    ).toEqual({ status: "MISMATCH", reason: "PET_NOT_ALLOWED" });
  });
});

describe("matchDogsToPlace", () => {
  it("한 마리라도 크기 초과이면 전체 MISMATCH / SIZE_LIMIT", () => {
    expect(
      matchDogsToPlace(
        [{ size: "SMALL" }, { size: "LARGE" }],
        place({ maxDogSize: "small" }),
      ),
    ).toEqual({ status: "MISMATCH", reason: "SIZE_LIMIT" });
  });

  it("MISMATCH는 없고 CHECK_REQUIRED가 있으면 전체 CHECK_REQUIRED", () => {
    expect(
      matchDogsToPlace(
        [{ size: "SMALL" }, { size: "MEDIUM" }],
        place({ maxDogSize: "large", breedRestrictions: "대형견 불가" }),
      ),
    ).toEqual({ status: "CHECK_REQUIRED", reason: "BREED_RESTRICTION" });
  });

  // 장소 조건은 모든 반려견에 똑같이 걸리므로, 반려견마다 갈리는 요인은 크기뿐이다.
  // 한 마리가 CHECK_REQUIRED여도 다른 한 마리가 MISMATCH면 전체는 MISMATCH다.
  it("CHECK_REQUIRED와 MISMATCH가 섞이면 전체 MISMATCH", () => {
    expect(
      matchDogsToPlace(
        [{ size: "SMALL" }, { size: "LARGE" }],
        place({ maxDogSize: "small", breedRestrictions: "대형견 불가" }),
      ),
    ).toEqual({ status: "MISMATCH", reason: "SIZE_LIMIT" });
  });

  it("모두 MATCH일 때만 MATCH", () => {
    expect(
      matchDogsToPlace(
        [{ size: "SMALL" }, { size: "MEDIUM" }, { size: "LARGE" }],
        place({ maxDogSize: "large" }),
      ),
    ).toEqual({ status: "MATCH", reason: null });
  });

  it("동반 불가 장소는 모든 반려견에 대해 PET_NOT_ALLOWED가 최우선이다", () => {
    expect(
      matchDogsToPlace(
        [{ size: "SMALL" }, { size: "LARGE" }],
        place({ indoor: "not_allowed", maxDogSize: "small" }),
      ),
    ).toEqual({ status: "MISMATCH", reason: "PET_NOT_ALLOWED" });
  });

  it("대조할 반려견이 없으면 판정하지 않는다", () => {
    expect(matchDogsToPlace([], place())).toBeNull();
  });
});

describe("resolveWorstMatch", () => {
  it("MISMATCH가 가장 강하다", () => {
    expect(
      resolveWorstMatch([
        { status: "MATCH", reason: null },
        { status: "CHECK_REQUIRED", reason: "UNKNOWN_CONDITION" },
        { status: "MISMATCH", reason: "SIZE_LIMIT" },
      ]),
    ).toEqual({ status: "MISMATCH", reason: "SIZE_LIMIT" });
  });

  it("MATCH와 CHECK_REQUIRED가 섞이면 CHECK_REQUIRED", () => {
    const mixed = [
      { status: "MATCH", reason: null },
      { status: "CHECK_REQUIRED", reason: "UNKNOWN_CONDITION" },
    ] as const;

    expect(resolveWorstMatch(mixed)).toEqual({
      status: "CHECK_REQUIRED",
      reason: "UNKNOWN_CONDITION",
    });
    expect(resolveWorstMatch([...mixed].reverse())).toEqual({
      status: "CHECK_REQUIRED",
      reason: "UNKNOWN_CONDITION",
    });
  });

  it("모두 MATCH일 때만 MATCH", () => {
    expect(
      resolveWorstMatch([
        { status: "MATCH", reason: null },
        { status: "MATCH", reason: null },
      ]),
    ).toEqual({ status: "MATCH", reason: null });
  });

  it("같은 상태에서는 사유 우선순위가 높은 쪽을 남긴다", () => {
    expect(
      resolveWorstMatch([
        { status: "MISMATCH", reason: "SIZE_LIMIT" },
        { status: "MISMATCH", reason: "PET_NOT_ALLOWED" },
      ]),
    ).toEqual({ status: "MISMATCH", reason: "PET_NOT_ALLOWED" });

    expect(
      resolveWorstMatch([
        { status: "CHECK_REQUIRED", reason: "UNKNOWN_CONDITION" },
        { status: "CHECK_REQUIRED", reason: "BREED_RESTRICTION" },
      ]),
    ).toEqual({ status: "CHECK_REQUIRED", reason: "BREED_RESTRICTION" });
  });

  it("빈 목록은 판정하지 않는다", () => {
    expect(resolveWorstMatch([])).toBeNull();
  });
});

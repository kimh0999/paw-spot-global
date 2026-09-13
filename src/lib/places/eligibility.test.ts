import { describe, expect, it } from "vitest";

import {
  getPlaceConditionBreakdown,
  getVisitEligibility,
  getVisitStatus,
  toDogSizeFilter,
} from "@/lib/places/eligibility";
import type { SpaceRecord } from "@/lib/places/dog-access";
import { EMPTY_POLICY_DETAILS, type PolicyDetails } from "@/lib/places/policy-details";
import type { PlaceListItem } from "@/types/place";

function withSpace(spaceExceptions: SpaceRecord[]): PolicyDetails {
  return { ...EMPTY_POLICY_DETAILS, spaceExceptions };
}

const indoorBlockedAll: SpaceRecord = {
  area: "INDOOR",
  appliesToSize: "ALL",
  access: "NOT_ALLOWED",
};

/**
 * 조건 해석의 단일 출처인 `eligibility.ts`의 회귀 테스트.
 *
 * 표시 계층을 손대기 전에 화면이 무엇을 단언하는지 붙잡아 두는 것이 목적이다.
 * 확인되지 않은 조건을 통과로 치지 않는다는 원칙(DESIGN.md §3.3)을 함께 고정한다.
 */

function place(overrides: Partial<PlaceListItem> = {}): PlaceListItem {
  return {
    id: "place-1",
    nameKr: "테스트 카페",
    nameEn: null,
    category: "cafe",
    address: "대전시 어딘가",
    phone: null,
    location: null,
    distanceMeters: null,
    thumbnailUrl: null,
    indoor: "unknown",
    carrierStrollerPolicy: "unknown",
    maxDogSize: "unknown",
    leash: "unknown",
    muzzle: "unknown",
    policyDetails: null,
    breedRestrictions: null,
    caution: null,
    latestVerifiedAt: null,
    verificationMethod: null,
    ...overrides,
  };
}

/** 조건이 모두 확실히 허용된 장소. `available` 판정의 유일한 조합이다. */
function fullyAllowedPlace(): PlaceListItem {
  return place({
    indoor: "allowed",
    carrierStrollerPolicy: "not_required",
    maxDogSize: "large",
    leash: "not_required",
    muzzle: "not_required",
  });
}

describe("toDogSizeFilter", () => {
  it("DB enum을 필터 값으로 옮긴다", () => {
    expect(toDogSizeFilter("SMALL")).toBe("small");
    expect(toDogSizeFilter("MEDIUM")).toBe("medium");
    expect(toDogSizeFilter("LARGE")).toBe("large");
  });

  it("모르는 값은 all로 떨어뜨린다", () => {
    expect(toDogSizeFilter("")).toBe("all");
    expect(toDogSizeFilter("HUGE")).toBe("all");
  });
});

describe("getVisitEligibility", () => {
  it("반려견을 고르지 않았으면 판정하지 않는다", () => {
    expect(getVisitEligibility(fullyAllowedPlace(), "all")).toBeNull();
  });

  it("동반 불가는 크기와 무관하게 차단으로 판정한다", () => {
    expect(getVisitEligibility(place({ indoor: "not_allowed", maxDogSize: "large" }), "small"))
      .toEqual({ status: "blocked", messageKey: "dogsNotAllowed" });
  });

  it("상한보다 큰 반려견은 차단한다", () => {
    expect(getVisitEligibility(place({ maxDogSize: "small" }), "large")).toEqual({
      status: "blocked",
      messageKey: "tooLarge",
    });
    expect(getVisitEligibility(place({ maxDogSize: "medium" }), "large")).toEqual({
      status: "blocked",
      messageKey: "tooLarge",
    });
  });

  it("핵심 조건이 확인되고 상한 이내면 방문 가능으로 단언한다", () => {
    expect(getVisitEligibility(fullyAllowedPlace(), "small")).toEqual({
      status: "allowed",
      messageKey: "canVisit",
    });
    expect(
      getVisitEligibility({ ...fullyAllowedPlace(), maxDogSize: "medium" }, "medium"),
    ).toEqual({ status: "allowed", messageKey: "canVisit" });
  });

  it("크기 상한이 확인되지 않으면 단언하지 않는다", () => {
    expect(getVisitEligibility(place({ maxDogSize: "unknown" }), "small")?.status).toBe(
      "unknown",
    );
    expect(getVisitEligibility(place({ maxDogSize: null }), "small")).toEqual({
      status: "unknown",
      messageKey: "sizeUnconfirmed",
    });
  });
});

describe("getPlaceConditionBreakdown", () => {
  // `carrierMeans`는 이동장 문구가 쓸 수단이다. 의무가 없거나 근거가 없으면
  // `unspecified`이고, 그때 문구는 무엇이 되는지 추정하지 않는다(D-21).
  it("미확인과 null은 어느 목록에도 넣지 않는다", () => {
    expect(getPlaceConditionBreakdown(place())).toEqual({
      allowances: [],
      conditions: [],
      carrierMeans: "unspecified",
    });
    expect(
      getPlaceConditionBreakdown(
        place({
          indoor: null,
          carrierStrollerPolicy: null,
          maxDogSize: null,
          leash: null,
          muzzle: null,
        }),
      ),
    ).toEqual({ allowances: [], conditions: [], carrierMeans: "unspecified" });
  });

  it("확실히 허용된 조건만 allowances에 담는다", () => {
    expect(getPlaceConditionBreakdown(fullyAllowedPlace())).toEqual({
      allowances: ["indoorAllowed", "noCarrier", "largeDogs", "noLeash", "noMuzzle"],
      conditions: [],
      carrierMeans: "unspecified",
    });
  });

  it("지켜야 하는 조건을 conditions에 담는다", () => {
    expect(
      getPlaceConditionBreakdown(
        place({
          indoor: "outdoor_only",
          carrierStrollerPolicy: "required_always",
          maxDogSize: "small",
          leash: "required",
          muzzle: "required",
        }),
      ),
    ).toEqual({
      allowances: [],
      conditions: [
        "indoorOutdoorOnly",
        "carrierAlways",
        "sizeSmallOnly",
        "leashRequired",
        "muzzleRequired",
      ],
      // 요약 컬럼은 이동장·케이지·유모차를 한 값에 뭉쳐 담으므로 셋을 구분할 수 없다.
      carrierMeans: "unspecified",
    });
  });

  it("부분 허용 값도 조건으로 분류한다", () => {
    expect(
      getPlaceConditionBreakdown(
        place({
          indoor: "partial_area",
          carrierStrollerPolicy: "required_indoor",
          maxDogSize: "medium",
          leash: "partial_area",
          muzzle: "conditional",
        }),
      ).conditions,
    ).toEqual([
      "indoorPartialArea",
      "carrierIndoor",
      "sizeMediumOnly",
      "leashPartialArea",
      "muzzleConditional",
    ]);
  });

  // 전체 동반 불가는 지켜야 할 조건이 아니라 방문 불가 판정이다.
  // 상태 영역(getVisitStatus)이 이미 단언하므로 조건 목록에 겹쳐 넣지 않는다.
  it("동반 불가는 조건 목록에 넣지 않는다", () => {
    expect(getPlaceConditionBreakdown(place({ indoor: "not_allowed" })).conditions).toEqual([]);
  });

  it("동반 불가는 상태 영역이 대신 단언한다", () => {
    expect(getVisitStatus(place({ indoor: "not_allowed" }), "all")).toBe("notAllowed");
  });

  it("실내 불가 · 야외 미확인은 조건 목록에 한 줄로 들어간다", () => {
    const conditions = getPlaceConditionBreakdown(
      place({ indoor: "unknown", policyDetails: withSpace([indoorBlockedAll]) }),
    ).conditions;

    expect(conditions).toContain("indoorBlockedOutdoorUnconfirmed");
  });

  it("정보 불일치는 조건 목록에 충돌로 들어간다", () => {
    const conditions = getPlaceConditionBreakdown(
      place({ indoor: "allowed", policyDetails: withSpace([indoorBlockedAll]) }),
    ).conditions;

    expect(conditions).toContain("dogAccessConflict");
    expect(conditions).not.toContain("indoorOutdoorOnly");
  });

  it("정보가 불일치하면 실내 가능을 허용 목록에 넣지 않는다", () => {
    const { allowances } = getPlaceConditionBreakdown(
      place({ indoor: "allowed", policyDetails: withSpace([indoorBlockedAll]) }),
    );

    expect(allowances).not.toContain("indoorAllowed");
  });

  // maxDogSize=large를 "대형견 환영"으로 읽는 현재 동작. docs/analysis-pet-conditions.md §D가
  // "대형견은 야외 좌석만"인 매장에서 뜻이 뒤집힌다고 지적한 지점이라 값을 고정해 둔다.
  it("최대 크기 large를 허용 목록에 넣는다", () => {
    expect(getPlaceConditionBreakdown(place({ maxDogSize: "large" })).allowances).toContain(
      "largeDogs",
    );
  });
});

describe("getVisitStatus", () => {
  it("크기 초과는 동반 불가로 표시한다", () => {
    expect(getVisitStatus(place({ maxDogSize: "small" }), "large")).toBe("notAllowed");
  });

  it("반려견을 고르지 않아도 동반 불가는 그대로 표시한다", () => {
    expect(getVisitStatus(place({ indoor: "not_allowed" }), "all")).toBe("notAllowed");
  });

  it("핵심 3조건 중 하나라도 미확인이면 확인 필요다", () => {
    const base = fullyAllowedPlace();
    expect(getVisitStatus({ ...base, indoor: "unknown" }, "all")).toBe("confirm");
    expect(getVisitStatus({ ...base, carrierStrollerPolicy: null }, "all")).toBe("confirm");
    expect(getVisitStatus({ ...base, maxDogSize: "unknown" }, "all")).toBe("confirm");
  });

  // 목줄·입마개는 핵심 조건이 아니라 미확인이어도 confirm으로 내려가지 않는다.
  it("목줄·입마개 미확인은 확인 필요로 보지 않는다", () => {
    expect(
      getVisitStatus({ ...fullyAllowedPlace(), leash: "unknown", muzzle: null }, "all"),
    ).toBe("available");
  });

  it("지켜야 할 조건이 있으면 조건부다", () => {
    expect(
      getVisitStatus({ ...fullyAllowedPlace(), leash: "required" }, "all"),
    ).toBe("conditional");
  });

  it("모든 조건이 확실히 허용되면 방문 가능이다", () => {
    expect(getVisitStatus(fullyAllowedPlace(), "all")).toBe("available");
  });
});

describe("getVisitEligibility — 미확인 조건은 통과로 치지 않는다", () => {
  // 크기만 맞으면 방문 가능이라고 말하던 동작을 바로잡은 지점이다.
  it("실내 동반이 미확인이면 크기가 맞아도 확인 필요다", () => {
    expect(
      getVisitEligibility({ ...fullyAllowedPlace(), indoor: "unknown" }, "small"),
    ).toEqual({ status: "unknown", messageKey: "conditionsUnconfirmed" });

    expect(
      getVisitEligibility({ ...fullyAllowedPlace(), indoor: null }, "small"),
    ).toEqual({ status: "unknown", messageKey: "conditionsUnconfirmed" });
  });

  it("이동장 조건이 미확인이면 확인 필요다", () => {
    expect(
      getVisitEligibility(
        { ...fullyAllowedPlace(), carrierStrollerPolicy: "unknown" },
        "small",
      )?.status,
    ).toBe("unknown");
  });

  it("크기 상한이 미확인이면 실내가 허용이어도 확인 필요다", () => {
    expect(
      getVisitEligibility({ ...fullyAllowedPlace(), maxDogSize: "unknown" }, "small"),
    ).toEqual({ status: "unknown", messageKey: "sizeUnconfirmed" });

    expect(
      getVisitEligibility({ ...fullyAllowedPlace(), maxDogSize: null }, "small"),
    ).toEqual({ status: "unknown", messageKey: "sizeUnconfirmed" });
  });

  it("동반 불가는 미확인보다 먼저 판정한다", () => {
    expect(
      getVisitEligibility(place({ indoor: "not_allowed" }), "small")?.messageKey,
    ).toBe("dogsNotAllowed");
  });

  it("크기 초과는 다른 조건이 미확인이어도 방문 어려움이다", () => {
    expect(getVisitEligibility(place({ maxDogSize: "small" }), "large")).toEqual({
      status: "blocked",
      messageKey: "tooLarge",
    });
  });

  it("핵심 조건이 모두 확인되고 크기가 맞을 때만 방문 가능이다", () => {
    expect(getVisitEligibility(fullyAllowedPlace(), "large")).toEqual({
      status: "allowed",
      messageKey: "canVisit",
    });
  });
});

/**
 * 미리보기 패널은 배지를 getVisitStatus로, 바로 아래 설명을 getVisitEligibility로 만든다
 * (PlacePreviewCard). 목록 카드도 같은 판정으로 배너를 단다(PlaceCard).
 * 두 판정이 어긋나면 한 카드 안에서 "확인 필요"와 "방문 가능"이 동시에 표시된다.
 */
describe("두 판정의 정합 — 배지와 설명이 같은 뜻이어야 한다", () => {
  const INDOOR_VALUES = [
    "allowed",
    "outdoor_only",
    "partial_area",
    "not_allowed",
    "unknown",
    null,
  ] as const;
  const CARRIER_VALUES = [
    "not_required",
    "required_indoor",
    "required_always",
    "unknown",
    null,
  ] as const;
  const SIZE_VALUES = ["small", "medium", "large", "unknown", null] as const;

  /** 같은 뜻으로 읽히는 조합. 이 표를 벗어나면 화면이 모순된 문구를 만든다. */
  const ALLOWED_KEYS: Record<string, string[]> = {
    notAllowed: ["dogsNotAllowed", "tooLarge"],
    confirm: ["sizeUnconfirmed", "conditionsUnconfirmed"],
    conditional: ["canVisit"],
    available: ["canVisit"],
  };

  it("모든 조건 조합에서 배지와 설명이 같은 뜻을 가리킨다", () => {
    const mismatches: string[] = [];

    for (const indoor of INDOOR_VALUES) {
      for (const carrier of CARRIER_VALUES) {
        for (const maxDogSize of SIZE_VALUES) {
          for (const dogSize of ["small", "medium", "large"] as const) {
            const target = place({ indoor, carrierStrollerPolicy: carrier, maxDogSize });
            const eligibility = getVisitEligibility(target, dogSize);
            const status = getVisitStatus(target, dogSize);
            if (!eligibility) continue;

            if (!ALLOWED_KEYS[status].includes(eligibility.messageKey)) {
              mismatches.push(
                `indoor=${indoor} carrier=${carrier} size=${maxDogSize} dog=${dogSize}: ` +
                  `${status} vs ${eligibility.messageKey}`,
              );
            }
          }
        }
      }
    }

    expect(mismatches).toEqual([]);
  });

  it("방문 가능으로 단언한 장소는 확인 필요로 표시되지 않는다", () => {
    const target = fullyAllowedPlace();

    expect(getVisitEligibility(target, "small")?.status).toBe("allowed");
    expect(getVisitStatus(target, "small")).toBe("available");
  });

  it("실내 미확인 장소는 두 판정 모두 확인 필요로 읽는다", () => {
    const target = place({ indoor: "unknown", maxDogSize: "large" });

    expect(getVisitEligibility(target, "small")?.status).toBe("unknown");
    expect(getVisitStatus(target, "small")).toBe("confirm");
  });

  it("실내 불가 · 야외 미확인은 방문 가능도 불가도 단언하지 않는다", () => {
    const target = place({
      indoor: "unknown",
      maxDogSize: "large",
      carrierStrollerPolicy: "not_required",
      policyDetails: withSpace([indoorBlockedAll]),
    });

    expect(getVisitEligibility(target, "small")?.status).toBe("unknown");
    expect(getVisitStatus(target, "small")).toBe("confirm");
  });

  it("정보가 불일치하면 크기가 맞아도 방문 가능으로 확정하지 않는다", () => {
    const target = place({
      indoor: "allowed",
      maxDogSize: "large",
      carrierStrollerPolicy: "not_required",
      policyDetails: withSpace([indoorBlockedAll]),
    });

    expect(getVisitEligibility(target, "small")).toEqual({
      status: "unknown",
      messageKey: "accessConflict",
    });
    expect(getVisitStatus(target, "small")).toBe("confirm");
  });

  it("정보가 불일치하면 방문 불가로도 확정하지 않는다", () => {
    const target = place({
      indoor: "not_allowed",
      policyDetails: withSpace([{ area: "TERRACE", appliesToSize: "ALL", access: "ALLOWED" }]),
    });

    expect(getVisitEligibility(target, "small")?.status).toBe("unknown");
    expect(getVisitStatus(target, "small")).toBe("confirm");
    expect(getVisitStatus(target, "all")).toBe("confirm");
  });

  it("대형견만 실내 불가인 정상 예외는 판정을 바꾸지 않는다", () => {
    const target = fullyAllowedPlace();
    const withSizeException = {
      ...target,
      policyDetails: withSpace([
        { area: "INDOOR", appliesToSize: "LARGE", access: "NOT_ALLOWED" },
      ]),
    };

    expect(getVisitEligibility(withSizeException, "small")?.status).toBe("allowed");
    expect(getVisitStatus(withSizeException, "small")).toBe("available");
  });
});

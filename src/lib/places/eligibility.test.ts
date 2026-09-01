import { describe, expect, it } from "vitest";

import {
  getPlaceConditionBreakdown,
  getVisitEligibility,
  getVisitStatus,
  toDogSizeFilter,
} from "@/lib/places/eligibility";
import type { PlaceListItem } from "@/types/place";

/**
 * 조건 해석의 단일 출처인 `eligibility.ts`의 **현재 동작을 고정**하는 회귀 테스트.
 *
 * 표시 계층을 손대기 전에 지금 화면이 무엇을 단언하는지 붙잡아 두는 것이 목적이다.
 * 이상해 보이는 동작도 고치지 않고 그대로 기록한다 — 판단이 필요한 것은 주석으로 남긴다.
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
  it("미확인과 null은 어느 목록에도 넣지 않는다", () => {
    expect(getPlaceConditionBreakdown(place())).toEqual({ allowances: [], conditions: [] });
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
    ).toEqual({ allowances: [], conditions: [] });
  });

  it("확실히 허용된 조건만 allowances에 담는다", () => {
    expect(getPlaceConditionBreakdown(fullyAllowedPlace())).toEqual({
      allowances: ["indoorAllowed", "noCarrier", "largeDogs", "noLeash", "noMuzzle"],
      conditions: [],
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

  it("동반 불가는 조건 목록으로 들어간다", () => {
    expect(getPlaceConditionBreakdown(place({ indoor: "not_allowed" })).conditions).toEqual([
      "indoorNotAllowed",
    ]);
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

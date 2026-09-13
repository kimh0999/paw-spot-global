import { describe, expect, it } from "vitest";

import {
  filterPlaces,
  getActiveFilterCount,
  getFilteredAndSortedPlaces,
  sortPlaces,
} from "@/lib/places/filtering";
import { EMPTY_POLICY_DETAILS, type PolicyDetails } from "@/lib/places/policy-details";
import type { PlaceFilters, PlaceListItem } from "@/types/place";

/**
 * 목록 필터·정렬의 동작을 고정하는 회귀 테스트.
 *
 * 미확인 값 처리는 D-03·D-12로 통일됐다 — **긍정 조건 필터(실내·이동장)는 확인된 일치
 * 값만 통과**시키고, **크기 필터만 예외로 미확인을 남긴다**. 필터를 고르지 않은 상태는
 * 어떤 값도 걸러내지 않는다. 세 규칙을 각각 고정한다.
 */

function place(overrides: Partial<PlaceListItem> = {}): PlaceListItem {
  return {
    id: "place-1",
    nameKr: "테스트 카페",
    nameEn: null,
    category: "cafe",
    address: "대전시 서구 둔산동",
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

const NO_FILTERS: PlaceFilters = {
  indoor: "all",
  carrier: "all",
  dogSize: "all",
  recent: "all",
};

/** 기준일은 고정한다 — 신선도 필터 경계가 실행 시각에 따라 흔들리지 않게. */
const REFERENCE_DATE = new Date(2026, 8, 1);

function run(places: PlaceListItem[], overrides: Partial<PlaceFilters> = {}, query = "") {
  return filterPlaces({
    places,
    selectedCategory: "all",
    searchQuery: query,
    filters: { ...NO_FILTERS, ...overrides },
    referenceDate: REFERENCE_DATE,
  }).map((p) => p.id);
}

describe("filterPlaces — 카테고리와 검색", () => {
  const places = [
    place({ id: "cafe", category: "cafe", nameKr: "멍카페", nameEn: "Mung Cafe" }),
    place({ id: "restaurant", category: "restaurant", nameKr: "댕식당" }),
  ];

  it("전체 카테고리는 거르지 않는다", () => {
    expect(run(places)).toEqual(["cafe", "restaurant"]);
  });

  it("선택한 카테고리만 남긴다", () => {
    expect(
      filterPlaces({
        places,
        selectedCategory: "cafe",
        searchQuery: "",
        filters: NO_FILTERS,
        referenceDate: REFERENCE_DATE,
      }).map((p) => p.id),
    ).toEqual(["cafe"]);
  });

  it("한글명·영문명·주소를 대소문자 구분 없이 찾는다", () => {
    expect(run(places, {}, "멍")).toEqual(["cafe"]);
    expect(run(places, {}, "MUNG")).toEqual(["cafe"]);
    expect(run(places, {}, "둔산")).toEqual(["cafe", "restaurant"]);
  });

  it("공백만 입력하면 검색하지 않는다", () => {
    expect(run(places, {}, "   ")).toEqual(["cafe", "restaurant"]);
  });

  it("맞는 장소가 없으면 빈 목록이다", () => {
    expect(run(places, {}, "없는이름")).toEqual([]);
  });
});

describe("filterPlaces — 실내 필터", () => {
  const places = [
    place({ id: "allowed", indoor: "allowed" }),
    place({ id: "outdoor", indoor: "outdoor_only" }),
    place({ id: "partial", indoor: "partial_area" }),
    place({ id: "notAllowed", indoor: "not_allowed" }),
    place({ id: "unknown", indoor: "unknown" }),
    place({ id: "null", indoor: null }),
  ];

  // D-03: 긍정 조건 필터는 확인된 일치 값만 통과시킨다. 미확인·값 없음은 제외된다.
  it("실내 가능 필터는 확인된 allowed만 남긴다", () => {
    expect(run(places, { indoor: "indoor" })).toEqual(["allowed"]);
  });

  it("실외 전용 필터는 확인된 outdoor_only만 남긴다", () => {
    expect(run(places, { indoor: "outdoor" })).toEqual(["outdoor"]);
  });

  it("일부 구역 필터는 확인된 partial_area만 남긴다", () => {
    expect(run(places, { indoor: "partial-area" })).toEqual(["partial"]);
  });

  // D-12로 `exclude-unknown` 옵션이 사라졌다. 모든 긍정 조건 필터가 같은 규칙을 쓰므로
  // 별도 옵션 없이도 미확인이 제외된다 — 그 대체 동작을 여기서 고정한다.
  it("실내 필터를 고르지 않으면 미확인도 남는다", () => {
    expect(run(places, { indoor: "all" })).toEqual([
      "allowed",
      "outdoor",
      "partial",
      "notAllowed",
      "unknown",
      "null",
    ]);
  });

  it("실내 필터의 미확인 제외 규칙이 이동장 필터와 같다", () => {
    const indoorKept = run(places, { indoor: "indoor" });
    const carrierPlaces = [
      place({ id: "allowed", carrierStrollerPolicy: "not_required" }),
      place({ id: "outdoor", carrierStrollerPolicy: "required_always" }),
      place({ id: "partial", carrierStrollerPolicy: "required_indoor" }),
      place({ id: "notAllowed", carrierStrollerPolicy: "required_always" }),
      place({ id: "unknown", carrierStrollerPolicy: "unknown" }),
      place({ id: "null", carrierStrollerPolicy: null }),
    ];
    expect(indoorKept).toEqual(run(carrierPlaces, { carrier: "not-required" }));
  });
});

/**
 * 선택지는 `전체` / `필수 아님` 둘뿐이다. `지참 가능`(`can-bring`)은 확정값 3개를 모두
 * 통과시켜 사실상 `미확인이 아닌 곳`을 뜻했으므로 없앴다.
 *
 * `필수 아님`은 **사용 의무가 없다**는 뜻이지 반입 허용이나 모든 구역 자유 이용이 아니다.
 * 그래서 실내 한정 요구(`required_indoor`)도 통과시키지 않는다.
 */
describe("filterPlaces — 이동장·유모차 필터", () => {
  const places = [
    place({ id: "notRequired", carrierStrollerPolicy: "not_required" }),
    place({ id: "indoorOnly", carrierStrollerPolicy: "required_indoor" }),
    place({ id: "always", carrierStrollerPolicy: "required_always" }),
    place({ id: "unknown", carrierStrollerPolicy: "unknown" }),
    place({ id: "null", carrierStrollerPolicy: null }),
  ];

  it("전체는 미확인과 null도 남긴다", () => {
    expect(run(places)).toEqual([
      "notRequired",
      "indoorOnly",
      "always",
      "unknown",
      "null",
    ]);
  });

  it("필수 아님 필터는 not_required만 통과시킨다", () => {
    expect(run(places, { carrier: "not-required" })).toEqual(["notRequired"]);
  });

  it("실내 한정 요구는 필수 아님이 아니다", () => {
    expect(run(places, { carrier: "not-required" })).not.toContain("indoorOnly");
  });

  it("미확인을 필수 아님으로 처리하지 않는다", () => {
    const kept = run(places, { carrier: "not-required" });
    expect(kept).not.toContain("unknown");
    expect(kept).not.toContain("null");
  });
});

/**
 * 세부 정책(`policyDetails.handling`)이 말하는 이동장 의무까지 읽는다 (결정 **D-21**).
 *
 * 요약 컬럼만 보면 "실내에서는 이동장에 넣어 주세요"라고 적힌 장소가 `필수 아님`으로
 * 통과했다. 판정은 화면들이 쓰는 `resolveCarrierRequirement`에 맡기므로 필터에 별도
 * 예외가 없고, 카드·상세와 결과가 갈리지 않는다. 경계 규칙 전체는
 * `carrier-requirement.test.ts`가 고정하고, 여기서는 **필터에 실제로 닿는지**만 본다.
 */
describe("filterPlaces — 이동장 필터와 세부 정책 (D-21)", () => {
  function handling(
    mode: PolicyDetails["handling"][number]["mode"],
    scope: PolicyDetails["handling"][number]["scope"],
    rules: PolicyDetails["handling"][number]["rules"],
  ): PolicyDetails {
    return { ...EMPTY_POLICY_DETAILS, handling: [{ mode, scope, rules }] };
  }

  const carrierIndoor = handling("UNKNOWN", "INDOOR", [
    { rule: "IN_CARRIER", status: "REQUIRED" },
  ]);
  const heldOnly = handling("UNKNOWN", "INDOOR", [
    { rule: "HELD_BY_OWNER", status: "REQUIRED" },
  ]);
  const eitherHeldOrCarrier = handling("ANY_OF", "INDOOR", [
    { rule: "IN_CARRIER", status: "REQUIRED" },
    { rule: "HELD_BY_OWNER", status: "REQUIRED" },
  ]);

  it("실내 이동장 필수는 요약이 필수 아님이어도 제외한다", () => {
    const places = [
      place({ id: "plain", carrierStrollerPolicy: "not_required" }),
      place({
        id: "carrierIndoor",
        carrierStrollerPolicy: "not_required",
        policyDetails: carrierIndoor,
      }),
    ];
    expect(run(places, { carrier: "not-required" })).toEqual(["plain"]);
  });

  // 사용자 확정: 안기 의무는 이동장 사용 의무가 아니다.
  it("안기만 필수인 곳은 남긴다", () => {
    const places = [
      place({ id: "held", carrierStrollerPolicy: "not_required", policyDetails: heldOnly }),
    ];
    expect(run(places, { carrier: "not-required" })).toEqual(["held"]);
  });

  it("이동장을 대신할 수단이 확인된 택일은 남긴다", () => {
    const places = [
      place({
        id: "either",
        carrierStrollerPolicy: "not_required",
        policyDetails: eitherHeldOrCarrier,
      }),
    ];
    expect(run(places, { carrier: "not-required" })).toEqual(["either"]);
  });

  it("세부 정책이 없는 기존 데이터는 규칙이 그대로다", () => {
    const places = [
      place({ id: "notRequired", carrierStrollerPolicy: "not_required", policyDetails: null }),
      place({ id: "unknown", carrierStrollerPolicy: "unknown", policyDetails: null }),
      place({ id: "indoorOnly", carrierStrollerPolicy: "required_indoor", policyDetails: null }),
    ];
    expect(run(places, { carrier: "not-required" })).toEqual(["notRequired"]);
  });

  it("다른 필터로 번지지 않는다", () => {
    const places = [
      place({
        id: "carrierIndoor",
        indoor: "allowed",
        maxDogSize: "large",
        carrierStrollerPolicy: "not_required",
        policyDetails: carrierIndoor,
      }),
    ];
    // 실내·크기 필터는 이동장 의무와 무관하므로 이 장소를 그대로 통과시킨다.
    expect(run(places, { indoor: "indoor" })).toEqual(["carrierIndoor"]);
    expect(run(places, { dogSize: "large" })).toEqual(["carrierIndoor"]);
    expect(run(places)).toEqual(["carrierIndoor"]);
  });

  it("이동장 불필요 우선 정렬도 같은 해석을 쓴다", () => {
    const places = [
      place({
        id: "carrierIndoor",
        carrierStrollerPolicy: "not_required",
        policyDetails: carrierIndoor,
      }),
      place({ id: "plain", carrierStrollerPolicy: "not_required" }),
    ];
    expect(sortPlaces(places, "no-carrier-first").map((p) => p.id)).toEqual([
      "plain",
      "carrierIndoor",
    ]);
  });
});

describe("filterPlaces — 크기 필터", () => {
  const places = [
    place({ id: "small", maxDogSize: "small" }),
    place({ id: "medium", maxDogSize: "medium" }),
    place({ id: "large", maxDogSize: "large" }),
    place({ id: "unknown", maxDogSize: "unknown" }),
    place({ id: "null", maxDogSize: null }),
  ];

  it("소형견 필터는 아무것도 거르지 않는다", () => {
    expect(run(places, { dogSize: "small" })).toEqual([
      "small",
      "medium",
      "large",
      "unknown",
      "null",
    ]);
  });

  // 현재 규칙(D-12): 크기 필터는 미확인을 남긴다. 실내 필터와 같고 이동장 필터와 다르다.
  it("중형견 필터는 소형 전용만 제외하고 미확인은 남긴다", () => {
    expect(run(places, { dogSize: "medium" })).toEqual([
      "medium",
      "large",
      "unknown",
      "null",
    ]);
  });

  it("대형견 필터는 소형·중형 전용을 제외하고 미확인은 남긴다", () => {
    expect(run(places, { dogSize: "large" })).toEqual(["large", "unknown", "null"]);
  });
});

/**
 * **선택지는 `전체` / `최근 90일 안에 확인된 곳` 둘뿐이다.** 30일 선택지는 없앴다 —
 * 재확인 임계가 90일 하나(D-02)인데 30일 선택지는 그 경계와 무관한 숫자를 하나 더
 * 보여 줘, `재확인 필요` 배지가 없는 장소도 걸러 냈다.
 *
 * 판정은 배지와 **같은 `needsRecheck`**가 한다. 그래서 `재확인 필요` 배지가 붙은
 * 장소는 언제나 빠지고, 확인 이력이 없는 장소(`null`)도 함께 빠진다.
 */
describe("filterPlaces — 신선도 필터", () => {
  const places = [
    place({ id: "fresh", latestVerifiedAt: "2026.08.20" }),
    place({ id: "day30", latestVerifiedAt: "2026.08.02" }),
    place({ id: "old", latestVerifiedAt: "2026.08.01" }),
    place({ id: "veryOld", latestVerifiedAt: "2026.01.01" }),
    place({ id: "never", latestVerifiedAt: null }),
  ];

  it("전체는 확인 이력이 없는 장소도 남긴다", () => {
    expect(run(places)).toEqual(["fresh", "day30", "old", "veryOld", "never"]);
  });

  it("90일 필터는 90일이 지난 장소만 걸러 낸다", () => {
    expect(run(places, { recent: "90days" })).toEqual(["fresh", "day30", "old"]);
  });

  it("확인 이력이 없으면 신선도 필터에서 제외된다", () => {
    expect(run(places, { recent: "90days" })).not.toContain("never");
  });

  /**
   * 경계는 재확인 배지와 **같은 함수**가 정하므로 같은 자리에 선다 —
   * 89일 포함 · 정확히 90일 제외 · 91일 제외 (`display.test.ts`의 D-02 경계와 같다).
   * 기준일은 `REFERENCE_DATE`(2026.09.01)다.
   */
  it("90일 경계는 재확인 배지와 같은 자리에 선다", () => {
    const boundary = [
      place({ id: "day89", latestVerifiedAt: "2026.06.04" }),
      place({ id: "day90", latestVerifiedAt: "2026.06.03" }),
      place({ id: "day91", latestVerifiedAt: "2026.06.02" }),
    ];
    expect(run(boundary, { recent: "90days" })).toEqual(["day89"]);
  });
});

describe("filterPlaces — 필터 조합", () => {
  it("모든 조건을 함께 만족하는 장소만 남긴다", () => {
    const places = [
      place({
        id: "match",
        indoor: "allowed",
        carrierStrollerPolicy: "not_required",
        maxDogSize: "large",
        latestVerifiedAt: "2026.08.20",
      }),
      place({
        id: "carrierMiss",
        indoor: "allowed",
        carrierStrollerPolicy: "required_always",
        maxDogSize: "large",
        latestVerifiedAt: "2026.08.20",
      }),
      place({
        id: "staleMiss",
        indoor: "allowed",
        carrierStrollerPolicy: "not_required",
        maxDogSize: "large",
        latestVerifiedAt: "2026.01.01",
      }),
    ];

    expect(
      run(places, {
        indoor: "indoor",
        carrier: "not-required",
        dogSize: "large",
        recent: "90days",
      }),
    ).toEqual(["match"]);
  });
});

describe("sortPlaces", () => {
  it("거리순은 가까운 순이고 거리 없는 장소를 뒤로 보낸다", () => {
    const places = [
      place({ id: "far", distanceMeters: 900 }),
      place({ id: "none", distanceMeters: null }),
      place({ id: "near", distanceMeters: 100 }),
    ];
    expect(sortPlaces(places, "distance").map((p) => p.id)).toEqual([
      "near",
      "far",
      "none",
    ]);
  });

  it("최근 확인순은 최신이 먼저고 이력 없는 장소가 뒤다", () => {
    const places = [
      place({ id: "old", latestVerifiedAt: "2026.01.01" }),
      place({ id: "never", latestVerifiedAt: null }),
      place({ id: "new", latestVerifiedAt: "2026.08.20" }),
    ];
    expect(sortPlaces(places, "recent").map((p) => p.id)).toEqual(["new", "old", "never"]);
  });

  it("실내 우선은 실내 가능만 앞으로 올린다", () => {
    const places = [
      place({ id: "partial", indoor: "partial_area" }),
      place({ id: "allowed", indoor: "allowed" }),
      place({ id: "unknown", indoor: "unknown" }),
    ];
    expect(sortPlaces(places, "indoor-first").map((p) => p.id)).toEqual([
      "allowed",
      "partial",
      "unknown",
    ]);
  });

  it("이동장 불필요 우선은 not_required만 앞으로 올린다", () => {
    const places = [
      place({ id: "always", carrierStrollerPolicy: "required_always" }),
      place({ id: "free", carrierStrollerPolicy: "not_required" }),
    ];
    expect(sortPlaces(places, "no-carrier-first").map((p) => p.id)).toEqual([
      "free",
      "always",
    ]);
  });

  it("원본 배열을 바꾸지 않는다", () => {
    const places = [
      place({ id: "b", distanceMeters: 900 }),
      place({ id: "a", distanceMeters: 100 }),
    ];
    sortPlaces(places, "distance");
    expect(places.map((p) => p.id)).toEqual(["b", "a"]);
  });
});

describe("getFilteredAndSortedPlaces", () => {
  it("거른 뒤 정렬한다", () => {
    const places = [
      place({ id: "farAllowed", indoor: "allowed", distanceMeters: 900 }),
      place({ id: "nearBlocked", indoor: "not_allowed", distanceMeters: 100 }),
      place({ id: "nearAllowed", indoor: "allowed", distanceMeters: 200 }),
    ];

    expect(
      getFilteredAndSortedPlaces({
        places,
        selectedCategory: "all",
        searchQuery: "",
        filters: { ...NO_FILTERS, indoor: "indoor" },
        referenceDate: REFERENCE_DATE,
        sortOption: "distance",
      }).map((p) => p.id),
    ).toEqual(["nearAllowed", "farAllowed"]);
  });

  it("실내·이동장·크기를 함께 걸면 각 규칙이 그대로 겹쳐 적용된다", () => {
    const places = [
      // 세 조건 모두 확인된 일치 — 유일한 통과 대상
      place({
        id: "pass",
        indoor: "allowed",
        carrierStrollerPolicy: "not_required",
        maxDogSize: "large",
      }),
      // 실내만 미확인 → 긍정 조건 필터라 제외
      place({
        id: "indoorUnknown",
        indoor: "unknown",
        carrierStrollerPolicy: "not_required",
        maxDogSize: "large",
      }),
      // 이동장만 미확인 → 제외
      place({
        id: "carrierUnknown",
        indoor: "allowed",
        carrierStrollerPolicy: "unknown",
        maxDogSize: "large",
      }),
      // 크기만 미확인 → 크기 필터는 예외라 남아야 한다
      place({
        id: "sizeUnknown",
        indoor: "allowed",
        carrierStrollerPolicy: "not_required",
        maxDogSize: "unknown",
      }),
      // 크기 상한 미달 → 크기 필터가 실제로 거른다
      place({
        id: "tooSmall",
        indoor: "allowed",
        carrierStrollerPolicy: "not_required",
        maxDogSize: "small",
      }),
    ];

    expect(
      filterPlaces({
        places,
        selectedCategory: "all",
        searchQuery: "",
        filters: {
          indoor: "indoor",
          carrier: "not-required",
          dogSize: "large",
          recent: "all",
        },
        referenceDate: REFERENCE_DATE,
      }).map((p) => p.id),
    ).toEqual(["pass", "sizeUnknown"]);
  });
});

describe("getActiveFilterCount", () => {
  it("all이 아닌 필터 수를 센다", () => {
    expect(getActiveFilterCount(NO_FILTERS)).toBe(0);
    expect(getActiveFilterCount({ ...NO_FILTERS, indoor: "indoor" })).toBe(1);
    expect(
      getActiveFilterCount({
        indoor: "indoor",
        carrier: "not-required",
        dogSize: "large",
        recent: "90days",
      }),
    ).toBe(4);
  });
});

/**
 * D-15 — `실내 가능` 필터에서 **요약과 구역 기록이 어긋나는 장소**를 제외한다.
 *
 * 서비스는 이런 장소를 이미 표시·판정에서 `동반 조건 정보 불일치`로 다루는데
 * 필터만 `확인된 실내 가능`으로 다뤄 앞뒤가 맞지 않았다. 적용 범위는 **실내 필터뿐**이다.
 */
describe("filterPlaces — 실내 필터와 정보 불일치 (D-15)", () => {
  /** 요약 컬럼이 뭐라고 하든 구역 기록은 전체 반려견 실내 불가라고 말한다. */
  const indoorBlockedForAll = {
    version: 1,
    entry: { vaccinationCompletionPolicy: "UNKNOWN" },
    preparation: [],
    handling: [],
    admission: null,
    hygiene: [],
    behaviorRestrictions: [],
    spaceExceptions: [
      { area: "INDOOR", access: "NOT_ALLOWED", appliesToSize: "ALL", note: null },
    ],
    uncertainties: [],
  } as unknown as PlaceListItem["policyDetails"];

  /** 대형견만 실내 불가 — 장소가 실내 허용이라는 사실을 뒤집지 않는다. */
  const largeDogsBlockedIndoors = {
    version: 1,
    entry: { vaccinationCompletionPolicy: "UNKNOWN" },
    preparation: [],
    handling: [],
    admission: null,
    hygiene: [],
    behaviorRestrictions: [],
    spaceExceptions: [
      { area: "INDOOR", access: "NOT_ALLOWED", appliesToSize: "LARGE", note: null },
    ],
    uncertainties: [],
  } as unknown as PlaceListItem["policyDetails"];

  const conflicting = place({
    id: "conflict",
    indoor: "allowed",
    policyDetails: indoorBlockedForAll,
  });

  it("요약이 실내 허용이어도 구역 기록과 어긋나면 실내 필터에서 제외한다", () => {
    expect(run([conflicting], { indoor: "indoor" })).toEqual([]);
  });

  it("실내 필터가 없으면 불일치만을 이유로 목록에서 지우지 않는다", () => {
    expect(run([conflicting])).toEqual(["conflict"]);
  });

  it("실내 허용이 확인된 장소는 그대로 통과한다", () => {
    const plain = place({ id: "plain", indoor: "allowed" });
    const withRecords = place({
      id: "with-records",
      indoor: "allowed",
      policyDetails: largeDogsBlockedIndoors,
    });
    expect(run([plain, withRecords], { indoor: "indoor" })).toEqual([
      "plain",
      "with-records",
    ]);
  });

  it("일부 구역 허용·야외만·동반 불가·미확인의 기존 동작은 그대로다", () => {
    const places = [
      place({ id: "partial", indoor: "partial_area" }),
      place({ id: "outdoor", indoor: "outdoor_only" }),
      place({ id: "not-allowed", indoor: "not_allowed" }),
      place({ id: "unknown", indoor: "unknown" }),
    ];
    expect(run(places, { indoor: "indoor" })).toEqual([]);
    expect(run(places, { indoor: "partial-area" })).toEqual(["partial"]);
    expect(run(places, { indoor: "outdoor" })).toEqual(["outdoor"]);
    expect(run(places)).toEqual(["partial", "outdoor", "not-allowed", "unknown"]);
  });

  it("불일치 제외는 실내 필터에서만 작동한다 — 다른 필터에는 번지지 않는다", () => {
    const conflictNoCarrier = place({
      id: "conflict",
      indoor: "allowed",
      carrierStrollerPolicy: "not_required",
      maxDogSize: "large",
      policyDetails: indoorBlockedForAll,
    });

    // 이동장·크기 필터만 걸면 불일치 장소도 그대로 남는다.
    expect(run([conflictNoCarrier], { carrier: "not-required" })).toEqual(["conflict"]);
    expect(run([conflictNoCarrier], { dogSize: "large" })).toEqual(["conflict"]);

    // 실내 필터가 함께 걸리면 그때 제외되고, 다른 필터의 조건도 그대로 적용된다.
    expect(
      run([conflictNoCarrier], { indoor: "indoor", carrier: "not-required" }),
    ).toEqual([]);
  });

  it("실내 필터와 다른 필터를 함께 걸면 각 조건이 모두 적용된다", () => {
    const ok = place({
      id: "ok",
      indoor: "allowed",
      carrierStrollerPolicy: "not_required",
    });
    const carrierMismatch = place({
      id: "carrier-required",
      indoor: "allowed",
      carrierStrollerPolicy: "required_always",
    });
    expect(
      run([ok, carrierMismatch, conflicting], {
        indoor: "indoor",
        carrier: "not-required",
      }),
    ).toEqual(["ok"]);
  });
});

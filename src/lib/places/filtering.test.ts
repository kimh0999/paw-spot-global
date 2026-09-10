import { describe, expect, it } from "vitest";

import {
  filterPlaces,
  getActiveFilterCount,
  getFilteredAndSortedPlaces,
  parseVerifiedAt,
  sortPlaces,
} from "@/lib/places/filtering";
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

describe("parseVerifiedAt", () => {
  it("YYYY.MM.DD를 로컬 날짜로 옮긴다", () => {
    const parsed = parseVerifiedAt("2026.08.13");
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(7);
    expect(parsed.getDate()).toBe(13);
  });
});

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

describe("filterPlaces — 이동장 필터", () => {
  const places = [
    place({ id: "notRequired", carrierStrollerPolicy: "not_required" }),
    place({ id: "indoorOnly", carrierStrollerPolicy: "required_indoor" }),
    place({ id: "always", carrierStrollerPolicy: "required_always" }),
    place({ id: "unknown", carrierStrollerPolicy: "unknown" }),
    place({ id: "null", carrierStrollerPolicy: null }),
  ];

  it("불필요 필터는 미확인과 null을 제외한다", () => {
    expect(run(places, { carrier: "not-required" })).toEqual(["notRequired"]);
  });

  it("지참 가능 필터는 확인된 3개 값만 통과시킨다", () => {
    expect(run(places, { carrier: "can-bring" })).toEqual([
      "notRequired",
      "indoorOnly",
      "always",
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

describe("filterPlaces — 신선도 필터", () => {
  const places = [
    place({ id: "fresh", latestVerifiedAt: "2026.08.20" }),
    place({ id: "cutoff30", latestVerifiedAt: "2026.08.02" }),
    place({ id: "old", latestVerifiedAt: "2026.08.01" }),
    place({ id: "veryOld", latestVerifiedAt: "2026.01.01" }),
    place({ id: "never", latestVerifiedAt: null }),
  ];

  it("전체는 확인 이력이 없는 장소도 남긴다", () => {
    expect(run(places)).toEqual(["fresh", "cutoff30", "old", "veryOld", "never"]);
  });

  it("30일 필터는 기준일 30일 전까지 포함한다", () => {
    expect(run(places, { recent: "30days" })).toEqual(["fresh", "cutoff30"]);
  });

  it("90일 필터는 더 넓게 포함한다", () => {
    expect(run(places, { recent: "90days" })).toEqual(["fresh", "cutoff30", "old"]);
  });

  it("확인 이력이 없으면 신선도 필터에서 제외된다", () => {
    expect(run(places, { recent: "90days" })).not.toContain("never");
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
        recent: "30days",
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
        recent: "30days",
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

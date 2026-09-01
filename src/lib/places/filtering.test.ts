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
 * 목록 필터·정렬의 **현재 동작을 고정**하는 회귀 테스트.
 *
 * 미확인 값 처리 규칙이 필터마다 다른데(§PROJECT_STATUS P0 #19), 고칠 대상이지
 * 지금 바꿀 것이 아니므로 현재 규칙을 그대로 기록한다.
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

  // 현재 규칙: 실내 필터는 미확인을 통과시킨다. 이동장 필터와 비대칭이며 P0 #19의 수정 대상이다.
  it("실내 가능 필터가 미확인과 null을 통과시킨다", () => {
    expect(run(places, { indoor: "indoor" })).toEqual(["allowed", "unknown", "null"]);
  });

  it("실외 전용 필터도 미확인을 통과시킨다", () => {
    expect(run(places, { indoor: "outdoor" })).toEqual(["outdoor", "unknown", "null"]);
  });

  it("일부 구역 필터도 미확인을 통과시킨다", () => {
    expect(run(places, { indoor: "partial-area" })).toEqual(["partial", "unknown", "null"]);
  });

  // 제거 예정 옵션(P0 #19). 지금은 동작하므로 그대로 고정한다.
  it("exclude-unknown은 미확인과 null만 걸러낸다", () => {
    expect(run(places, { indoor: "exclude-unknown" })).toEqual([
      "allowed",
      "outdoor",
      "partial",
      "notAllowed",
    ]);
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

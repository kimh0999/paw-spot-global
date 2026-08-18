import { describe, expect, it } from "vitest";

import {
  buildDogPlacesHref,
  parseDogSelection,
  stripDogSelectionFromUrl,
} from "@/lib/dogs/selection";

const DOG_A = "cmryq3rcp00016csmdlvvuxfm";
const DOG_B = "cmryq3rcp00026csmdlvvuxfn";

describe("parseDogSelection", () => {
  it("단일 dogId를 읽는다", () => {
    expect(parseDogSelection({ dogId: DOG_A })).toEqual({
      dogIds: [DOG_A],
      matchAll: false,
    });
  });

  it("여러 dogIds와 match=all을 읽는다", () => {
    expect(parseDogSelection({ dogIds: `${DOG_A},${DOG_B}`, match: "all" })).toEqual({
      dogIds: [DOG_A, DOG_B],
      matchAll: true,
    });
  });

  it("형식이 잘못된 값은 오류 없이 버린다", () => {
    expect(parseDogSelection({ dogId: "../../etc/passwd" }).dogIds).toEqual([]);
    expect(parseDogSelection({ dogId: "" }).dogIds).toEqual([]);
    expect(parseDogSelection({ dogIds: "abc,,,!!!" }).dogIds).toEqual([]);
  });

  it("유효한 id만 남기고 나머지는 버린다", () => {
    expect(parseDogSelection({ dogIds: `${DOG_A},not-an-id` }).dogIds).toEqual([DOG_A]);
  });

  it("중복 id는 한 번만 남긴다", () => {
    expect(parseDogSelection({ dogIds: `${DOG_A},${DOG_A}` }).dogIds).toEqual([DOG_A]);
  });

  it("파라미터가 없으면 선택 없음이다", () => {
    expect(parseDogSelection({})).toEqual({ dogIds: [], matchAll: false });
  });

  it("배열로 들어와도 첫 값만 쓴다", () => {
    expect(parseDogSelection({ dogId: [DOG_A, DOG_B] }).dogIds).toEqual([DOG_A]);
  });
});

describe("stripDogSelectionFromUrl", () => {
  it("반려견 파라미터만 걷어낸다", () => {
    expect(
      stripDogSelectionFromUrl("/ko/places", `dogId=${DOG_A}&category=cafe`),
    ).toBe("/ko/places?category=cafe");
  });

  it("남는 파라미터가 없으면 경로만 돌려준다", () => {
    expect(
      stripDogSelectionFromUrl("/ko/places", `dogIds=${DOG_A}&match=all`),
    ).toBe("/ko/places");
  });
});

describe("buildDogPlacesHref", () => {
  it("한 마리는 dogId로, 여러 마리는 dogIds+match=all로 만든다", () => {
    expect(buildDogPlacesHref([DOG_A])).toBe(`/places?dogId=${DOG_A}`);
    expect(buildDogPlacesHref([DOG_A, DOG_B])).toBe(
      `/places?dogIds=${DOG_A},${DOG_B}&match=all`,
    );
    expect(buildDogPlacesHref([])).toBe("/places");
  });
});

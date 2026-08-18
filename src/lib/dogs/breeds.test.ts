import { describe, expect, it } from "vitest";

import {
  DOG_BREEDS,
  formatDogBreed,
  getBreedLabel,
  isDogBreedCode,
  matchBreedCodeByLabel,
  searchDogBreeds,
} from "@/lib/dogs/breeds";

describe("searchDogBreeds", () => {
  it("한국어로 검색한다", () => {
    const codes = searchDogBreeds("푸들").map((breed) => breed.code);
    expect(codes).toContain("poodle");
  });

  it("영문으로 검색한다", () => {
    const codes = searchDogBreeds("poodle").map((breed) => breed.code);
    expect(codes).toContain("poodle");
  });

  it("대소문자와 공백을 무시한다", () => {
    const codes = searchDogBreeds("  Golden Retriever ").map((breed) => breed.code);
    expect(codes).toEqual(["golden_retriever"]);
  });

  it("일치하는 견종이 없으면 빈 목록이다", () => {
    expect(searchDogBreeds("존재하지않는견종")).toEqual([]);
  });

  it("빈 질의는 전체 목록을 돌려준다", () => {
    expect(searchDogBreeds("")).toHaveLength(DOG_BREEDS.length);
  });
});

describe("getBreedLabel", () => {
  it("locale에 맞는 label을 돌려준다", () => {
    expect(getBreedLabel("jindo", "ko")).toBe("진돗개");
    expect(getBreedLabel("jindo", "en")).toBe("Jindo Dog");
  });

  it("등록되지 않은 code는 null이다", () => {
    expect(getBreedLabel("dragon", "ko")).toBeNull();
  });
});

describe("formatDogBreed", () => {
  it("other는 사용자가 쓴 원문을 그대로 쓴다", () => {
    const dog = { breedCode: "other", breedCustom: "시고르자브종" };
    expect(formatDogBreed(dog, "ko")).toBe("시고르자브종");
    expect(formatDogBreed(dog, "en")).toBe("시고르자브종");
  });

  it("견종을 고르지 않았으면 null이다", () => {
    expect(formatDogBreed({ breedCode: null, breedCustom: null }, "ko")).toBeNull();
  });
});

describe("isDogBreedCode", () => {
  it("등록된 code만 통과시킨다", () => {
    expect(isDogBreedCode("maltese")).toBe(true);
    expect(isDogBreedCode("mix")).toBe(true);
    expect(isDogBreedCode("wolf")).toBe(false);
    expect(isDogBreedCode(null)).toBe(false);
  });
});

describe("matchBreedCodeByLabel", () => {
  it("기존 자유 입력값을 canonical code로 옮긴다", () => {
    expect(matchBreedCodeByLabel("푸들")).toBe("poodle");
    expect(matchBreedCodeByLabel("Shih Tzu")).toBe("shih_tzu");
  });

  it("매핑되지 않는 값은 null이다", () => {
    expect(matchBreedCodeByLabel("옆집 강아지")).toBeNull();
  });
});

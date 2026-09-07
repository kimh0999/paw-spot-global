import { describe, expect, it } from "vitest";

// 스크립트에서 직접 가져온다. 규칙을 두 곳에 적어 두면 갈라진다.
import { validate } from "../../../scripts/import-places.mjs";

/**
 * Import는 조건을 추측하지 않고, 좌표가 없으면 후보로도 넣지 않는다
 * (개발명세서 v2 §12-2). 기본 좌표나 더미 값을 넣지 않는다는 규칙이라
 * 여기서 경계를 고정한다.
 */
const valid = {
  tourApiId: "T-1",
  nameKr: "예시",
  category: "CAFE",
  address: "대전 유성구 대학로 1",
  lat: 36.36,
  lng: 127.35,
};

describe("import 후보 검증", () => {
  it("필수 항목이 모두 있으면 통과한다", () => {
    expect(validate(valid, 0)).toBeNull();
  });

  it.each(["tourApiId", "nameKr", "address"])("%s가 없으면 거른다", (key) => {
    const item = { ...valid, [key]: undefined };
    expect(validate(item, 0)).toContain(key);
  });

  it("좌표가 없으면 거른다 — 기본 좌표를 넣지 않는다", () => {
    expect(validate({ ...valid, lat: undefined, lng: undefined }, 0)).toContain("좌표 없음");
    expect(validate({ ...valid, lat: 36.36, lng: undefined }, 0)).toContain("좌표 없음");
  });

  it("한국 범위를 벗어난 좌표를 거른다", () => {
    expect(validate({ ...valid, lat: 32.9 }, 0)).toContain("위도");
    expect(validate({ ...valid, lat: 43.1 }, 0)).toContain("위도");
    expect(validate({ ...valid, lng: 123.9 }, 0)).toContain("경도");
    expect(validate({ ...valid, lng: 132.1 }, 0)).toContain("경도");
  });

  it("경계값은 통과시킨다", () => {
    expect(validate({ ...valid, lat: 33, lng: 124 }, 0)).toBeNull();
    expect(validate({ ...valid, lat: 43, lng: 132 }, 0)).toBeNull();
  });

  it("Category enum에 없는 분류를 거른다", () => {
    expect(validate({ ...valid, category: "BAKERY" }, 0)).toContain("category");
    expect(validate({ ...valid, category: undefined }, 0)).toContain("category");
  });

  it("Category enum 네 값을 모두 받는다", () => {
    for (const category of ["RESTAURANT", "CAFE", "TRAVEL", "ETC"]) {
      expect(validate({ ...valid, category }, 0)).toBeNull();
    }
  });
});

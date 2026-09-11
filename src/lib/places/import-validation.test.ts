import { describe, expect, it } from "vitest";

// 스크립트에서 직접 가져온다. 규칙을 두 곳에 적어 두면 갈라진다.
import { isHttpUrl, validate } from "../../../scripts/import-places.mjs";

import { httpUrlSchema } from "@/lib/validation/url";

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

  /**
   * Import는 관리자 폼을 거치지 않고 DB에 직접 쓴다. 여기서 막지 않으면
   * `website`·`thumbnailUrl`이 검사 없이 저장되고, 그대로 사용자 화면의 `href`가 된다.
   */
  it("website·thumbnailUrl이 http/https가 아니면 거른다", () => {
    for (const key of ["website", "thumbnailUrl"]) {
      expect(validate({ ...valid, [key]: "javascript:alert(1)" }, 0)).toContain(key);
      expect(validate({ ...valid, [key]: "java	script:alert(1)" }, 0)).toContain(key);
      expect(validate({ ...valid, [key]: "data:text/html,<script>alert(1)</script>" }, 0)).toContain(key);
      expect(validate({ ...valid, [key]: "//evil.com" }, 0)).toContain(key);
    }
  });

  it("URL이 없거나 정상이면 통과한다 — 선택 항목이다", () => {
    expect(validate({ ...valid, website: undefined, thumbnailUrl: null }, 0)).toBeNull();
    expect(validate({ ...valid, website: "", thumbnailUrl: "" }, 0)).toBeNull();
    expect(
      validate({ ...valid, website: "https://a.example.com", thumbnailUrl: "http://b.example.com/x.jpg" }, 0),
    ).toBeNull();
  });
});

/**
 * 스크립트는 순수 node로 돌아 `lib/validation/url.ts`를 가져올 수 없어 규칙을 옮겨 적었다.
 * 두 곳이 갈라지면 한쪽만 막히므로, 같은 답을 내는지 여기서 고정한다.
 */
describe("import 스크립트의 URL 규칙은 공용 스키마와 같은 답을 낸다", () => {
  const cases = [
    "https://example.com",
    "http://example.com/a?b=c",
    "HTTPS://Example.COM/Path",
    "https://sub.example.co.kr:8080/x",
    "  https://example.com  ",
    "javascript:alert(1)",
    "java	script:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
    "//evil.com",
    "evil.com",
    "https://localhost:3000",
    "https://192.168.0.1/",
    "https://exa_mple.com/",
    "",
  ];

  it.each(cases)("%j", (value) => {
    expect(isHttpUrl(value)).toBe(httpUrlSchema.safeParse(value).success);
  });
});

import { describe, expect, it } from "vitest";

import { hasUsablePhoto } from "./photo";

/**
 * 이 판정 하나가 **사진 자리를 만들지 말지**를 정한다. 거짓이면 카드에 세로 스트립이
 * 아예 생기지 않고 상세 머리말의 띠도 없다. 카드·상세가 같은 답을 받아야 한다.
 */
describe("hasUsablePhoto", () => {
  it("주소가 없으면 자리를 만들지 않는다", () => {
    expect(hasUsablePhoto(null)).toBe(false);
    expect(hasUsablePhoto(undefined)).toBe(false);
    expect(hasUsablePhoto("")).toBe(false);
  });

  it("예시 주소는 사진으로 치지 않는다 — 응답도 실패도 하지 않아 빈 자리로 남는다", () => {
    expect(hasUsablePhoto("https://example.com/photo.jpg")).toBe(false);
    expect(hasUsablePhoto("http://www.example.com/a.png")).toBe(false);
    expect(hasUsablePhoto("https://example.org/a.png")).toBe(false);
    expect(hasUsablePhoto("https://example.net/a.png")).toBe(false);
    expect(hasUsablePhoto("https://placeholder.com/a.png")).toBe(false);
  });

  it("실제 주소는 사진 자리를 만든다", () => {
    expect(hasUsablePhoto("https://cdn.pawspot.example.io/a.jpg")).toBe(true);
    expect(hasUsablePhoto("/uploads/place-1.jpg")).toBe(true);
  });

  it("프로토콜을 생략한 예시 주소도 거른다", () => {
    expect(hasUsablePhoto("//example.com/a.jpg")).toBe(false);
  });

  /**
   * 이 판정은 **호스트만** 본다. 형식이 이상한 값은 상대 경로로 읽혀 자리를 얻지만,
   * 불러오기가 실패하면 패턴만 남으므로 빈 띠가 생기지 않는다(§6 Place Thumb).
   * 여기서 더 걸러 내려 하면 실제 상대 경로 사진까지 막힌다.
   */
  it("형식이 이상한 값은 상대 경로로 읽혀 자리를 얻는다 — 실패는 불러오기가 처리한다", () => {
    expect(hasUsablePhoto("not-a-url")).toBe(true);
  });
});

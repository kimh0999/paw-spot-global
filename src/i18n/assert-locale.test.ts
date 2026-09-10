import { describe, expect, it, vi } from "vitest";

/**
 * `notFound()`는 실제로 던지는 특수 오류라 테스트에서는 알아볼 수 있는 오류로 바꾼다.
 * 확인하려는 것은 "던졌는가"이지 Next 내부 동작이 아니다.
 */
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

import { assertSupportedLocale } from "./assert-locale";

/**
 * 미들웨어 matcher가 점이 든 경로를 건너뛰기 때문에 `/nope.ico` 같은 요청이
 * `locale="nope.ico"`로 `[locale]` 세그먼트에 들어온다. 이 검사가 없으면 홈이 통째로
 * 잘못된 locale로 렌더되고 장소 조회까지 실행된다.
 */
describe("assertSupportedLocale", () => {
  it("지원하는 locale은 그대로 돌려준다", () => {
    expect(assertSupportedLocale("ko")).toBe("ko");
    expect(assertSupportedLocale("en")).toBe("en");
  });

  it("정적 자산처럼 보이는 경로는 404로 끊는다", () => {
    expect(() => assertSupportedLocale("favicon.ico")).toThrow("NEXT_NOT_FOUND");
    expect(() => assertSupportedLocale("robots.txt")).toThrow("NEXT_NOT_FOUND");
    expect(() => assertSupportedLocale("apple-touch-icon.png")).toThrow("NEXT_NOT_FOUND");
  });

  it("지원하지 않는 언어 코드도 404로 끊는다", () => {
    expect(() => assertSupportedLocale("ja")).toThrow("NEXT_NOT_FOUND");
    expect(() => assertSupportedLocale("")).toThrow("NEXT_NOT_FOUND");
  });
});

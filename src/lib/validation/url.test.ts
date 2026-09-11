import { describe, expect, it } from "vitest";

import { httpUrlSchema, optionalHttpUrlText, safeHttpUrl } from "./url";

/**
 * 이 검사가 막는 것은 **저장된 값이 그대로 `href`가 되는 경로**다.
 * 장소 상세의 홈페이지, 병원 상세의 홈페이지, 확인 근거의 출처 링크 세 곳이 그렇다.
 *
 * 여기서 고정하는 경계는 "스킴"이다. 스킴을 문자열로 비교하면 `java\tscript:`처럼
 * 제어문자를 끼운 변형에 뚫린다 — `new URL()`이 탭·개행을 지우고 파싱하기 때문이다.
 * 그래서 파싱 결과의 protocol을 보는 `z.httpUrl()`을 쓴다.
 */
describe("httpUrlSchema", () => {
  it("http·https는 받는다", () => {
    for (const value of [
      "http://example.com",
      "https://example.com",
      "https://example.co.kr/path?q=1#frag",
      "https://sub.domain.example.com:8080/a",
      "HTTPS://Example.COM/Path",
    ]) {
      expect(httpUrlSchema.safeParse(value).success, value).toBe(true);
    }
  });

  it("스크립트를 실행시키는 스킴을 막는다", () => {
    for (const value of [
      "javascript:alert(1)",
      "JaVaScript:alert(1)",
      "  javascript:alert(1)  ",
      "java\tscript:alert(1)",
      "java\nscript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
    ]) {
      expect(httpUrlSchema.safeParse(value).success, value).toBe(false);
    }
  });

  it("스킴이 없거나 http가 아닌 값을 막는다", () => {
    for (const value of ["//evil.com", "evil.com", "/relative/path", "file:///etc/passwd", ""]) {
      expect(httpUrlSchema.safeParse(value).success, value).toBe(false);
    }
  });

  /**
   * 호스트 형식까지 좁아지는 것은 의도한 결과다. 공개 홈페이지 주소를 저장하는
   * 자리라 내부망·IP 주소가 들어올 이유가 없다. 좁아진다는 사실 자체를 고정해 둔다.
   */
  it("도메인이 아닌 호스트는 받지 않는다", () => {
    for (const value of ["https://localhost:3000", "https://192.168.0.1/", "https://[::1]/"]) {
      expect(httpUrlSchema.safeParse(value).success, value).toBe(false);
    }
  });

  it("앞뒤 공백은 떼고 통과시킨다", () => {
    const parsed = httpUrlSchema.safeParse("  https://example.com/a  ");
    expect(parsed.success && parsed.data).toBe("https://example.com/a");
  });
});

/**
 * 선택 입력의 빈 값 처리는 기존 `optionalText`와 같아야 한다.
 * 폼은 빈 칸을 `""`로 보내고 DB는 `NULL`을 돌려준다. 둘 다 "값 없음"이다.
 */
describe("optionalHttpUrlText", () => {
  it("빈 문자열·공백만 있는 값·null은 null이 된다", () => {
    for (const value of ["", "   ", "\t\n", null]) {
      const parsed = optionalHttpUrlText.safeParse(value);
      expect(parsed.success, JSON.stringify(value)).toBe(true);
      expect(parsed.success && parsed.data).toBe(null);
    }
  });

  it("값이 있으면 http/https만 받는다", () => {
    expect(optionalHttpUrlText.safeParse("https://example.com").success).toBe(true);
    expect(optionalHttpUrlText.safeParse("javascript:alert(1)").success).toBe(false);
    expect(optionalHttpUrlText.safeParse("  javascript:alert(1)  ").success).toBe(false);
  });

  it("undefined는 받지 않는다 — 기존 동작 그대로 키가 있어야 한다", () => {
    expect(optionalHttpUrlText.safeParse(undefined).success).toBe(false);
  });
});

/**
 * 스키마를 고치기 **전에** 저장된 값이 남아 있을 수 있다. 화면은 그런 값을
 * 링크로 만들지 않는다.
 */
describe("safeHttpUrl", () => {
  it("값이 없으면 null", () => {
    expect(safeHttpUrl(null)).toBe(null);
    expect(safeHttpUrl(undefined)).toBe(null);
    expect(safeHttpUrl("")).toBe(null);
  });

  it("위험한 스킴은 null이라 링크가 만들어지지 않는다", () => {
    expect(safeHttpUrl("javascript:alert(document.cookie)")).toBe(null);
    expect(safeHttpUrl("java\tscript:alert(1)")).toBe(null);
    expect(safeHttpUrl("data:text/html,<script>alert(1)</script>")).toBe(null);
  });

  it("정상 주소는 다듬어서 그대로 돌려준다", () => {
    expect(safeHttpUrl("https://example.com/a")).toBe("https://example.com/a");
    expect(safeHttpUrl("  https://example.com/a  ")).toBe("https://example.com/a");
  });
});

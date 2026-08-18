import { describe, expect, it } from "vitest";

import { getSafeCallbackUrl } from "@/lib/auth/safe-callback-url";

const FALLBACK = "/ko";

describe("getSafeCallbackUrl", () => {
  it("로그인 후 반려견 관리 화면으로 돌아온다", () => {
    expect(getSafeCallbackUrl("/ko/profile/dogs", "ko", FALLBACK)).toBe(
      "/ko/profile/dogs",
    );
  });

  it("query와 hash를 유지한다", () => {
    expect(getSafeCallbackUrl("/ko/profile/dogs?form=new", "ko", FALLBACK)).toBe(
      "/ko/profile/dogs?form=new",
    );
  });

  it("외부 URL을 차단한다", () => {
    expect(getSafeCallbackUrl("https://evil.example.com", "ko", FALLBACK)).toBe(
      FALLBACK,
    );
    expect(getSafeCallbackUrl("//evil.example.com/ko", "ko", FALLBACK)).toBe(FALLBACK);
    expect(getSafeCallbackUrl("/ko/%2f%2fevil.example.com", "ko", FALLBACK)).toBe(
      FALLBACK,
    );
    expect(getSafeCallbackUrl("\\\\evil.example.com", "ko", FALLBACK)).toBe(FALLBACK);
  });

  it("다른 locale이나 문자열이 아닌 값은 fallback으로 떨어진다", () => {
    expect(getSafeCallbackUrl("/en/profile/dogs", "ko", FALLBACK)).toBe(FALLBACK);
    expect(getSafeCallbackUrl(undefined, "ko", FALLBACK)).toBe(FALLBACK);
    expect(getSafeCallbackUrl(["/ko/profile/dogs"], "ko", FALLBACK)).toBe(FALLBACK);
  });
});

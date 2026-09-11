import { describe, expect, it } from "vitest";

import { vetClinicInputSchema } from "./validation";

/**
 * `url.test.ts`는 공용 스키마 자체를 본다. 여기서 고정하는 것은 **배선**이다 —
 * 병원 저장 스키마의 `website`와 확인 기록의 `sourceUrl`에 그 규칙이 실제로 걸려 있는지,
 * 그리고 선택 입력의 빈 값 처리가 그대로인지.
 *
 * 이 두 값은 병원 상세와 확인 근거 줄에서 그대로 `href`가 된다. 저장을 막는 곳이
 * 여기 하나뿐이라 스키마가 바뀌면 화면까지 바로 영향을 받는다.
 */
function base(overrides: Record<string, unknown> = {}) {
  return {
    nameKr: "테스트동물병원",
    nameEn: null,
    district: "seo",
    address: "대전 서구 둔산동 1",
    phone: "042-000-0000",
    website: null,
    location: null,
    hoursNote: null,
    englishSupport: { status: "UNKNOWN", condition: null },
    afterHours: { status: "UNKNOWN", condition: null },
    visibility: "DRAFT",
    adminNote: null,
    collectedAt: null,
    verifications: [],
    ...overrides,
  };
}

function check(overrides: Record<string, unknown> = {}) {
  return {
    target: "BASIC",
    method: "WEBSITE",
    verifiedAt: "2026-09-08",
    sourceUrl: null,
    note: null,
    ...overrides,
  };
}

describe("vetClinicInputSchema — website", () => {
  it("스크립트를 실행시키는 스킴을 저장 단계에서 막는다", () => {
    for (const value of [
      "javascript:alert(document.cookie)",
      "JaVaScript:alert(1)",
      "  javascript:alert(1)  ",
      "java\tscript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
    ]) {
      const parsed = vetClinicInputSchema.safeParse(base({ website: value }));
      expect(parsed.success, value).toBe(false);
    }
  });

  it("http/https는 그대로 받는다", () => {
    const parsed = vetClinicInputSchema.safeParse(base({ website: "https://clinic.example.com/a" }));
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.website).toBe("https://clinic.example.com/a");
  });

  /** 폼은 빈 칸을 `""`로 보내고 DB는 `NULL`을 돌려준다. 둘 다 "값 없음"이어야 한다. */
  it("빈 문자열·공백·null은 모두 null이 된다 — 기존 동작", () => {
    for (const value of ["", "   ", null]) {
      const parsed = vetClinicInputSchema.safeParse(base({ website: value }));
      expect(parsed.success, JSON.stringify(value)).toBe(true);
      expect(parsed.success && parsed.data.website).toBe(null);
    }
  });
});

describe("vetClinicInputSchema — 확인 기록의 sourceUrl", () => {
  it("스크립트를 실행시키는 스킴을 막는다", () => {
    const parsed = vetClinicInputSchema.safeParse(
      base({ verifications: [check({ sourceUrl: "javascript:alert(1)" })] }),
    );
    expect(parsed.success).toBe(false);
  });

  it("http/https는 받고, 빈 값은 null이 된다", () => {
    const ok = vetClinicInputSchema.safeParse(
      base({ verifications: [check({ sourceUrl: "https://source.example.com/page" })] }),
    );
    expect(ok.success).toBe(true);
    expect(ok.success && ok.data.verifications[0].sourceUrl).toBe("https://source.example.com/page");

    const empty = vetClinicInputSchema.safeParse(
      base({ verifications: [check({ sourceUrl: "" })] }),
    );
    expect(empty.success).toBe(true);
    expect(empty.success && empty.data.verifications[0].sourceUrl).toBe(null);
  });
});

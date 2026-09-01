import { describe, expect, it } from "vitest";

import { placeUpdateSchema } from "@/lib/validation/place";

/** 폼이 보내는 평평한 값. 검증 정보는 빈 문자열로 "변경 없음"을 뜻한다. */
function formInput(verification: Record<string, unknown> = {}) {
  return {
    nameKr: "테스트 카페",
    nameEn: null,
    category: "CAFE",
    address: "대전시 어딘가",
    location: { lat: 36.35, lng: 127.38 },
    phone: null,
    website: null,
    instagram: null,
    thumbnailUrl: null,
    tourApiId: null,
    visibility: "VISIBLE",
    condition: {
      indoor: "UNKNOWN",
      carrierStrollerPolicy: "UNKNOWN",
      maxDogSize: "UNKNOWN",
      leash: "UNKNOWN",
      muzzle: "UNKNOWN",
      vaccinationCertificatePolicy: "UNKNOWN",
      breedRestrictions: null,
      requiredItems: [],
      cautions: null,
      clearPolicyDetails: false,
    },
    verification: {
      method: "",
      verifiedAt: "",
      note: undefined,
      sourceLanguages: [],
      sourceUrl: null,
      ...verification,
    },
  };
}

describe("placeUpdateSchema — 안내문 원문 스냅샷", () => {
  it("검증 정보를 비워 두면 스냅샷 없이 통과한다", () => {
    const parsed = placeUpdateSchema.safeParse(formInput());
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.verification).toBeUndefined();
  });

  // 스냅샷은 Verification 행에 실린다. 담을 행이 없으면 조용히 버리지 않고 알린다.
  it("확인 방법·확인일 없이 원문만 채우면 거부한다", () => {
    const parsed = placeUpdateSchema.safeParse(
      formInput({ rawPolicyText: "목줄 또는 이동가방 필수" }),
    );
    expect(parsed.success).toBe(false);
    expect(parsed.success === false && parsed.error.issues[0].message).toBe(
      "snapshotWithoutVerification",
    );
  });

  it("확인 방법·확인일 없이 언어만 골라도 거부한다", () => {
    const parsed = placeUpdateSchema.safeParse(formInput({ sourceLanguages: ["ko"] }));
    expect(parsed.success).toBe(false);
    expect(parsed.success === false && parsed.error.issues[0].message).toBe(
      "snapshotWithoutVerification",
    );
  });

  it("확인 방법·확인일과 함께 오면 스냅샷을 그대로 넘긴다", () => {
    const parsed = placeUpdateSchema.safeParse(
      formInput({
        method: "ON_SITE",
        verifiedAt: "2026-08-20",
        rawPolicyText: "대형견은 야외 좌석만 이용 가능\nLarge dogs: outdoor seats only",
        sourceLanguages: ["ko", "en"],
        sourceUrl: "https://example.com/notice",
      }),
    );
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.verification).toMatchObject({
      method: "ON_SITE",
      rawPolicyText: "대형견은 야외 좌석만 이용 가능\nLarge dogs: outdoor seats only",
      sourceLanguages: ["ko", "en"],
      sourceUrl: "https://example.com/notice",
    });
  });

  it("출처 URL 형식이 잘못되면 거부한다", () => {
    const parsed = placeUpdateSchema.safeParse(
      formInput({ method: "PHONE", verifiedAt: "2026-08-20", sourceUrl: "example.com" }),
    );
    expect(parsed.success).toBe(false);
    expect(parsed.success === false && parsed.error.issues[0].path).toEqual([
      "verification",
      "sourceUrl",
    ]);
  });
});

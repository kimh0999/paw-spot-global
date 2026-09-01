import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

// 실제 모듈은 DB에 붙으므로 prisma만 대체한다. 검증 대상은 upsert에 실리는 값이다.
const { placeCondition, verification, executeRaw } = vi.hoisted(() => ({
  placeCondition: { upsert: vi.fn() },
  verification: { findFirst: vi.fn(), create: vi.fn() },
  executeRaw: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => {
  const tx = {
    $executeRaw: executeRaw,
    placeCondition,
    verification,
  };
  return {
    prisma: {
      verification,
      $transaction: vi.fn(async (run: (t: typeof tx) => unknown) => run(tx)),
    },
  };
});

import { updatePlaceRecord } from "@/lib/places/update-place";
import { EMPTY_POLICY_DETAILS } from "@/lib/places/policy-details";
import type { PlaceUpdate } from "@/lib/validation/place";

const admin = { email: "admin@example.com" } as Parameters<typeof updatePlaceRecord>[2];

type Verification = NonNullable<PlaceUpdate["verification"]>;

/** 폼이 보내는 검증 정보. 원문 스냅샷이 없으면 빈 값으로 들어온다. */
function verificationInput(overrides: Partial<Verification> = {}): Verification {
  return {
    method: "PHONE",
    verifiedAt: new Date("2026-08-01T00:00:00.000Z"),
    note: undefined,
    rawPolicyText: undefined,
    sourceLanguages: [],
    sourceUrl: null,
    ...overrides,
  } as Verification;
}

/** DB에 남아 있는 최신 이력. */
function currentRow(overrides: Record<string, unknown> = {}) {
  return {
    method: "PHONE",
    verifiedAt: new Date("2026-08-01T00:00:00.000Z"),
    note: null,
    rawPolicyText: null,
    sourceLanguages: [],
    sourceUrl: null,
    ...overrides,
  };
}

/** 핵심 조건은 관리자가 고른 값 그대로 들어온다. */
function input(
  condition: Partial<PlaceUpdate["condition"]> = {},
  verification?: PlaceUpdate["verification"],
): PlaceUpdate {
  return {
    nameKr: "테스트 카페",
    nameEn: null,
    category: "CAFE",
    address: "서울시 어딘가",
    location: { lat: 37.5, lng: 127.0 },
    phone: null,
    website: null,
    instagram: null,
    thumbnailUrl: null,
    tourApiId: null,
    visibility: "VISIBLE",
    condition: {
      indoor: "PARTIAL_AREA",
      carrierStrollerPolicy: "UNKNOWN",
      maxDogSize: "MEDIUM",
      leash: "PARTIAL_AREA",
      muzzle: "CONDITIONAL",
      vaccinationCertificatePolicy: "REQUIRED",
      breedRestrictions: null,
      requiredItems: [],
      cautions: null,
      clearPolicyDetails: false,
      ...condition,
    },
    verification,
  } as PlaceUpdate;
}

function upsertedCondition() {
  return placeCondition.upsert.mock.calls[0][0].update as Record<string, unknown>;
}

beforeEach(() => {
  vi.clearAllMocks();
  verification.findFirst.mockResolvedValue(null);
});

describe("구조화 상세 조건 초기화", () => {
  it("초기화 신호가 오면 policyDetails를 DB NULL로 되돌린다", async () => {
    await updatePlaceRecord("place-1", input({ clearPolicyDetails: true }), admin);

    expect(upsertedCondition().policyDetails).toBe(Prisma.DbNull);
  });

  // 사용자가 명시한 요구: 초기화해도 실내·크기·목줄 같은 핵심 조건은 남아야 한다.
  it("초기화해도 핵심 조건 컬럼은 그대로 유지한다", async () => {
    await updatePlaceRecord("place-1", input({ clearPolicyDetails: true }), admin);

    const saved = upsertedCondition();
    expect(saved.indoor).toBe("PARTIAL_AREA");
    expect(saved.maxDogSize).toBe("MEDIUM");
    expect(saved.leash).toBe("PARTIAL_AREA");
    expect(saved.muzzle).toBe("CONDITIONAL");
    expect(saved.vaccinationCertificatePolicy).toBe("REQUIRED");
  });

  // 폼이 JSON 본문을 보내지 않으므로 "신호 없음"이 "지우기"가 되면 안 된다.
  it("초기화 신호가 없으면 기존 JSON을 건드리지 않는다", async () => {
    await updatePlaceRecord("place-1", input(), admin);

    expect(upsertedCondition()).not.toHaveProperty("policyDetails");
  });

  it("초기화 신호가 값보다 우선한다", async () => {
    await updatePlaceRecord(
      "place-1",
      input({ clearPolicyDetails: true, policyDetails: EMPTY_POLICY_DETAILS }),
      admin,
    );

    expect(upsertedCondition().policyDetails).toBe(Prisma.DbNull);
  });

  it("값이 오면 그대로 저장한다", async () => {
    await updatePlaceRecord(
      "place-1",
      input({ policyDetails: EMPTY_POLICY_DETAILS }),
      admin,
    );

    expect(upsertedCondition().policyDetails).toEqual(EMPTY_POLICY_DETAILS);
  });
});

describe("안내문 원문 스냅샷 이력", () => {
  function createdVerification() {
    return verification.create.mock.calls[0][0].data as Record<string, unknown>;
  }

  it("원문이 달라지면 새 이력을 만든다", async () => {
    verification.findFirst.mockResolvedValue(currentRow());

    await updatePlaceRecord(
      "place-1",
      input({}, verificationInput({ rawPolicyText: "목줄 또는 이동가방 필수" })),
      admin,
    );

    expect(verification.create).toHaveBeenCalledTimes(1);
    expect(createdVerification().rawPolicyText).toBe("목줄 또는 이동가방 필수");
  });

  it("원문·언어·출처가 모두 그대로면 새 이력을 만들지 않는다", async () => {
    verification.findFirst.mockResolvedValue(
      currentRow({
        rawPolicyText: "목줄 또는 이동가방 필수",
        sourceLanguages: ["ko", "en"],
        sourceUrl: "https://example.com/notice",
      }),
    );

    await updatePlaceRecord(
      "place-1",
      input(
        {},
        verificationInput({
          rawPolicyText: "목줄 또는 이동가방 필수",
          sourceLanguages: ["ko", "en"],
          sourceUrl: "https://example.com/notice",
        }),
      ),
      admin,
    );

    expect(verification.create).not.toHaveBeenCalled();
  });

  // 체크박스 순서가 바뀌었다고 같은 원문을 다시 쌓지 않는다.
  it("언어 순서만 다르면 변경으로 보지 않는다", async () => {
    verification.findFirst.mockResolvedValue(
      currentRow({ sourceLanguages: ["ko", "en"] }),
    );

    await updatePlaceRecord(
      "place-1",
      input({}, verificationInput({ sourceLanguages: ["en", "ko"] })),
      admin,
    );

    expect(verification.create).not.toHaveBeenCalled();
  });

  // 폼은 빈 칸을 ""로, DB는 NULL로 준다. 정규화가 없으면 매번 새 행이 쌓인다.
  it("빈 문자열과 NULL을 같은 값으로 본다", async () => {
    verification.findFirst.mockResolvedValue(currentRow({ note: null, sourceUrl: null }));

    await updatePlaceRecord(
      "place-1",
      input({}, verificationInput({ note: "", sourceUrl: "" })),
      admin,
    );

    expect(verification.create).not.toHaveBeenCalled();
  });

  it("원문을 비우면 기존 행을 고치지 않고 비워진 이력을 새로 만든다", async () => {
    verification.findFirst.mockResolvedValue(
      currentRow({ rawPolicyText: "예전 안내문", sourceLanguages: ["ko"] }),
    );

    await updatePlaceRecord(
      "place-1",
      input({}, verificationInput({ rawPolicyText: undefined, sourceLanguages: [] })),
      admin,
    );

    expect(verification.create).toHaveBeenCalledTimes(1);
    expect(createdVerification().rawPolicyText).toBeNull();
    expect(createdVerification().sourceLanguages).toEqual([]);
  });

  // 바뀐 필드만 담으면 이력 행 하나로 당시 상태를 복원할 수 없다.
  it("새 이력에 검증 정보와 원문 스냅샷의 현재 값을 모두 담는다", async () => {
    verification.findFirst.mockResolvedValue(currentRow());

    await updatePlaceRecord(
      "place-1",
      input(
        {},
        verificationInput({
          method: "ON_SITE",
          verifiedAt: new Date("2026-08-20T00:00:00.000Z"),
          note: "직접 방문 확인",
          rawPolicyText: "대형견은 야외 좌석만 이용 가능",
          sourceLanguages: ["ko"],
          sourceUrl: "https://example.com/notice",
        }),
      ),
      admin,
    );

    expect(createdVerification()).toMatchObject({
      placeId: "place-1",
      verifiedBy: admin.email,
      method: "ON_SITE",
      verifiedAt: new Date("2026-08-20T00:00:00.000Z"),
      note: "직접 방문 확인",
      rawPolicyText: "대형견은 야외 좌석만 이용 가능",
      sourceLanguages: ["ko"],
      sourceUrl: "https://example.com/notice",
    });
  });
});

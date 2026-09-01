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

/** 핵심 조건은 관리자가 고른 값 그대로 들어온다. */
function input(condition: Partial<PlaceUpdate["condition"]> = {}): PlaceUpdate {
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
    verification: undefined,
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

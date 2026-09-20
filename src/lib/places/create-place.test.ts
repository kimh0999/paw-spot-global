import { beforeEach, describe, expect, it, vi } from "vitest";

// 실제 모듈은 DB에 붙으므로 prisma만 대체한다. 검증 대상은 create에 실리는 값이다.
const { placeCondition, verification, executeRaw } = vi.hoisted(() => ({
  placeCondition: { create: vi.fn() },
  verification: { create: vi.fn() },
  executeRaw: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => {
  const tx = { $executeRaw: executeRaw, placeCondition, verification };
  return {
    prisma: { $transaction: vi.fn(async (run: (t: typeof tx) => unknown) => run(tx)) },
  };
});

import { createPlaceRecord } from "@/lib/places/create-place";
import {
  PolicyDetailsWriteError,
  type PolicyDetailsFormInput,
} from "@/lib/places/policy-details-form";
import type { PolicyDetails } from "@/lib/places/policy-details";
import type { PlaceInput } from "@/lib/validation/place";

const admin = { email: "admin@example.com" } as Parameters<typeof createPlaceRecord>[1];

/** 편집기가 보내는 8개 그룹. */
function submitted(
  overrides: Partial<PolicyDetailsFormInput> = {},
): PolicyDetailsFormInput {
  return {
    entry: { vaccinationCompletionPolicy: "UNKNOWN" },
    preparation: [],
    handling: [],
    spaceExceptions: [],
    behaviorRestrictions: [],
    admission: null,
    hygiene: [],
    uncertainties: [],
    ...overrides,
  };
}

function input(condition: Partial<PlaceInput["condition"]> = {}): PlaceInput {
  return {
    nameKr: "새 카페",
    nameEn: null,
    category: "CAFE",
    address: "서울시 어딘가",
    location: { lat: 37.5, lng: 127.0 },
    hours: null,
    hoursNote: null,
    parking: "UNKNOWN",
    phone: null,
    website: null,
    instagram: null,
    thumbnailUrl: null,
    tourApiId: null,
    visibility: "VISIBLE",
    condition: {
      indoor: "ALLOWED",
      carrierStrollerPolicy: "UNKNOWN",
      maxDogSize: "MEDIUM",
      leash: "UNKNOWN",
      muzzle: "UNKNOWN",
      vaccinationCertificatePolicy: "UNKNOWN",
      breedRestrictions: null,
      requiredItems: [],
      cautions: null,
      ...condition,
    },
    verification: {
      method: "PHONE",
      verifiedAt: new Date("2026-09-01T00:00:00.000Z"),
      note: undefined,
      rawPolicyText: undefined,
      sourceLanguages: [],
      sourceUrl: null,
    },
  } as PlaceInput;
}

function createdCondition() {
  return placeCondition.create.mock.calls[0][0].data as Record<string, unknown>;
}

function createdPolicyDetails() {
  return createdCondition().policyDetails as PolicyDetails;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("신규 등록 — 구조화 상세 조건", () => {
  it("편집기를 열지 않으면 상세 조건 없이 만든다", async () => {
    await createPlaceRecord(input(), admin);

    expect(createdCondition()).not.toHaveProperty("policyDetails");
  });

  it("8개 그룹을 제출값 그대로 저장한다", async () => {
    await createPlaceRecord(
      input(),
      admin,
      submitted({
        entry: { vaccinationCompletionPolicy: "REQUIRED" },
        spaceExceptions: [
          { area: "FLOOR", floor: -1, appliesToSize: "ALL", access: "NOT_ALLOWED" },
        ],
        behaviorRestrictions: [{ trigger: "BARKING", outcome: "MAY_RESTRICT" }],
        admission: {
          feePolicy: "PAID",
          rates: [{ period: "WEEKDAY", amountKrw: 10000, dogSize: "ALL" }],
          includedServices: ["음료 1잔"],
        },
        hygiene: ["POOP_OWNER_HANDLES", "OWNER_LIABILITY"],
      }),
    );

    const saved = createdPolicyDetails();
    expect(saved.version).toBe(1);
    expect(saved.entry.vaccinationCompletionPolicy).toBe("REQUIRED");
    expect(saved.spaceExceptions).toEqual([
      { area: "FLOOR", floor: -1, appliesToSize: "ALL", access: "NOT_ALLOWED" },
    ]);
    expect(saved.behaviorRestrictions).toEqual([
      { trigger: "BARKING", outcome: "MAY_RESTRICT" },
    ]);
    expect(saved.admission?.includedServices).toEqual(["음료 1잔"]);
    expect(saved.hygiene).toEqual(["POOP_OWNER_HANDLES", "OWNER_LIABILITY"]);
  });

  it("의미가 어긋난 조합이면 장소를 만들지 않는다", async () => {
    await expect(
      createPlaceRecord(
        input(),
        admin,
        submitted({
          behaviorRestrictions: [
            { trigger: "BARKING", outcome: "MAY_RESTRICT" },
            { trigger: "BARKING", outcome: "NO_ENTRY" },
          ],
        }),
      ),
    ).rejects.toBeInstanceOf(PolicyDetailsWriteError);

    expect(placeCondition.create).not.toHaveBeenCalled();
  });

  it("배변봉투 정합성을 신규 등록에도 적용한다", async () => {
    await createPlaceRecord(
      input({ requiredItems: [] }),
      admin,
      submitted({
        preparation: [
          {
            mode: "ALL_OF",
            scope: "ALWAYS",
            items: [{ item: "POOP_BAG", status: "REQUIRED" }],
          },
        ],
      }),
    );

    expect(createdCondition().requiredItems).toEqual(["POOP_BAG"]);
  });
});

import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

// 실제 모듈은 DB에 붙으므로 prisma만 대체한다. 검증 대상은 upsert에 실리는 값이다.
const { placeCondition, verification, executeRaw } = vi.hoisted(() => ({
  placeCondition: { upsert: vi.fn(), findUnique: vi.fn() },
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
import {
  PolicyDetailsWriteError,
  type PolicyDetailsFormInput,
} from "@/lib/places/policy-details-form";
import type { PolicyDetails } from "@/lib/places/policy-details";
import type { PlaceUpdate } from "@/lib/validation/place";

/** 편집기가 보내는 4개 필드. 나머지는 서버가 DB에서 잇는다. */
function submitted(
  overrides: Partial<PolicyDetailsFormInput> = {},
): PolicyDetailsFormInput {
  return {
    entry: { vaccinationCompletionPolicy: "UNKNOWN" },
    preparation: [],
    handling: [],
    uncertainties: [],
    ...overrides,
  };
}

/** 편집 화면에 없는 5개 필드가 채워져 있는 기존 값. */
const EXISTING: PolicyDetails = {
  version: 1,
  entry: { vaccinationCompletionPolicy: "REQUIRED" },
  preparation: [
    { mode: "ALL_OF", scope: "ALWAYS", items: [{ item: "POOP_BAG", status: "REQUIRED" }] },
  ],
  handling: [
    { mode: "UNKNOWN", scope: "ALWAYS", rules: [{ rule: "FREE_ROAM", status: "PROHIBITED" }] },
  ],
  spaceExceptions: [
    { area: "FLOOR", floor: 2, appliesToSize: "ALL", access: "NOT_ALLOWED" },
  ],
  behaviorRestrictions: [{ trigger: "BARKING", outcome: "MAY_RESTRICT" }],
  admission: {
    feePolicy: "PAID",
    rates: [{ period: "WEEKDAY", amountKrw: 3000, dogSize: "ALL" }],
    includedServices: ["댕푸치노 1잔"],
  },
  hygiene: ["OWNER_LIABILITY"],
  uncertainties: [{ target: "MAX_DOG_SIZE", reason: "원문에 크기 언급 없음" }],
};

function savedPolicyDetails() {
  return upsertedCondition().policyDetails as PolicyDetails;
}

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
  placeCondition.findUnique.mockResolvedValue(null);
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

  it("초기화 신호가 편집기 제출값보다 우선한다", async () => {
    placeCondition.findUnique.mockResolvedValue({ policyDetails: EXISTING });

    await updatePlaceRecord(
      "place-1",
      input({ clearPolicyDetails: true }),
      admin,
      submitted({
        preparation: [
          {
            mode: "ALL_OF",
            scope: "ALWAYS",
            items: [{ item: "LEASH", status: "REQUIRED" }],
          },
        ],
      }),
    );

    expect(upsertedCondition().policyDetails).toBe(Prisma.DbNull);
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

describe("구조화 상세 조건 병합", () => {
  const LEASH_OR_CARRIER = [
    {
      mode: "ANY_OF",
      scope: "ALWAYS",
      items: [
        { item: "LEASH", status: "REQUIRED" },
        { item: "CARRIER", status: "REQUIRED" },
      ],
    },
  ];

  // 편집기에 없는 필드를 hidden으로 왕복시키지 않으므로 DB 값이 유일한 출처다.
  it("화면에 없는 5개 필드를 수정 후에도 그대로 보존한다", async () => {
    placeCondition.findUnique.mockResolvedValue({ policyDetails: EXISTING });

    await updatePlaceRecord(
      "place-1",
      input(),
      admin,
      submitted({ preparation: LEASH_OR_CARRIER }),
    );

    const saved = savedPolicyDetails();
    expect(saved.spaceExceptions).toEqual(EXISTING.spaceExceptions);
    expect(saved.behaviorRestrictions).toEqual(EXISTING.behaviorRestrictions);
    expect(saved.admission).toEqual(EXISTING.admission);
    expect(saved.hygiene).toEqual(EXISTING.hygiene);
    expect(saved.version).toBe(1);
  });

  it("기존 값이 NULL이면 공식 기본값 위에 병합해 새로 만든다", async () => {
    placeCondition.findUnique.mockResolvedValue({ policyDetails: null });

    await updatePlaceRecord("place-1", input(), admin, submitted());

    const saved = savedPolicyDetails();
    expect(saved.version).toBe(1);
    expect(saved.spaceExceptions).toEqual([]);
    expect(saved.admission).toBeNull();
    expect(saved.hygiene).toEqual([]);
  });

  // 깨진 값을 빈 값으로 밀어버리면 무엇이 있었는지 영영 알 수 없다.
  it("기존 JSON이 깨져 있으면 저장을 중단한다", async () => {
    placeCondition.findUnique.mockResolvedValue({
      policyDetails: { version: 99, unknownKey: true },
    });

    await expect(
      updatePlaceRecord("place-1", input(), admin, submitted()),
    ).rejects.toBeInstanceOf(PolicyDetailsWriteError);
    expect(placeCondition.upsert).not.toHaveBeenCalled();
  });

  it("편집기를 제출하지 않으면 기존 JSON을 건드리지 않는다", async () => {
    placeCondition.findUnique.mockResolvedValue({ policyDetails: EXISTING });

    await updatePlaceRecord("place-1", input(), admin);

    expect(upsertedCondition()).not.toHaveProperty("policyDetails");
  });

  // "편집기 미제출"과 "빈 그룹 제출"은 다른 뜻이다.
  it("빈 그룹을 제출하면 그 그룹만 초기화하고 나머지는 남긴다", async () => {
    placeCondition.findUnique.mockResolvedValue({ policyDetails: EXISTING });

    await updatePlaceRecord("place-1", input(), admin, submitted({ preparation: [] }));

    const saved = savedPolicyDetails();
    expect(saved.preparation).toEqual([]);
    expect(saved.handling).toEqual([]);
    expect(saved.uncertainties).toEqual([]);
    expect(saved.spaceExceptions).toEqual(EXISTING.spaceExceptions);
  });

  it("handling과 uncertainties를 항목별로 저장한다", async () => {
    placeCondition.findUnique.mockResolvedValue({ policyDetails: null });

    await updatePlaceRecord(
      "place-1",
      input(),
      admin,
      submitted({
        handling: [
          {
            mode: "ANY_OF",
            scope: "ALWAYS",
            rules: [
              { rule: "HELD_BY_OWNER", status: "REQUIRED" },
              { rule: "PET_SEAT", status: "REQUIRED" },
            ],
          },
        ],
        uncertainties: [
          {
            target: "PREPARATION",
            reason: "슬래시가 택일인지 불명확",
            quote: "리드줄 / 이동가방 / 유모차 필수",
            question: "셋 중 하나만 챙기면 되나요?",
          },
        ],
      }),
    );

    const saved = savedPolicyDetails();
    expect(saved.handling[0].rules).toHaveLength(2);
    expect(saved.uncertainties[0]).toEqual({
      target: "PREPARATION",
      reason: "슬래시가 택일인지 불명확",
      quote: "리드줄 / 이동가방 / 유모차 필수",
      question: "셋 중 하나만 챙기면 되나요?",
    });
  });

  it("잘못된 enum이 담긴 제출은 거부한다", async () => {
    placeCondition.findUnique.mockResolvedValue({ policyDetails: null });

    await expect(
      updatePlaceRecord(
        "place-1",
        input(),
        admin,
        submitted({
          handling: [{ mode: "ANY_OF", rules: [{ rule: "TELEPORT", status: "REQUIRED" }] }],
        }),
      ),
    ).rejects.toBeInstanceOf(PolicyDetailsWriteError);
    expect(placeCondition.upsert).not.toHaveBeenCalled();
  });

  it("항목이 하나도 없는 그룹은 거부한다", async () => {
    placeCondition.findUnique.mockResolvedValue({ policyDetails: null });

    await expect(
      updatePlaceRecord(
        "place-1",
        input(),
        admin,
        submitted({ preparation: [{ mode: "ANY_OF", scope: "ALWAYS", items: [] }] }),
      ),
    ).rejects.toBeInstanceOf(PolicyDetailsWriteError);
  });
});

describe("병합 결과와 조건 컬럼 정합", () => {
  const LEASH_OR_CARRIER = [
    {
      mode: "ANY_OF",
      scope: "ALWAYS",
      items: [
        { item: "LEASH", status: "REQUIRED" },
        { item: "CARRIER", status: "REQUIRED" },
      ],
    },
  ];

  // "목줄 또는 이동가방"을 leash=REQUIRED로 저장하면 이동가방만 챙긴 방문자에게
  // 사실과 다른 안내가 나간다.
  it("택일 관계는 목줄을 REQUIRED로 단언하지 않는다", async () => {
    placeCondition.findUnique.mockResolvedValue({ policyDetails: null });

    await updatePlaceRecord(
      "place-1",
      input({ leash: "REQUIRED" }),
      admin,
      submitted({ preparation: LEASH_OR_CARRIER }),
    );

    expect(upsertedCondition().leash).toBe("UNKNOWN");
  });

  it("상세 조건이 언급하지 않은 PARTIAL_AREA는 보존한다", async () => {
    placeCondition.findUnique.mockResolvedValue({ policyDetails: null });

    await updatePlaceRecord(
      "place-1",
      input({ leash: "PARTIAL_AREA" }),
      admin,
      submitted({
        handling: [
    { mode: "UNKNOWN", scope: "ALWAYS", rules: [{ rule: "FREE_ROAM", status: "PROHIBITED" }] },
  ],
      }),
    );

    expect(upsertedCondition().leash).toBe("PARTIAL_AREA");
  });

  it("단일 항목 REQUIRED는 그대로 컬럼에 반영한다", async () => {
    placeCondition.findUnique.mockResolvedValue({ policyDetails: null });

    await updatePlaceRecord(
      "place-1",
      input({ muzzle: "UNKNOWN" }),
      admin,
      submitted({
        preparation: [
          {
            mode: "ALL_OF",
            scope: "ALWAYS",
            items: [{ item: "MUZZLE", status: "REQUIRED" }],
          },
        ],
      }),
    );

    expect(upsertedCondition().muzzle).toBe("REQUIRED");
  });

  // 접종 "완료 요구"와 증빙 "지참 요구"는 다른 조건이라 서로를 덮지 않는다.
  it("vaccinationCompletionPolicy와 VACCINATION_PROOF를 독립적으로 저장한다", async () => {
    placeCondition.findUnique.mockResolvedValue({ policyDetails: null });

    await updatePlaceRecord(
      "place-1",
      input({ vaccinationCertificatePolicy: "UNKNOWN" }),
      admin,
      submitted({ entry: { vaccinationCompletionPolicy: "REQUIRED" } }),
    );

    const saved = upsertedCondition();
    // 완료 요구만 있고 증빙 언급이 없으므로 증빙 컬럼은 관리자 입력 그대로 남는다.
    expect(saved.vaccinationCertificatePolicy).toBe("UNKNOWN");
    expect(savedPolicyDetails().entry.vaccinationCompletionPolicy).toBe("REQUIRED");
  });

  it("증빙 NOT_REQUIRED가 와도 완료 요구는 따라 바뀌지 않는다", async () => {
    placeCondition.findUnique.mockResolvedValue({ policyDetails: null });

    await updatePlaceRecord(
      "place-1",
      input({ vaccinationCertificatePolicy: "REQUIRED" }),
      admin,
      submitted({
        entry: { vaccinationCompletionPolicy: "REQUIRED" },
        preparation: [
          {
            mode: "ALL_OF",
            scope: "ALWAYS",
            items: [{ item: "VACCINATION_PROOF", status: "NOT_REQUIRED" }],
          },
        ],
      }),
    );

    expect(upsertedCondition().vaccinationCertificatePolicy).toBe("NOT_REQUIRED");
    expect(savedPolicyDetails().entry.vaccinationCompletionPolicy).toBe("REQUIRED");
  });
});

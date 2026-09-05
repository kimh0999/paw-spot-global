import { describe, expect, it } from "vitest";

import {
  EMPTY_POLICY_DETAILS,
  POLICY_DETAILS_VERSION,
  policyDetailsSchema,
  readPolicyDetails,
  type PolicyDetails,
} from "@/lib/places/policy-details";

const base = (overrides: Partial<PolicyDetails> = {}): PolicyDetails => ({
  ...EMPTY_POLICY_DETAILS,
  ...overrides,
});

describe("policyDetailsSchema — 준비물 관계", () => {
  // 원문 E "목줄 또는 이동가방 필수". 컬럼 두 개로는 AND로만 읽혀 표현할 수 없던 관계다.
  it("ANY_OF 그룹으로 둘 중 하나를 표현한다", () => {
    const result = policyDetailsSchema.safeParse(
      base({
        preparation: [
          {
            mode: "ANY_OF",
            scope: "ALWAYS",
            items: [
              { item: "LEASH", status: "REQUIRED" },
              { item: "CARRIER", status: "REQUIRED" },
            ],
          },
        ],
      }),
    );
    expect(result.success).toBe(true);
  });

  // 원문 A "리드줄 / 이동가방 / 유모차 필수" — 원문에 "또는"이 없어 관계를 확정할 수 없다.
  it("관계가 확인되지 않으면 UNKNOWN 그룹으로 남길 수 있다", () => {
    const result = policyDetailsSchema.safeParse(
      base({
        preparation: [
          {
            mode: "UNKNOWN",
            scope: "UNKNOWN",
            items: [
              { item: "LEASH", status: "REQUIRED" },
              { item: "CARRIER", status: "REQUIRED" },
              { item: "STROLLER", status: "REQUIRED" },
            ],
          },
        ],
      }),
    );
    expect(result.success).toBe(true);
  });

  // 원문 D "실내동반시 케이지나 견모차 또는 리드줄 필수".
  it("실내에만 걸리는 요구를 scope로 담는다", () => {
    const result = policyDetailsSchema.safeParse(
      base({
        preparation: [
          {
            mode: "ANY_OF",
            scope: "INDOOR",
            items: [
              { item: "CRATE", status: "REQUIRED" },
              { item: "STROLLER", status: "REQUIRED" },
              { item: "LEASH", status: "REQUIRED" },
            ],
          },
        ],
      }),
    );
    expect(result.success).toBe(true);
  });

  it("빈 그룹은 거부한다", () => {
    const result = policyDetailsSchema.safeParse(
      base({ preparation: [{ mode: "ANY_OF", scope: "ALWAYS", items: [] }] }),
    );
    expect(result.success).toBe(false);
  });

  it("목록에 없는 준비물 코드는 거부한다", () => {
    const result = policyDetailsSchema.safeParse({
      ...EMPTY_POLICY_DETAILS,
      preparation: [
        // 매너벨트는 아직 관측되지 않은 예상 유형이라 코드 목록에 없다.
        {
          mode: "ALL_OF",
          scope: "ALWAYS",
          items: [{ item: "MANNER_BELT", status: "REQUIRED" }],
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe("policyDetailsSchema — 매장 내 상태", () => {
  // 원문 A "전용 의자에 앉히거나 보호자님이 꼭 안아주세요" + "자유로운 이동은 어려워요".
  it("안기와 전용의자의 택일, 자유 이동 금지를 함께 담는다", () => {
    const result = policyDetailsSchema.safeParse(
      base({
        handling: [
          {
            mode: "ANY_OF",
            scope: "ALWAYS",
            rules: [
              { rule: "HELD_BY_OWNER", status: "REQUIRED" },
              { rule: "PET_SEAT", status: "REQUIRED" },
            ],
          },
          { mode: "ALL_OF", scope: "ALWAYS", rules: [{ rule: "FREE_ROAM", status: "PROHIBITED" }] },
        ],
      }),
    );
    expect(result.success).toBe(true);
  });
});

describe("policyDetailsSchema — 공간 예외", () => {
  // 원문 E "대형견은 야외 좌석만". maxDogSize=LARGE로는 "대형견 환영"으로 뒤집혀 읽힌다.
  it("크기와 공간을 결합한 예외를 표현한다", () => {
    const result = policyDetailsSchema.safeParse(
      base({
        spaceExceptions: [
          { area: "INDOOR", appliesToSize: "LARGE", access: "NOT_ALLOWED" },
        ],
      }),
    );
    expect(result.success).toBe(true);
  });

  // 원문 D "2층은 노펫존" — indoor=PARTIAL_AREA로는 어느 층인지 사라진다.
  it("FLOOR 예외는 층 번호를 요구한다", () => {
    const withFloor = policyDetailsSchema.safeParse(
      base({
        spaceExceptions: [
          { area: "FLOOR", floor: 2, appliesToSize: "ALL", access: "NOT_ALLOWED" },
        ],
      }),
    );
    expect(withFloor.success).toBe(true);

    const withoutFloor = policyDetailsSchema.safeParse(
      base({
        spaceExceptions: [{ area: "FLOOR", appliesToSize: "ALL", access: "NOT_ALLOWED" }],
      }),
    );
    expect(withoutFloor.success).toBe(false);
  });

  it("OTHER 구역은 이름을 요구한다", () => {
    const result = policyDetailsSchema.safeParse(
      base({
        spaceExceptions: [{ area: "OTHER", appliesToSize: "ALL", access: "ALLOWED" }],
      }),
    );
    expect(result.success).toBe(false);
  });
});

describe("policyDetailsSchema — 행동 제한과 요금", () => {
  // 원문 E는 "제한될 수 있습니다"라 MAY_RESTRICT, 원문 A·B는 강도가 불확실하다.
  it("MAY_RESTRICT와 NO_ENTRY를 구분해 담는다", () => {
    const result = policyDetailsSchema.safeParse(
      base({
        behaviorRestrictions: [
          { trigger: "BARKING", outcome: "MAY_RESTRICT" },
          { trigger: "AGGRESSION", outcome: "NO_ENTRY" },
        ],
      }),
    );
    expect(result.success).toBe(true);
  });

  // 원문 D 평일 3,000원 / 주말·공휴일 5,000원 + 댕푸치노 1잔 제공.
  it("요일별 요금과 포함 서비스를 담는다", () => {
    const result = policyDetailsSchema.safeParse(
      base({
        admission: {
          feePolicy: "PAID",
          rates: [
            { period: "WEEKDAY", amountKrw: 3000, dogSize: "ALL" },
            { period: "WEEKEND_HOLIDAY", amountKrw: 5000, dogSize: "ALL" },
          ],
          includedServices: ["댕푸치노 1잔"],
        },
      }),
    );
    expect(result.success).toBe(true);
  });

  it("무료인데 요금이 붙으면 거부한다", () => {
    const result = policyDetailsSchema.safeParse(
      base({
        admission: {
          feePolicy: "FREE",
          rates: [{ period: "ALL", amountKrw: 3000, dogSize: "ALL" }],
          includedServices: [],
        },
      }),
    );
    expect(result.success).toBe(false);
  });
});

describe("policyDetailsSchema — 예방접종", () => {
  // 매장의 요구 정책이지 개별 반려견의 접종 여부가 아니다.
  // 증빙 지참(vaccinationCertificatePolicy 컬럼)과도 다른 조건이다.
  it("완료 요구 정책을 세 상태로 구분한다", () => {
    for (const policy of ["REQUIRED", "NOT_REQUIRED", "UNKNOWN"] as const) {
      const result = policyDetailsSchema.safeParse(
        base({ entry: { vaccinationCompletionPolicy: policy } }),
      );
      expect(result.success).toBe(true);
    }
  });

  it("불리언은 거부한다", () => {
    const result = policyDetailsSchema.safeParse({
      ...EMPTY_POLICY_DETAILS,
      entry: { vaccinationCompletionPolicy: true },
    });
    expect(result.success).toBe(false);
  });
});

describe("policyDetailsSchema — 항목별 불확실성", () => {
  // 원문 C "목줄, 케이지, 전용의자" — 무엇을 물어야 하는지가 항목마다 다르다.
  it("대상·이유·근거 원문·확인 질문을 함께 남긴다", () => {
    const result = policyDetailsSchema.safeParse(
      base({
        uncertainties: [
          {
            target: "PREPARATION",
            reason: "원문에 '또는'이 없어 셋 다인지 택일인지 알 수 없다",
            quote: "목줄,케이지,전용의자를 준비해주셔야합니다",
            question: "세 가지를 모두 준비해야 하나요, 하나만 있으면 되나요?",
          },
        ],
      }),
    );
    expect(result.success).toBe(true);
  });

  it("이유 없는 불확실성은 거부한다", () => {
    const result = policyDetailsSchema.safeParse(
      base({ uncertainties: [{ target: "PREPARATION", reason: "" }] }),
    );
    expect(result.success).toBe(false);
  });
});

describe("policyDetailsSchema — 버전과 strict 검증", () => {
  it("버전이 없으면 거부한다", () => {
    const withoutVersion: Record<string, unknown> = { ...EMPTY_POLICY_DETAILS };
    delete withoutVersion.version;
    expect(policyDetailsSchema.safeParse(withoutVersion).success).toBe(false);
  });

  it("모르는 버전은 거부한다", () => {
    const result = policyDetailsSchema.safeParse({
      ...EMPTY_POLICY_DETAILS,
      version: POLICY_DETAILS_VERSION + 1,
    });
    expect(result.success).toBe(false);
  });

  // 오타나 옛 형식이 조용히 버려지면 "조건 없음"과 구별되지 않는다.
  it("모르는 키는 통과시키지 않는다", () => {
    const result = policyDetailsSchema.safeParse({
      ...EMPTY_POLICY_DETAILS,
      preparations: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("readPolicyDetails", () => {
  it("값이 없으면 empty다 — 아직 구조화되지 않은 장소", () => {
    expect(readPolicyDetails(null)).toEqual({ status: "empty", value: null });
    expect(readPolicyDetails(undefined)).toEqual({ status: "empty", value: null });
  });

  // empty와 invalid를 뭉개면 깨진 데이터가 "조건 없음"처럼 보여 조용히 사라진다.
  it("형식이 깨지면 invalid로 알리고 무엇이 틀렸는지 남긴다", () => {
    const read = readPolicyDetails({ version: 1, preparation: "리드줄" });
    expect(read.status).toBe("invalid");
    expect(read.value).toBeNull();
    if (read.status === "invalid") {
      expect(read.issues.length).toBeGreaterThan(0);
    }
  });

  it("깨진 값에도 예외를 던지지 않는다", () => {
    expect(() => readPolicyDetails("문자열")).not.toThrow();
    expect(readPolicyDetails("문자열").status).toBe("invalid");
  });

  it("유효한 값은 그대로 돌려준다", () => {
    const read = readPolicyDetails(EMPTY_POLICY_DETAILS);
    expect(read.status).toBe("ok");
    expect(read.value).toEqual(EMPTY_POLICY_DETAILS);
  });

  // UNKNOWN은 "제한 없음"이 아니라 "확인되지 않음"이다 (DESIGN.md §3.3).
  it("빈 구조는 어떤 조건도 허용으로 만들지 않는다", () => {
    const read = readPolicyDetails(EMPTY_POLICY_DETAILS);
    expect(read.value?.entry.vaccinationCompletionPolicy).toBe("UNKNOWN");
    expect(read.value?.preparation).toEqual([]);
    expect(read.value?.admission).toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import {
  POLICY_DETAILS_SUBMITTED_FIELD,
  PolicyDetailsWriteError,
  parsePolicyDetailsForm,
  resolvePolicyDetails,
  type PolicyDetailsFormInput,
} from "@/lib/places/policy-details-form";
import {
  EMPTY_POLICY_DETAILS,
  readPolicyDetails,
  type PolicyDetails,
} from "@/lib/places/policy-details";
import { derivedColumns } from "@/lib/places/condition-consistency";

function form(entries: Record<string, string | string[]>, submit = true): FormData {
  const fd = new FormData();
  if (submit) fd.set(POLICY_DETAILS_SUBMITTED_FIELD, "true");
  for (const [key, value] of Object.entries(entries)) {
    for (const one of Array.isArray(value) ? value : [value]) fd.append(key, one);
  }
  return fd;
}

const P = "condition.policyDetails";

/** 편집기가 보내는 8개 그룹. 화면을 거치지 않는 호출도 같은 모양이어야 한다. */
function submitInput(
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

describe("parsePolicyDetailsForm — 제출 신호", () => {
  it("신호가 없으면 undefined다 (기존 값 유지)", () => {
    expect(parsePolicyDetailsForm(form({}, false))).toBeUndefined();
  });

  // 편집기를 열어 모두 지운 것과 편집기를 아예 거치지 않은 것은 다른 뜻이다.
  it("신호만 있고 그룹이 없으면 빈 배열로 제출된다", () => {
    const parsed = parsePolicyDetailsForm(
      form({ [`${P}.entry.vaccinationCompletionPolicy`]: "UNKNOWN" }),
    );
    expect(parsed).toEqual({
      entry: { vaccinationCompletionPolicy: "UNKNOWN" },
      preparation: [],
      handling: [],
      spaceExceptions: [],
      behaviorRestrictions: [],
      // 입장료는 빈 배열이 아니라 null이다 — "무료"가 아니라 "다루지 않음"이다.
      admission: null,
      hygiene: [],
      uncertainties: [],
    });
  });
});

describe("parsePolicyDetailsForm — 인덱스 파싱", () => {
  it("그룹과 항목을 인덱스 순서대로 읽는다", () => {
    const parsed = parsePolicyDetailsForm(
      form({
        [`${P}.entry.vaccinationCompletionPolicy`]: "REQUIRED",
        [`${P}.preparation.0.mode`]: "ANY_OF",
        [`${P}.preparation.0.scope`]: "INDOOR",
        [`${P}.preparation.0.items.0.item`]: "LEASH",
        [`${P}.preparation.0.items.0.status`]: "REQUIRED",
        [`${P}.preparation.0.items.1.item`]: "CARRIER",
        [`${P}.preparation.0.items.1.status`]: "REQUIRED",
        [`${P}.handling.0.mode`]: "UNKNOWN",
        [`${P}.handling.0.scope`]: "INDOOR",
        [`${P}.handling.0.rules.0.rule`]: "FREE_ROAM",
        [`${P}.handling.0.rules.0.status`]: "PROHIBITED",
        [`${P}.uncertainties.0.target`]: "PREPARATION",
        [`${P}.uncertainties.0.reason`]: "슬래시가 택일인지 불명확",
      }),
    );

    expect(parsed?.preparation).toEqual([
      {
        mode: "ANY_OF",
        scope: "INDOOR",
        items: [
          { item: "LEASH", status: "REQUIRED" },
          { item: "CARRIER", status: "REQUIRED" },
        ],
      },
    ]);
    expect(parsed?.handling).toEqual([
      {
        mode: "UNKNOWN",
        scope: "INDOOR",
        rules: [{ rule: "FREE_ROAM", status: "PROHIBITED" }],
      },
    ]);
    expect(parsed?.uncertainties).toEqual([
      { target: "PREPARATION", reason: "슬래시가 택일인지 불명확" },
    ]);
  });

  it("삭제로 생긴 인덱스 구멍을 건너뛰고 순서를 유지한다", () => {
    const parsed = parsePolicyDetailsForm(
      form({
        [`${P}.entry.vaccinationCompletionPolicy`]: "UNKNOWN",
        [`${P}.uncertainties.0.target`]: "INDOOR",
        [`${P}.uncertainties.0.reason`]: "첫째",
        [`${P}.uncertainties.2.target`]: "MUZZLE",
        [`${P}.uncertainties.2.reason`]: "셋째",
      }),
    );
    expect(parsed?.uncertainties).toEqual([
      { target: "INDOOR", reason: "첫째" },
      { target: "MUZZLE", reason: "셋째" },
    ]);
  });

  it("빈 선택 항목은 빈 문자열로 남겨 검증에서 걸리게 한다", () => {
    const parsed = parsePolicyDetailsForm(
      form({
        [`${P}.entry.vaccinationCompletionPolicy`]: "UNKNOWN",
        [`${P}.preparation.0.mode`]: "ANY_OF",
        [`${P}.preparation.0.scope`]: "ALWAYS",
        [`${P}.preparation.0.items.0.item`]: "",
        [`${P}.preparation.0.items.0.status`]: "REQUIRED",
      }),
    );
    expect(() => resolvePolicyDetails(null, parsed)).toThrow(PolicyDetailsWriteError);
  });
});

describe("parsePolicyDetailsForm — 조작된 입력", () => {
  // 값은 필드 단위로만 오간다. JSON 본문을 넣어도 읽는 경로가 없다.
  it("JSON 본문을 통째로 보내도 읽지 않는다", () => {
    const parsed = parsePolicyDetailsForm(
      form({
        [`${P}.entry.vaccinationCompletionPolicy`]: "UNKNOWN",
        [`${P}.hygiene`]: "OWNER_LIABILITY",
        "condition.policyDetails": JSON.stringify({
          ...EMPTY_POLICY_DETAILS,
          hygiene: ["PET_DISHES_ONLY"],
        }),
      }),
    );

    expect(parsed?.hygiene).toEqual(["OWNER_LIABILITY"]);
  });

  it("알 수 없는 하위 필드는 무시한다", () => {
    const parsed = parsePolicyDetailsForm(
      form({
        [`${P}.entry.vaccinationCompletionPolicy`]: "UNKNOWN",
        [`${P}.spaceExceptions.0.area`]: "INDOOR",
        [`${P}.spaceExceptions.0.appliesToSize`]: "ALL",
        [`${P}.spaceExceptions.0.access`]: "NOT_ALLOWED",
        [`${P}.spaceExceptions.0.secretFlag`]: "true",
      }),
    );

    expect(parsed?.spaceExceptions).toEqual([
      {
        area: "INDOOR",
        floor: undefined,
        label: undefined,
        appliesToSize: "ALL",
        access: "NOT_ALLOWED",
      },
    ]);
  });
});

describe("resolvePolicyDetails", () => {
  it("제출이 없으면 기존 값을 건드리지 않는다", () => {
    const existing: PolicyDetails = { ...EMPTY_POLICY_DETAILS, hygiene: ["OWNER_LIABILITY"] };
    const resolved = resolvePolicyDetails(existing, undefined);

    expect(resolved.write).toEqual({});
    expect(resolved.effective).toEqual(existing);
  });

  it("기존 값이 깨져 있으면 병합하지 않고 중단한다", () => {
    expect(() => resolvePolicyDetails({ version: 2 }, submitInput())).toThrow(
      PolicyDetailsWriteError,
    );
  });

  it("깨진 기존 값이라도 제출이 없으면 저장을 막지 않는다", () => {
    const resolved = resolvePolicyDetails({ version: 2 }, undefined);
    expect(resolved.write).toEqual({});
    expect(resolved.effective).toBeNull();
  });

  it("version은 1로 유지된다", () => {
    const resolved = resolvePolicyDetails(null, submitInput());
    expect(resolved.write.policyDetails?.version).toBe(1);
  });
});

/**
 * 행동을 2개 이상 묶은 조건은 전부 "반드시"일 때만 허용한다.
 *
 * 묶음의 관계(모두/하나)는 요구에만 뜻이 통한다. 금지·허용·조건부를 섞으면 표시 문장에서
 * 앞 절이 요구로 읽혀 뜻이 뒤집힌다. 관리자 화면이 먼저 막지만 폼을 거치지 않는 입력도
 * 있으므로 저장 경로에서 다시 본다.
 */
describe("resolvePolicyDetails — 매장 내 상태 묶음 규칙", () => {
  function submit(rules: Array<{ rule: string; status: string }>) {
    return submitInput({ handling: [{ mode: "ANY_OF", scope: "ALWAYS", rules }] });
  }

  it("행동 2개 이상이 모두 REQUIRED면 저장한다", () => {
    const resolved = resolvePolicyDetails(
      null,
      submit([
        { rule: "HELD_BY_OWNER", status: "REQUIRED" },
        { rule: "PET_SEAT", status: "REQUIRED" },
      ]),
    );

    expect(resolved.write.policyDetails?.handling[0].rules).toHaveLength(2);
  });

  it.each(["PROHIBITED", "ALLOWED", "CONDITIONAL", "UNKNOWN"])(
    "행동 2개 이상이 %s면 저장을 거부한다",
    (status) => {
      let thrown: unknown;
      try {
        resolvePolicyDetails(
          null,
          submit([
            { rule: "FREE_ROAM", status },
            { rule: "ON_CHAIR_OR_TABLE", status },
          ]),
        );
      } catch (err) {
        thrown = err;
      }

      expect(thrown).toBeInstanceOf(PolicyDetailsWriteError);
      expect((thrown as PolicyDetailsWriteError).reason).toBe("handlingMultiNotRequired");
    },
  );

  // 하나만 REQUIRED가 아니어도 묶음 전체가 성립하지 않는다.
  it("일부만 REQUIRED여도 저장을 거부한다", () => {
    expect(() =>
      resolvePolicyDetails(
        null,
        submit([
          { rule: "HELD_BY_OWNER", status: "REQUIRED" },
          { rule: "FREE_ROAM", status: "PROHIBITED" },
        ]),
      ),
    ).toThrow(PolicyDetailsWriteError);
  });

  it.each(["PROHIBITED", "ALLOWED", "CONDITIONAL"])(
    "행동이 하나면 %s를 그대로 저장한다",
    (status) => {
      const resolved = resolvePolicyDetails(null, submit([{ rule: "FREE_ROAM", status }]));

      expect(resolved.write.policyDetails?.handling[0].rules[0].status).toBe(status);
    },
  );

  // 화면을 거치지 않고 FormData를 직접 만들어도 같은 규칙에 걸린다.
  it("관리자 화면을 우회한 FormData도 저장 경로에서 막는다", () => {
    const submitted = parsePolicyDetailsForm(
      form({
        [`${P}.entry.vaccinationCompletionPolicy`]: "UNKNOWN",
        [`${P}.handling.0.mode`]: "ANY_OF",
        [`${P}.handling.0.scope`]: "ALWAYS",
        [`${P}.handling.0.rules.0.rule`]: "FREE_ROAM",
        [`${P}.handling.0.rules.0.status`]: "PROHIBITED",
        [`${P}.handling.0.rules.1.rule`]: "ON_CHAIR_OR_TABLE",
        [`${P}.handling.0.rules.1.status`]: "PROHIBITED",
      }),
    );

    expect(() => resolvePolicyDetails(null, submitted)).toThrow(PolicyDetailsWriteError);
  });

  it("이미 저장돼 있던 어긋난 묶음도 다시 제출되면 막는다", () => {
    const existing: PolicyDetails = {
      ...EMPTY_POLICY_DETAILS,
      handling: [
        {
          mode: "ANY_OF",
          scope: "ALWAYS",
          rules: [
            { rule: "FREE_ROAM", status: "PROHIBITED" },
            { rule: "ON_CHAIR_OR_TABLE", status: "PROHIBITED" },
          ],
        },
      ],
    };

    expect(() =>
      resolvePolicyDetails(
        existing,
        submit([
          { rule: "FREE_ROAM", status: "PROHIBITED" },
          { rule: "ON_CHAIR_OR_TABLE", status: "PROHIBITED" },
        ]),
      ),
    ).toThrow(PolicyDetailsWriteError);
  });
});

/**
 * 수정 화면 로드 경로.
 * 폼 컴포넌트를 렌더링하는 테스트는 없다(프로젝트에 jsdom·RTL이 없다).
 * 화면이 쓰는 두 계산 — 기존 값 읽기와 잠금 대상 산출 — 을 데이터 수준에서 확인한다.
 */
describe("기존 policyDetails 수정 화면 로드", () => {
  const stored = {
    version: 1,
    entry: { vaccinationCompletionPolicy: "REQUIRED" },
    preparation: [
      {
        mode: "ANY_OF",
        scope: "INDOOR",
        items: [
          { item: "LEASH", status: "REQUIRED" },
          { item: "CRATE", status: "REQUIRED" },
        ],
      },
    ],
    handling: [
      { mode: "UNKNOWN", scope: "ALWAYS", rules: [{ rule: "FREE_ROAM", status: "PROHIBITED" }] },
    ],
    spaceExceptions: [{ area: "FLOOR", floor: 2, appliesToSize: "ALL", access: "NOT_ALLOWED" }],
    behaviorRestrictions: [{ trigger: "BARKING", outcome: "MAY_RESTRICT" }],
    admission: { feePolicy: "PAID", rates: [], includedServices: [] },
    hygiene: ["OWNER_LIABILITY"],
    uncertainties: [{ target: "PREPARATION", reason: "택일 여부 불명확" }],
  };

  it("저장된 값을 ok로 읽어 편집기에 그대로 넘긴다", () => {
    const read = readPolicyDetails(stored);
    expect(read.status).toBe("ok");
    if (read.status !== "ok") return;

    expect(read.value.entry.vaccinationCompletionPolicy).toBe("REQUIRED");
    expect(read.value.preparation[0].items).toHaveLength(2);
    expect(read.value.handling[0].rules[0].rule).toBe("FREE_ROAM");
    expect(read.value.uncertainties[0].reason).toBe("택일 여부 불명확");
  });

  it("8개 그룹을 모두 읽어 편집 화면에 복원한다", () => {
    const read = readPolicyDetails(stored);
    if (read.status !== "ok") throw new Error("ok가 아님");

    expect(read.value.spaceExceptions).toEqual([
      { area: "FLOOR", floor: 2, appliesToSize: "ALL", access: "NOT_ALLOWED" },
    ]);
    expect(read.value.behaviorRestrictions).toEqual([
      { trigger: "BARKING", outcome: "MAY_RESTRICT" },
    ]);
    expect(read.value.admission?.feePolicy).toBe("PAID");
    expect(read.value.hygiene).toEqual(["OWNER_LIABILITY"]);
  });

  it("잠글 select와 열어 둘 select를 구분해 계산한다", () => {
    const read = readPolicyDetails(stored);
    if (read.status !== "ok") throw new Error("ok가 아님");

    const derived = derivedColumns(read.value);
    // 택일이라 단언하지 않고, 언급 없는 입마개는 관리자가 계속 고른다.
    expect(derived.leash).toBe("UNKNOWN");
    expect(derived.carrierStrollerPolicy).toBe("UNKNOWN");
    expect(derived).not.toHaveProperty("muzzle");
  });

  it("깨진 값은 편집기를 열지 않도록 invalid로 알린다", () => {
    const read = readPolicyDetails({ ...stored, version: 99 });
    expect(read.status).toBe("invalid");
    expect(read.status === "invalid" && read.issues.length).toBeGreaterThan(0);
  });
});

describe("parsePolicyDetailsForm — 층·구역별 예외", () => {
  it("층 번호와 구역 이름을 해당 구역에서만 읽는다", () => {
    const parsed = parsePolicyDetailsForm(
      form({
        [`${P}.entry.vaccinationCompletionPolicy`]: "UNKNOWN",
        [`${P}.spaceExceptions.0.area`]: "FLOOR",
        [`${P}.spaceExceptions.0.floor`]: "-1",
        [`${P}.spaceExceptions.0.appliesToSize`]: "ALL",
        [`${P}.spaceExceptions.0.access`]: "NOT_ALLOWED",
        [`${P}.spaceExceptions.1.area`]: "OTHER",
        [`${P}.spaceExceptions.1.label`]: "루프탑",
        [`${P}.spaceExceptions.1.appliesToSize`]: "SMALL",
        [`${P}.spaceExceptions.1.access`]: "ALLOWED",
      }),
    );

    const resolved = resolvePolicyDetails(null, parsed);
    expect(resolved.write.policyDetails?.spaceExceptions).toEqual([
      { area: "FLOOR", floor: -1, appliesToSize: "ALL", access: "NOT_ALLOWED" },
      { area: "OTHER", label: "루프탑", appliesToSize: "SMALL", access: "ALLOWED" },
    ]);
  });

  // 층을 비운 채 저장되면 "어느 층인지 모르는 예외"가 남는다.
  it("특정 층인데 층 번호가 비면 저장을 거부한다", () => {
    const parsed = parsePolicyDetailsForm(
      form({
        [`${P}.entry.vaccinationCompletionPolicy`]: "UNKNOWN",
        [`${P}.spaceExceptions.0.area`]: "FLOOR",
        [`${P}.spaceExceptions.0.floor`]: "",
        [`${P}.spaceExceptions.0.appliesToSize`]: "ALL",
        [`${P}.spaceExceptions.0.access`]: "NOT_ALLOWED",
      }),
    );

    expect(() => resolvePolicyDetails(null, parsed)).toThrow(PolicyDetailsWriteError);
  });

  it("그 밖의 구역인데 이름이 비면 저장을 거부한다", () => {
    expect(() =>
      resolvePolicyDetails(
        null,
        submitInput({
          spaceExceptions: [{ area: "OTHER", appliesToSize: "ALL", access: "ALLOWED" }],
        }),
      ),
    ).toThrow(PolicyDetailsWriteError);
  });

  it("숫자가 아닌 층 번호는 저장을 거부한다", () => {
    const parsed = parsePolicyDetailsForm(
      form({
        [`${P}.entry.vaccinationCompletionPolicy`]: "UNKNOWN",
        [`${P}.spaceExceptions.0.area`]: "FLOOR",
        [`${P}.spaceExceptions.0.floor`]: "지하",
        [`${P}.spaceExceptions.0.appliesToSize`]: "ALL",
        [`${P}.spaceExceptions.0.access`]: "NOT_ALLOWED",
      }),
    );

    expect(() => resolvePolicyDetails(null, parsed)).toThrow(PolicyDetailsWriteError);
  });

  it("없는 구역 코드는 저장을 거부한다", () => {
    expect(() =>
      resolvePolicyDetails(
        null,
        submitInput({
          spaceExceptions: [{ area: "ROOFTOP", appliesToSize: "ALL", access: "ALLOWED" }],
        }),
      ),
    ).toThrow(PolicyDetailsWriteError);
  });
});

describe("resolvePolicyDetails — 같은 대상에 두 번 답한 입력", () => {
  function reasonOf(run: () => unknown): string {
    try {
      run();
    } catch (err) {
      return (err as PolicyDetailsWriteError).reason;
    }
    throw new Error("거부되지 않았다");
  }

  // 어느 쪽이 맞는지 알 수 없으므로 자동으로 하나를 고르지 않는다.
  it("같은 구역·크기가 두 번이면 저장을 거부한다", () => {
    const reason = reasonOf(() =>
      resolvePolicyDetails(
        null,
        submitInput({
          spaceExceptions: [
            { area: "TERRACE", appliesToSize: "ALL", access: "ALLOWED" },
            { area: "TERRACE", appliesToSize: "ALL", access: "NOT_ALLOWED" },
          ],
        }),
      ),
    );

    expect(reason).toBe("spaceDuplicate");
  });

  it("같은 구역이라도 적용 크기가 다르면 저장한다", () => {
    const resolved = resolvePolicyDetails(
      null,
      submitInput({
        spaceExceptions: [
          { area: "TERRACE", appliesToSize: "SMALL", access: "ALLOWED" },
          { area: "TERRACE", appliesToSize: "LARGE", access: "NOT_ALLOWED" },
        ],
      }),
    );

    expect(resolved.write.policyDetails?.spaceExceptions).toHaveLength(2);
  });

  it("같은 상황이 두 번이면 저장을 거부한다", () => {
    const reason = reasonOf(() =>
      resolvePolicyDetails(
        null,
        submitInput({
          behaviorRestrictions: [
            { trigger: "BARKING", outcome: "MAY_RESTRICT" },
            { trigger: "BARKING", outcome: "NO_ENTRY" },
          ],
        }),
      ),
    );

    expect(reason).toBe("behaviorDuplicate");
  });

  it("같은 기간·크기에 금액이 둘이면 저장을 거부한다", () => {
    const reason = reasonOf(() =>
      resolvePolicyDetails(
        null,
        submitInput({
          admission: {
            feePolicy: "PAID",
            rates: [
              { period: "WEEKDAY", amountKrw: 5000, dogSize: "ALL" },
              { period: "WEEKDAY", amountKrw: 8000, dogSize: "ALL" },
            ],
            includedServices: [],
          },
        }),
      ),
    );

    expect(reason).toBe("admissionInconsistent");
  });

  it("확인 필요인데 요금이 있으면 저장을 거부한다", () => {
    const reason = reasonOf(() =>
      resolvePolicyDetails(
        null,
        submitInput({
          admission: {
            feePolicy: "UNKNOWN",
            rates: [{ period: "ALL", amountKrw: 5000, dogSize: "ALL" }],
            includedServices: [],
          },
        }),
      ),
    );

    expect(reason).toBe("admissionInconsistent");
  });
});

describe("parsePolicyDetailsForm — 행동 제한과 위생", () => {
  it("상황과 결과를 인덱스 순서대로 읽는다", () => {
    const parsed = parsePolicyDetailsForm(
      form({
        [`${P}.entry.vaccinationCompletionPolicy`]: "UNKNOWN",
        [`${P}.behaviorRestrictions.0.trigger`]: "BARKING",
        [`${P}.behaviorRestrictions.0.outcome`]: "MAY_RESTRICT",
        [`${P}.behaviorRestrictions.1.trigger`]: "AGGRESSION",
        [`${P}.behaviorRestrictions.1.outcome`]: "NO_ENTRY",
      }),
    );

    expect(parsed?.behaviorRestrictions).toEqual([
      { trigger: "BARKING", outcome: "MAY_RESTRICT" },
      { trigger: "AGGRESSION", outcome: "NO_ENTRY" },
    ]);
  });

  // 안내문이 결과를 밝히지 않은 것도 사실이다. 추측하지 않고 그대로 남긴다.
  it("결과가 확인되지 않은 제한도 저장한다", () => {
    const resolved = resolvePolicyDetails(
      null,
      submitInput({
        behaviorRestrictions: [{ trigger: "UNCONTROLLED", outcome: "UNKNOWN" }],
      }),
    );

    expect(resolved.write.policyDetails?.behaviorRestrictions).toEqual([
      { trigger: "UNCONTROLLED", outcome: "UNKNOWN" },
    ]);
  });

  it("없는 상황 코드는 저장을 거부한다", () => {
    expect(() =>
      resolvePolicyDetails(
        null,
        submitInput({
          behaviorRestrictions: [{ trigger: "DIGGING", outcome: "NO_ENTRY" }],
        }),
      ),
    ).toThrow(PolicyDetailsWriteError);
  });

  it("체크한 위생 항목만 읽는다", () => {
    const parsed = parsePolicyDetailsForm(
      form({
        [`${P}.entry.vaccinationCompletionPolicy`]: "UNKNOWN",
        [`${P}.hygiene`]: ["POOP_OWNER_HANDLES", "OWNER_LIABILITY"],
      }),
    );

    expect(parsed?.hygiene).toEqual(["POOP_OWNER_HANDLES", "OWNER_LIABILITY"]);
  });

  it("없는 위생 항목 코드는 저장을 거부한다", () => {
    expect(() =>
      resolvePolicyDetails(null, submitInput({ hygiene: ["WASH_PAWS"] })),
    ).toThrow(PolicyDetailsWriteError);
  });
});

describe("parsePolicyDetailsForm — 입장료", () => {
  it("입력 신호가 없으면 null이다 (무료가 아니라 다루지 않음)", () => {
    const parsed = parsePolicyDetailsForm(
      form({
        [`${P}.entry.vaccinationCompletionPolicy`]: "UNKNOWN",
        [`${P}.admission.feePolicy`]: "PAID",
      }),
    );

    expect(parsed?.admission).toBeNull();
  });

  it("요금과 포함 서비스를 읽고 빈 칸은 버린다", () => {
    const parsed = parsePolicyDetailsForm(
      form({
        [`${P}.entry.vaccinationCompletionPolicy`]: "UNKNOWN",
        [`${P}.admission.present`]: "true",
        [`${P}.admission.feePolicy`]: "PAID",
        [`${P}.admission.rates.0.period`]: "WEEKDAY",
        [`${P}.admission.rates.0.amountKrw`]: "10000",
        [`${P}.admission.rates.0.dogSize`]: "ALL",
        [`${P}.admission.rates.1.period`]: "WEEKEND_HOLIDAY",
        [`${P}.admission.rates.1.amountKrw`]: "15000",
        [`${P}.admission.rates.1.dogSize`]: "ALL",
        [`${P}.admission.includedServices`]: ["음료 1잔", "  ", "간식"],
      }),
    );

    const resolved = resolvePolicyDetails(null, parsed);
    expect(resolved.write.policyDetails?.admission).toEqual({
      feePolicy: "PAID",
      rates: [
        { period: "WEEKDAY", amountKrw: 10000, dogSize: "ALL" },
        { period: "WEEKEND_HOLIDAY", amountKrw: 15000, dogSize: "ALL" },
      ],
      includedServices: ["음료 1잔", "간식"],
    });
  });

  // 빈 금액을 0으로 바꾸면 "무료"라는 없는 사실이 생긴다.
  it("금액이 비면 0으로 바꾸지 않고 저장을 거부한다", () => {
    const parsed = parsePolicyDetailsForm(
      form({
        [`${P}.entry.vaccinationCompletionPolicy`]: "UNKNOWN",
        [`${P}.admission.present`]: "true",
        [`${P}.admission.feePolicy`]: "PAID",
        [`${P}.admission.rates.0.period`]: "ALL",
        [`${P}.admission.rates.0.amountKrw`]: "",
        [`${P}.admission.rates.0.dogSize`]: "ALL",
      }),
    );

    expect(() => resolvePolicyDetails(null, parsed)).toThrow(PolicyDetailsWriteError);
  });

  it("무료인데 요금이 남아 있으면 저장을 거부한다", () => {
    expect(() =>
      resolvePolicyDetails(
        null,
        submitInput({
          admission: {
            feePolicy: "FREE",
            rates: [{ period: "ALL", amountKrw: 5000, dogSize: "ALL" }],
            includedServices: [],
          },
        }),
      ),
    ).toThrow(PolicyDetailsWriteError);
  });

  it("무료는 요금 없이 저장한다", () => {
    const resolved = resolvePolicyDetails(
      null,
      submitInput({
        admission: { feePolicy: "FREE", rates: [], includedServices: ["음료 1잔"] },
      }),
    );

    expect(resolved.write.policyDetails?.admission?.feePolicy).toBe("FREE");
  });
});

describe("resolvePolicyDetails — 4개 그룹 병합", () => {
  const existing: PolicyDetails = {
    ...EMPTY_POLICY_DETAILS,
    spaceExceptions: [
      { area: "FLOOR", floor: 2, appliesToSize: "ALL", access: "NOT_ALLOWED" },
    ],
    behaviorRestrictions: [{ trigger: "BARKING", outcome: "MAY_RESTRICT" }],
    admission: { feePolicy: "PAID", rates: [], includedServices: [] },
    hygiene: ["OWNER_LIABILITY"],
  };

  it("편집기를 열지 않으면 4개 그룹을 그대로 둔다", () => {
    const resolved = resolvePolicyDetails(existing, undefined);

    expect(resolved.write).toEqual({});
    expect(resolved.effective).toEqual(existing);
  });

  // "편집기를 열고 모두 지웠다"와 "편집기를 열지 않았다"는 다른 뜻이다.
  it("빈 값으로 제출하면 4개 그룹을 초기화한다", () => {
    const saved = resolvePolicyDetails(existing, submitInput()).write.policyDetails;

    expect(saved?.spaceExceptions).toEqual([]);
    expect(saved?.behaviorRestrictions).toEqual([]);
    expect(saved?.admission).toBeNull();
    expect(saved?.hygiene).toEqual([]);
  });

  it("한 그룹을 고쳐도 함께 제출된 나머지 그룹이 그대로 저장된다", () => {
    const saved = resolvePolicyDetails(
      existing,
      submitInput({
        spaceExceptions: [{ area: "TERRACE", appliesToSize: "LARGE", access: "ALLOWED" }],
        hygiene: ["OWNER_LIABILITY"],
      }),
    ).write.policyDetails;

    expect(saved?.spaceExceptions).toEqual([
      { area: "TERRACE", appliesToSize: "LARGE", access: "ALLOWED" },
    ]);
    expect(saved?.hygiene).toEqual(["OWNER_LIABILITY"]);
    expect(saved?.version).toBe(1);
  });
});

import { describe, expect, it } from "vitest";

import {
  POLICY_DETAILS_SUBMITTED_FIELD,
  PolicyDetailsWriteError,
  parsePolicyDetailsForm,
  resolvePolicyDetails,
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
      { mode: "UNKNOWN", rules: [{ rule: "FREE_ROAM", status: "PROHIBITED" }] },
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
  // 편집하지 않는 필드를 클라이언트로 왕복시키지 않으므로 주입 경로 자체가 없다.
  it("편집 대상이 아닌 필드는 FormData로 넣어도 읽지 않는다", () => {
    const parsed = parsePolicyDetailsForm(
      form({
        [`${P}.entry.vaccinationCompletionPolicy`]: "UNKNOWN",
        [`${P}.spaceExceptions.0.area`]: "INDOOR",
        [`${P}.spaceExceptions.0.access`]: "NOT_ALLOWED",
        [`${P}.hygiene`]: "OWNER_LIABILITY",
        "condition.policyDetails": JSON.stringify({ ...EMPTY_POLICY_DETAILS, hygiene: ["PET_DISHES_ONLY"] }),
      }),
    );
    expect(parsed).not.toHaveProperty("spaceExceptions");
    expect(parsed).not.toHaveProperty("hygiene");
  });

  it("오래된 JSON을 통째로 보내도 기존 DB 값이 이긴다", () => {
    const existing: PolicyDetails = { ...EMPTY_POLICY_DETAILS, hygiene: ["OWNER_LIABILITY"] };
    const parsed = parsePolicyDetailsForm(
      form({
        [`${P}.entry.vaccinationCompletionPolicy`]: "UNKNOWN",
        "condition.policyDetails": JSON.stringify({ ...EMPTY_POLICY_DETAILS, hygiene: [] }),
      }),
    );

    const resolved = resolvePolicyDetails(existing, parsed);
    expect(resolved.write.policyDetails?.hygiene).toEqual(["OWNER_LIABILITY"]);
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
    expect(() => resolvePolicyDetails({ version: 2 }, { entry: { vaccinationCompletionPolicy: "UNKNOWN" }, preparation: [], handling: [], uncertainties: [] })).toThrow(
      PolicyDetailsWriteError,
    );
  });

  it("깨진 기존 값이라도 제출이 없으면 저장을 막지 않는다", () => {
    const resolved = resolvePolicyDetails({ version: 2 }, undefined);
    expect(resolved.write).toEqual({});
    expect(resolved.effective).toBeNull();
  });

  it("version은 1로 유지된다", () => {
    const resolved = resolvePolicyDetails(null, {
      entry: { vaccinationCompletionPolicy: "UNKNOWN" },
      preparation: [],
      handling: [],
      uncertainties: [],
    });
    expect(resolved.write.policyDetails?.version).toBe(1);
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
    handling: [{ mode: "UNKNOWN", rules: [{ rule: "FREE_ROAM", status: "PROHIBITED" }] }],
    spaceExceptions: [{ area: "FLOOR", floor: 2, appliesToSize: "ALL", access: "NOT_ALLOWED" }],
    behaviorRestrictions: [{ trigger: "BARKING", outcome: "MAY_RESTRICT" }],
    admission: { feePolicy: "PAID", rates: [], includedServices: [] },
    hygiene: ["OWNER_LIABILITY"],
    uncertainties: [{ target: "PREPARATION", reason: "택일 여부 불명확" }],
  };

  it("저장된 값을 ok로 읽어 편집 대상 4개 필드를 그대로 넘긴다", () => {
    const read = readPolicyDetails(stored);
    expect(read.status).toBe("ok");
    if (read.status !== "ok") return;

    expect(read.value.entry.vaccinationCompletionPolicy).toBe("REQUIRED");
    expect(read.value.preparation[0].items).toHaveLength(2);
    expect(read.value.handling[0].rules[0].rule).toBe("FREE_ROAM");
    expect(read.value.uncertainties[0].reason).toBe("택일 여부 불명확");
  });

  it("화면에 없는 필드도 읽기 결과에 남아 저장 시 이어진다", () => {
    const read = readPolicyDetails(stored);
    if (read.status !== "ok") throw new Error("ok가 아님");

    expect(read.value.spaceExceptions).toHaveLength(1);
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

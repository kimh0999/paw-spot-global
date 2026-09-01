import { describe, expect, it } from "vitest";

import {
  derivedColumns,
  reconcileConditionColumns,
  type ReconcilableColumns,
} from "@/lib/places/condition-consistency";
import {
  EMPTY_POLICY_DETAILS,
  type PolicyDetails,
  type PreparationItem,
  type PreparationScope,
} from "@/lib/places/policy-details";

/** 관리자가 컬럼에 아무 단언도 하지 않은 출발점. */
const blank: ReconcilableColumns = {
  leash: "UNKNOWN",
  muzzle: "UNKNOWN",
  carrierStrollerPolicy: "UNKNOWN",
  vaccinationCertificatePolicy: "UNKNOWN",
};

function details(
  groups: Array<{
    mode: "ANY_OF" | "ALL_OF" | "UNKNOWN";
    scope?: PreparationScope;
    items: Array<[PreparationItem, "REQUIRED" | "NOT_REQUIRED" | "RECOMMENDED"]>;
  }>,
): PolicyDetails {
  return {
    ...EMPTY_POLICY_DETAILS,
    preparation: groups.map((group) => ({
      mode: group.mode,
      scope: group.scope ?? "ALWAYS",
      items: group.items.map(([item, status]) => ({ item, status })),
    })),
  };
}

describe("택일 관계는 컬럼에 단언하지 않는다", () => {
  // 원문 E "목줄 또는 이동가방 필수 (미착용 시 출입 제한)".
  // leash=REQUIRED로 저장하면 이동가방만 챙긴 방문자에게 사실과 다른 안내가 나간다.
  it("목줄 또는 이동가방은 두 컬럼 모두 UNKNOWN으로 남긴다", () => {
    const result = reconcileConditionColumns(
      details([
        {
          mode: "ANY_OF",
          items: [
            ["LEASH", "REQUIRED"],
            ["CARRIER", "REQUIRED"],
          ],
        },
      ]),
      blank,
    );

    expect(result.leash).toBe("UNKNOWN");
    expect(result.carrierStrollerPolicy).toBe("UNKNOWN");
  });

  // 원문 A "리드줄 / 이동가방 / 유모차 필수" — 관계가 확인되지 않았다.
  it("관계 미확인 그룹도 단언하지 않는다", () => {
    const result = reconcileConditionColumns(
      details([
        {
          mode: "UNKNOWN",
          scope: "UNKNOWN",
          items: [
            ["LEASH", "REQUIRED"],
            ["CARRIER", "REQUIRED"],
            ["STROLLER", "REQUIRED"],
          ],
        },
      ]),
      blank,
    );

    expect(result.leash).toBe("UNKNOWN");
    expect(result.carrierStrollerPolicy).toBe("UNKNOWN");
  });

  // 관리자가 먼저 REQUIRED를 골라 뒀더라도 원본이 택일이면 내려가야 한다.
  it("이미 REQUIRED로 저장돼 있어도 UNKNOWN으로 내린다", () => {
    const result = reconcileConditionColumns(
      details([
        {
          mode: "ANY_OF",
          items: [
            ["LEASH", "REQUIRED"],
            ["CARRIER", "REQUIRED"],
          ],
        },
      ]),
      { ...blank, leash: "REQUIRED", carrierStrollerPolicy: "REQUIRED_ALWAYS" },
    );

    expect(result.leash).toBe("UNKNOWN");
    expect(result.carrierStrollerPolicy).toBe("UNKNOWN");
  });
});

describe("무조건적인 요구만 컬럼에 단언한다", () => {
  it("ALL_OF 그룹의 REQUIRED는 컬럼에 반영한다", () => {
    const result = reconcileConditionColumns(
      details([
        {
          mode: "ALL_OF",
          items: [
            ["LEASH", "REQUIRED"],
            ["POOP_BAG", "REQUIRED"],
          ],
        },
      ]),
      blank,
    );

    expect(result.leash).toBe("REQUIRED");
  });

  it("항목이 하나뿐인 그룹은 mode와 무관하게 무조건적이다", () => {
    const result = reconcileConditionColumns(
      details([{ mode: "ANY_OF", items: [["MUZZLE", "REQUIRED"]] }]),
      blank,
    );

    expect(result.muzzle).toBe("REQUIRED");
  });

  // 원문 C "입장시에 예방접종확인증 증빙이 필요합니다" — 대안이 없는 단독 요구다.
  it("예방접종 증빙 단독 요구는 컬럼에 반영한다", () => {
    const result = reconcileConditionColumns(
      details([{ mode: "ALL_OF", items: [["VACCINATION_PROOF", "REQUIRED"]] }]),
      blank,
    );

    expect(result.vaccinationCertificatePolicy).toBe("REQUIRED");
  });

  it("매장이 필요 없다고 확인한 항목만 NOT_REQUIRED로 쓴다", () => {
    const result = reconcileConditionColumns(
      details([{ mode: "ALL_OF", items: [["LEASH", "NOT_REQUIRED"]] }]),
      blank,
    );

    expect(result.leash).toBe("NOT_REQUIRED");
  });

  // RECOMMENDED는 "권장"이지 "필요 없음"이 아니다.
  it("권장은 NOT_REQUIRED로 바꾸지 않는다", () => {
    const result = reconcileConditionColumns(
      details([{ mode: "ALL_OF", items: [["LEASH", "RECOMMENDED"]] }]),
      blank,
    );

    expect(result.leash).toBe("UNKNOWN");
  });
});

describe("이동장·유모차 컬럼", () => {
  // 원문 D "실내동반시 …필수" — 실내에만 걸리는 요구다.
  it("실내 한정 단독 요구는 REQUIRED_INDOOR가 된다", () => {
    const result = reconcileConditionColumns(
      details([{ mode: "ALL_OF", scope: "INDOOR", items: [["CRATE", "REQUIRED"]] }]),
      blank,
    );

    expect(result.carrierStrollerPolicy).toBe("REQUIRED_INDOOR");
  });

  it("범위 제한이 없으면 REQUIRED_ALWAYS가 된다", () => {
    const result = reconcileConditionColumns(
      details([{ mode: "ALL_OF", scope: "ALWAYS", items: [["CARRIER", "REQUIRED"]] }]),
      blank,
    );

    expect(result.carrierStrollerPolicy).toBe("REQUIRED_ALWAYS");
  });

  it("이동장·케이지·유모차 중 하나만 무조건 필요해도 컬럼은 필수가 된다", () => {
    const result = reconcileConditionColumns(
      details([
        { mode: "ALL_OF", items: [["STROLLER", "REQUIRED"]] },
        { mode: "ANY_OF", items: [["CARRIER", "REQUIRED"], ["LEASH", "REQUIRED"]] },
      ]),
      blank,
    );

    expect(result.carrierStrollerPolicy).toBe("REQUIRED_ALWAYS");
  });
});

describe("언급되지 않은 항목은 건드리지 않는다", () => {
  it("policyDetails가 없으면 컬럼을 그대로 둔다", () => {
    const current: ReconcilableColumns = {
      leash: "REQUIRED",
      muzzle: "CONDITIONAL",
      carrierStrollerPolicy: "REQUIRED_INDOOR",
      vaccinationCertificatePolicy: "REQUIRED",
    };

    expect(reconcileConditionColumns(null, current)).toEqual(current);
  });

  // leash=PARTIAL_AREA는 준비물 그룹으로 표현할 수 없다. 언급이 없으면 살아남아야 한다.
  it("준비물에 없는 항목의 컬럼 값은 보존한다", () => {
    const result = reconcileConditionColumns(
      details([{ mode: "ALL_OF", items: [["POOP_BAG", "REQUIRED"]] }]),
      { ...blank, leash: "PARTIAL_AREA", muzzle: "CONDITIONAL" },
    );

    expect(result.leash).toBe("PARTIAL_AREA");
    expect(result.muzzle).toBe("CONDITIONAL");
  });

  it("빈 preparation은 아무 컬럼도 바꾸지 않는다", () => {
    const current: ReconcilableColumns = {
      leash: "REQUIRED",
      muzzle: "NOT_REQUIRED",
      carrierStrollerPolicy: "NOT_REQUIRED",
      vaccinationCertificatePolicy: "REQUIRED",
    };

    expect(reconcileConditionColumns(EMPTY_POLICY_DETAILS, current)).toEqual(current);
  });
});

describe("derivedColumns — 관리자 폼이 잠글 항목", () => {
  it("상세 조건이 없으면 아무것도 잠그지 않는다", () => {
    expect(derivedColumns(null)).toEqual({});
  });

  // 언급되지 않은 항목까지 잠그면 관리자가 PARTIAL_AREA 같은 값을 넣을 방법을 잃는다.
  it("언급되지 않은 항목은 결과에 넣지 않는다", () => {
    const derived = derivedColumns(
      details([{ mode: "ALL_OF", items: [["MUZZLE", "REQUIRED"]] }]),
    );

    expect(derived).toHaveProperty("muzzle", "REQUIRED");
    expect(derived).not.toHaveProperty("leash");
    expect(derived).not.toHaveProperty("carrierStrollerPolicy");
    expect(derived).not.toHaveProperty("vaccinationCertificatePolicy");
  });

  it("택일 그룹은 잠그되 UNKNOWN으로 계산한다", () => {
    const derived = derivedColumns(
      details([
        {
          mode: "ANY_OF",
          items: [
            ["LEASH", "REQUIRED"],
            ["CARRIER", "REQUIRED"],
          ],
        },
      ]),
    );

    expect(derived.leash).toBe("UNKNOWN");
    expect(derived.carrierStrollerPolicy).toBe("UNKNOWN");
  });

  it("케이지도 이동장 컬럼을 계산한다", () => {
    const derived = derivedColumns(
      details([{ mode: "ALL_OF", scope: "INDOOR", items: [["CRATE", "REQUIRED"]] }]),
    );

    expect(derived.carrierStrollerPolicy).toBe("REQUIRED_INDOOR");
  });

  it("증빙 항목은 예방접종 증빙 컬럼만 계산한다", () => {
    const derived = derivedColumns(
      details([{ mode: "ALL_OF", items: [["VACCINATION_PROOF", "REQUIRED"]] }]),
    );

    expect(derived.vaccinationCertificatePolicy).toBe("REQUIRED");
    expect(derived).not.toHaveProperty("leash");
  });
});

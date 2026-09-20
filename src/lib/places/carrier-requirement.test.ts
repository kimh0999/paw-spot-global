import { describe, expect, it } from "vitest";

import {
  resolveCarrierRequirement,
  type CarrierRequirementKey,
} from "./carrier-requirement";
import { buildConditionRows } from "./condition-rows";
import { getPlaceConditionBreakdown } from "./eligibility";
import { filterPlaces } from "./filtering";
import { EMPTY_POLICY_DETAILS, type PolicyDetails } from "./policy-details";
import type { PlaceDetail, PlaceListItem } from "@/types/place";

/**
 * 이동장·유모차 사용 의무 해석의 회귀 테스트 (결정 **D-21**).
 *
 * 붙잡아 두는 사실은 넷이다.
 * 1. `handling`의 `IN_CARRIER` 의무는 요약 컬럼을 **끌어올린다** — 컬럼만 보면 놓친다.
 * 2. 안기(`HELD_BY_OWNER`)는 이동장 의무가 아니다 — `필수 아님`과 모순되지 않는다.
 * 3. 묶음의 `mode`가 대체 관계를 가른다 — 선택지에 `IN_CARRIER`가 있다는 이유만으로
 *    필수로 올리지 않는다.
 * 4. 조건부(`CONDITIONAL`)·미확인(`UNKNOWN`)은 `필수 아님`으로 내려 읽지 않는다 —
 *    미확인으로 두고, 이미 확정된 의무는 그대로 남긴다.
 */

type HandlingGroup = PolicyDetails["handling"][number];

function withHandling(handling: HandlingGroup[]): PolicyDetails {
  return { ...EMPTY_POLICY_DETAILS, handling };
}

/** 행동 하나짜리 묶음. 묶음 규칙상 단일 행동은 어떤 status도 쓸 수 있다. */
function single(
  rule: HandlingGroup["rules"][number]["rule"],
  status: HandlingGroup["rules"][number]["status"],
  scope: HandlingGroup["scope"] = "ALWAYS",
): HandlingGroup {
  return { mode: "UNKNOWN", scope, rules: [{ rule, status }] };
}

/** 행동 여럿을 묶은 조건. 묶음 규칙상 전부 REQUIRED여야 한다. */
function group(
  mode: HandlingGroup["mode"],
  scope: HandlingGroup["scope"],
  rules: HandlingGroup["rules"][number]["rule"][],
): HandlingGroup {
  return { mode, scope, rules: rules.map((rule) => ({ rule, status: "REQUIRED" })) };
}

function resolve(
  summary: PlaceListItem["carrierStrollerPolicy"],
  handling: HandlingGroup[] | null = null,
): CarrierRequirementKey {
  return resolveCarrierRequirement(summary, handling ? withHandling(handling) : null).key;
}

describe("resolveCarrierRequirement — 세부 정책이 없으면 요약 컬럼을 그대로 옮긴다", () => {
  const cases: Array<[PlaceListItem["carrierStrollerPolicy"], CarrierRequirementKey]> = [
    ["not_required", "notRequired"],
    ["required_indoor", "requiredIndoor"],
    ["required_always", "requiredAlways"],
    ["unknown", "unknown"],
    [null, "unknown"],
  ];

  // 공개 중인 기존 데이터는 policyDetails가 없다. 그 장소들의 판정이 바뀌면 안 된다.
  it.each(cases)("%s → %s", (summary, expected) => {
    expect(resolve(summary)).toBe(expected);
    expect(resolveCarrierRequirement(summary, null).raisedByHandling).toBe(false);
  });
});

describe("resolveCarrierRequirement — IN_CARRIER 의무는 요약 컬럼을 끌어올린다", () => {
  it("실내 이동장 필수는 필수 아님을 뒤집는다", () => {
    expect(resolve("not_required", [single("IN_CARRIER", "REQUIRED", "INDOOR")])).toBe(
      "requiredIndoor",
    );
  });

  it("항상 이동장 필수는 실내 한정보다 강하다", () => {
    expect(resolve("not_required", [single("IN_CARRIER", "REQUIRED", "ALWAYS")])).toBe(
      "requiredAlways",
    );
    expect(resolve("required_indoor", [single("IN_CARRIER", "REQUIRED", "ALWAYS")])).toBe(
      "requiredAlways",
    );
  });

  it("여러 행동을 모두 요구하는 묶음도 이동장 의무다", () => {
    expect(
      resolve("not_required", [group("ALL_OF", "INDOOR", ["IN_CARRIER", "ON_LEASH_FLOOR"])]),
    ).toBe("requiredIndoor");
  });

  /**
   * 컬럼에는 실외 전용 값이 없다. 의무가 있다는 사실만 남기고 범위는 단언하지 않는다 —
   * `실내에서 필요`로 옮기면 없는 사실을 만들고, `필수 아님`으로 두면 있는 의무를 지운다.
   */
  it("실외 전용·범위 미확인 의무는 미확인으로 남긴다", () => {
    expect(resolve("not_required", [single("IN_CARRIER", "REQUIRED", "OUTDOOR")])).toBe("unknown");
    expect(resolve("not_required", [single("IN_CARRIER", "REQUIRED", "UNKNOWN")])).toBe("unknown");
  });

  it("요약 컬럼을 낮추지는 않는다", () => {
    expect(resolve("required_always", [single("IN_CARRIER", "REQUIRED", "INDOOR")])).toBe(
      "requiredAlways",
    );
    expect(resolve("required_always", [single("FREE_ROAM", "ALLOWED")])).toBe("requiredAlways");
  });

  it("끌어올렸다는 사실을 밝힌다", () => {
    const raised = resolveCarrierRequirement(
      "not_required",
      withHandling([single("IN_CARRIER", "REQUIRED", "INDOOR")]),
    );
    expect(raised).toEqual({
      key: "requiredIndoor",
      summary: "not_required",
      raisedByHandling: true,
      // 이 의무의 근거는 `IN_CARRIER` 하나다. 유모차·안기를 대체 수단이라 말하지 않는다.
      means: "carrier",
    });
  });
});

describe("resolveCarrierRequirement — 이동장 의무가 아닌 조건은 옮기지 않는다", () => {
  // 사용자 확정: 안기 의무만으로 `이동장·유모차 필수 아님`을 뒤집지 않는다.
  it("안기만 필수인 곳은 필수 아님 그대로다", () => {
    expect(resolve("not_required", [single("HELD_BY_OWNER", "REQUIRED", "INDOOR")])).toBe(
      "notRequired",
    );
    expect(resolve("not_required", [single("HELD_BY_OWNER", "REQUIRED", "ALWAYS")])).toBe(
      "notRequired",
    );
  });

  it("다른 행동 조건을 이동장 정책으로 환산하지 않는다", () => {
    for (const rule of ["ON_LEASH_FLOOR", "PET_SEAT", "FREE_ROAM", "ON_CHAIR_OR_TABLE"] as const) {
      expect(resolve("not_required", [single(rule, "REQUIRED", "ALWAYS")])).toBe("notRequired");
    }
  });

  /**
   * `ALLOWED`(`…도 됩니다`)와 `PROHIBITED`(`…서는 안 됩니다`)만 의무가 아니라고 단언할 수 있다.
   * 둘은 이동장을 **쓰는 것이 허용되는지 / 금지되는지**를 말하고, 사용 의무는 세우지 않는다.
   */
  it("허용·금지 status는 의무가 아니다", () => {
    for (const status of ["ALLOWED", "PROHIBITED"] as const) {
      expect(resolve("not_required", [single("IN_CARRIER", status, "ALWAYS")])).toBe("notRequired");
    }
  });
});

/**
 * **조건부·미확인은 `필수 아님`으로 확정하지 않는다 (결정 D-21 · D-03).**
 *
 * 관리자 입력에서 `CONDITIONAL`은 `상황에 따라`이고 표시 문구는
 * `…해야 하는 경우가 있습니다` — **조건부 의무이지 조건부 허용이 아니다.** 어떤
 * 상황에서 걸리는지는 구조화되어 있지 않아 반영할 조건이 없다. `UNKNOWN`
 * (`…해야 하는지 확인되지 않았습니다`)도 같다. 그래서 둘 다 `필요 없음`으로
 * 내려 읽지 않고 **미확인으로 둔다** — 확인되지 않은 조건을 충족으로 보지 않는 것이 D-03이다.
 *
 * `unknown`은 `필수 아님` 필터에서만 보이지 않고 **전체 목록에서는 그대로 보인다** —
 * 아래 `이동장 판정 — 목록·카드·상세`의 `passesFilter`가 둘을 나눠 확인한다.
 * 원본 `CONDITIONAL`·`UNKNOWN`은 새로 쓰지 않으므로 상세의 행동 문장
 * (`policy-sentences.ts`)은 여전히 각자의 뜻으로 말한다.
 */
describe("resolveCarrierRequirement — 조건부·미확인 status는 미확인으로 둔다", () => {
  it("CONDITIONAL·UNKNOWN은 필수 아님을 미확인으로 끌어올린다", () => {
    for (const status of ["CONDITIONAL", "UNKNOWN"] as const) {
      expect(resolve("not_required", [single("IN_CARRIER", status, "ALWAYS")])).toBe("unknown");
      expect(resolve("not_required", [single("IN_CARRIER", status, "INDOOR")])).toBe("unknown");
    }
  });

  /** 범위는 의무가 선 뒤에만 쓰는 값이다. 미확인에는 범위를 붙이지 않는다. */
  it("미확인은 scope와 무관하다", () => {
    for (const scope of ["ALWAYS", "INDOOR", "OUTDOOR", "UNKNOWN"] as const) {
      expect(resolve("not_required", [single("IN_CARRIER", "CONDITIONAL", scope)])).toBe("unknown");
    }
  });

  /**
   * **확정된 의무를 미확인으로 낮추지 않는다.** 순위가 `unknown < requiredIndoor`이므로
   * 요약 컬럼이든 다른 묶음이든 이미 의무를 확정했으면 그 판정이 남는다.
   */
  it("이미 확정된 requiredIndoor·requiredAlways를 낮추지 않는다", () => {
    for (const status of ["CONDITIONAL", "UNKNOWN"] as const) {
      // 요약 컬럼이 확정한 의무
      expect(resolve("required_indoor", [single("IN_CARRIER", status, "ALWAYS")])).toBe(
        "requiredIndoor",
      );
      expect(resolve("required_always", [single("IN_CARRIER", status, "ALWAYS")])).toBe(
        "requiredAlways",
      );
      // 다른 묶음이 확정한 의무 — 묶음 순서가 결과를 바꾸지 않는다
      expect(
        resolve("not_required", [
          single("IN_CARRIER", status, "ALWAYS"),
          single("IN_CARRIER", "REQUIRED", "INDOOR"),
        ]),
      ).toBe("requiredIndoor");
      expect(
        resolve("not_required", [
          single("IN_CARRIER", "REQUIRED", "INDOOR"),
          single("IN_CARRIER", status, "ALWAYS"),
        ]),
      ).toBe("requiredIndoor");
    }
  });

  /**
   * **판정하는 것은 `IN_CARRIER`의 status 하나다.** `IN_CARRIER` 항목이 여럿이고 그중
   * 하나라도 `CONDITIONAL`·`UNKNOWN`이면, 이동장을 반드시 써야 한다고 말할 근거가 없다.
   *
   * 관리자 입력은 이 모양을 **저장하지 못한다** — `행동 2개 이상은 모두 REQUIRED여야
   * 합니다`(`policy-details-form.ts`). 옛 데이터를 자동으로 고치지 않기로 했으므로
   * 읽는 자리에서 방어한다.
   */
  it("IN_CARRIER 자체의 status가 섞이면 미확인이다", () => {
    const mixedCarrier: HandlingGroup = {
      mode: "ALL_OF",
      scope: "INDOOR",
      rules: [
        { rule: "IN_CARRIER", status: "REQUIRED" },
        { rule: "IN_CARRIER", status: "CONDITIONAL" },
      ],
    };
    expect(resolve("not_required", [mixedCarrier])).toBe("unknown");
  });

  /**
   * **다른 행동의 불확실성은 이동장 의무를 지우지 않는다.**
   *
   * `ALL_OF`는 묶음 안 행동을 **모두** 지켜야 한다는 뜻이다. `IN_CARRIER`가 `REQUIRED`면
   * 이동장은 반드시 쓰는 것이고, 같은 묶음의 안기가 `상황에 따라`인지 `미확인`인지는
   * **다른 행동 축의 불확실성**이다. 그것을 이동장 의무로 옮기면 확인된 사실을 지운다.
   *
   * 수단도 흐려지지 않는다 — 이 의무의 근거는 `IN_CARRIER` 하나이므로 `means`는 `carrier`다.
   * 즉 **의무 여부(`key`)와 대체 수단(`means`)을 따로 답한다.**
   */
  it("다른 행동만 조건부·미확인인 ALL_OF는 이동장 의무를 범위대로 유지한다", () => {
    const withOther = (
      status: HandlingGroup["rules"][number]["status"],
      scope: HandlingGroup["scope"],
    ): HandlingGroup => ({
      mode: "ALL_OF",
      scope,
      rules: [
        { rule: "IN_CARRIER", status: "REQUIRED" },
        { rule: "HELD_BY_OWNER", status },
      ],
    });

    for (const status of ["CONDITIONAL", "UNKNOWN"] as const) {
      for (const [scope, expected] of [
        ["INDOOR", "requiredIndoor"],
        ["ALWAYS", "requiredAlways"],
      ] as const) {
        const facts = resolveCarrierRequirement("not_required", withHandling([withOther(status, scope)]));
        expect(facts.key, `${status} · ${scope}`).toBe(expected);
        expect(facts.means, `${status} · ${scope}`).toBe("carrier");
      }

      /**
       * 실외 전용만 미확인이 되는데, 이는 **기존 scope 규칙** 때문이다 — 컬럼에
       * 실외 전용 값이 없다. 다른 행동의 status와는 무관하다.
       */
      expect(resolve("not_required", [withOther(status, "OUTDOOR")])).toBe("unknown");
    }
  });

  /** 택일(`ANY_OF`)은 다른 행동의 status와 무관하게 이동장 의무를 세우지 않는다. */
  it("ANY_OF는 다른 행동의 status에 흔들리지 않는다", () => {
    for (const status of ["REQUIRED", "CONDITIONAL", "UNKNOWN"] as const) {
      const group: HandlingGroup = {
        mode: "ANY_OF",
        scope: "INDOOR",
        rules: [
          { rule: "IN_CARRIER", status: "REQUIRED" },
          { rule: "HELD_BY_OWNER", status },
        ],
      };
      expect(resolve("not_required", [group]), status).toBe("notRequired");
    }
  });

  /** 미확인 의무에는 수단을 붙이지 않는다 — 무엇이 되는지 확인되지 않았다. */
  it("미확인에는 수단을 대지 않는다", () => {
    const facts = resolveCarrierRequirement(
      "not_required",
      withHandling([single("IN_CARRIER", "CONDITIONAL", "ALWAYS")]),
    );
    expect(facts).toEqual({
      key: "unknown",
      summary: "not_required",
      raisedByHandling: true,
      means: "unspecified",
    });
  });
});

describe("resolveCarrierRequirement — 묶음 모드가 대체 관계를 가른다", () => {
  /**
   * "안고 계시거나 이동장에 넣어 주세요" — 이동장을 대신할 수단이 **확인됐다.**
   * 선택지에 IN_CARRIER가 등장한다는 이유만으로 필수로 올리지 않는다.
   */
  it("ANY_OF 택일은 이동장 의무를 세우지 않는다", () => {
    expect(
      resolve("not_required", [group("ANY_OF", "INDOOR", ["IN_CARRIER", "HELD_BY_OWNER"])]),
    ).toBe("notRequired");
  });

  /** 관계를 확인하지 못했다. 무조건 필요한지 대신할 수단이 있는지 알 수 없다. */
  it("UNKNOWN 묶음은 단언하지 않고 미확인으로 남긴다", () => {
    expect(
      resolve("not_required", [group("UNKNOWN", "INDOOR", ["IN_CARRIER", "HELD_BY_OWNER"])]),
    ).toBe("unknown");
  });

  it("행동이 하나뿐인 묶음은 mode와 무관하게 택일이 아니다", () => {
    for (const mode of ["ANY_OF", "ALL_OF", "UNKNOWN"] as const) {
      const soleRule = { ...single("IN_CARRIER", "REQUIRED", "INDOOR"), mode };
      expect(resolve("not_required", [soleRule])).toBe("requiredIndoor");
    }
  });

  it("여러 묶음이 있으면 가장 강한 의무가 이긴다", () => {
    expect(
      resolve("not_required", [
        group("ANY_OF", "INDOOR", ["IN_CARRIER", "HELD_BY_OWNER"]),
        single("IN_CARRIER", "REQUIRED", "ALWAYS"),
      ]),
    ).toBe("requiredAlways");
  });
});

/**
 * **표시와 필터가 같은 말을 하는가.**
 *
 * 목록 필터·카드/미리보기 조건 요약·상세 조건 행이 각자 요약 컬럼을 읽던 것이 이번
 * 결함의 원인이었다. 셋이 모두 `resolveCarrierRequirement`를 거치는지 실제 함수를
 * 돌려 확인한다 — 한 곳이라도 컬럼으로 되돌아가면 여기서 깨진다.
 */
describe("이동장 판정 — 목록·카드·상세가 일치한다", () => {
  function listItem(policyDetails: PolicyDetails | null): PlaceListItem {
    return {
      id: "place-1",
      nameKr: "테스트 카페",
      nameEn: null,
      category: "cafe",
      address: "대전시 서구 둔산동",
      phone: null,
      location: null,
      distanceMeters: null,
      thumbnailUrl: null,
      imageAttribution: null,
      indoor: "allowed",
      carrierStrollerPolicy: "not_required",
      maxDogSize: "large",
      leash: "unknown",
      muzzle: "unknown",
      policyDetails,
      breedRestrictions: null,
      caution: null,
      latestVerifiedAt: null,
      verificationMethod: null,
    };
  }

  function detailCondition(policyDetails: PolicyDetails | null): PlaceDetail["condition"] {
    return {
      indoor: "allowed",
      carrierStrollerPolicy: "not_required",
      maxDogSize: "large",
      leash: "unknown",
      muzzle: "unknown",
      vaccinationCertificatePolicy: "unknown",
      breedRestrictions: null,
      requiredItems: [],
      cautions: null,
      policyDetails,
    };
  }

  /** 목록 필터가 이 장소를 `필수 아님`으로 통과시키는가. */
  function passesFilter(policyDetails: PolicyDetails | null): boolean {
    return (
      filterPlaces({
        places: [listItem(policyDetails)],
        selectedCategory: "all",
        searchQuery: "",
        filters: { indoor: "all", carrier: "not-required", dogSize: "all", recent: "all" },
        referenceDate: new Date(2026, 8, 1),
      }).length === 1
    );
  }

  /** 카드·미리보기가 `이동장·유모차 필수 아님`을 허용 조건으로 단언하는가. */
  function cardSaysNotRequired(policyDetails: PolicyDetails | null): boolean {
    return getPlaceConditionBreakdown(listItem(policyDetails)).allowances.includes("noCarrier");
  }

  /** 상세 조건 행이 `필수 아님` 문구를 쓰는가. `t`는 메시지 키를 그대로 돌려준다. */
  function detailSaysNotRequired(policyDetails: PolicyDetails | null): boolean {
    const row = buildConditionRows(detailCondition(policyDetails), (key) => key).find(
      (candidate) => candidate.key === "carrier",
    );
    return row?.value === "carrier.not_required";
  }

  /** 이동장 필터를 걸지 않은 목록. `unknown`도 여기서는 사라지지 않아야 한다. */
  function passesWithoutCarrierFilter(policyDetails: PolicyDetails | null): boolean {
    return (
      filterPlaces({
        places: [listItem(policyDetails)],
        selectedCategory: "all",
        searchQuery: "",
        filters: { indoor: "all", carrier: "all", dogSize: "all", recent: "all" },
        referenceDate: new Date(2026, 8, 1),
      }).length === 1
    );
  }

  const cases: Array<[string, PolicyDetails | null, boolean]> = [
    ["세부 정책 없음 (현재 공개 데이터)", null, true],
    ["안기만 필수", withHandling([single("HELD_BY_OWNER", "REQUIRED", "INDOOR")]), true],
    [
      "안기 또는 이동장 (택일)",
      withHandling([group("ANY_OF", "INDOOR", ["IN_CARRIER", "HELD_BY_OWNER"])]),
      true,
    ],
    ["실내 이동장 필수", withHandling([single("IN_CARRIER", "REQUIRED", "INDOOR")]), false],
    ["항상 이동장 필수", withHandling([single("IN_CARRIER", "REQUIRED", "ALWAYS")]), false],
    [
      "관계 미확인 묶음",
      withHandling([group("UNKNOWN", "INDOOR", ["IN_CARRIER", "HELD_BY_OWNER"])]),
      false,
    ],
    ["조건부 이동장 의무", withHandling([single("IN_CARRIER", "CONDITIONAL", "INDOOR")]), false],
    ["이동장 의무 미확인", withHandling([single("IN_CARRIER", "UNKNOWN", "ALWAYS")]), false],
  ];

  it.each(cases)("%s", (_label, policyDetails, notRequired) => {
    expect(passesFilter(policyDetails)).toBe(notRequired);
    expect(cardSaysNotRequired(policyDetails)).toBe(notRequired);
    expect(detailSaysNotRequired(policyDetails)).toBe(notRequired);
  });

  /**
   * **필터에서 빠지는 것과 목록에서 사라지는 것은 다르다.** `필수 아님`을 고르지 않았다면
   * 어떤 판정이든 목록에 남아, 카드·상세가 그 조건을 있는 대로 알려 준다(D-03·D-12).
   */
  it.each(cases)("%s — 이동장 필터를 걸지 않으면 모두 목록에 남는다", (_label, policyDetails) => {
    expect(passesWithoutCarrierFilter(policyDetails)).toBe(true);
  });
});

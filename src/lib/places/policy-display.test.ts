import { describe, expect, it } from "vitest";

import {
  toPolicyDisplay,
} from "@/lib/places/policy-display";
import { EMPTY_POLICY_DETAILS, type PolicyDetails } from "@/lib/places/policy-details";

/**
 * 사용자 표시 변환 로직.
 * 화면 문구가 아니라 "무엇을 어떤 관계로 보여줄지"를 검증한다.
 */

function details(overrides: Partial<PolicyDetails> = {}): PolicyDetails {
  return { ...EMPTY_POLICY_DETAILS, ...overrides };
}

describe("toPolicyDisplay — 준비물", () => {
  it("단일 필수 항목을 한 줄로 옮긴다", () => {
    const display = toPolicyDisplay(
      details({
        preparation: [
          {
            mode: "UNKNOWN",
            scope: "ALWAYS",
            items: [{ item: "PET_SEAT", status: "REQUIRED" }],
          },
        ],
      }),
    );

    expect(display?.preparation).toEqual([
      {
        itemKeys: ["PET_SEAT"],
        relation: "unknown",
        status: "REQUIRED",
        indoorOnly: false,
        scopeUnknown: false,
      },
    ]);
  });

  it("택일 관계를 그대로 전달한다", () => {
    const display = toPolicyDisplay(
      details({
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

    expect(display?.preparation[0]).toMatchObject({
      itemKeys: ["LEASH", "CARRIER"],
      relation: "anyOf",
      status: "REQUIRED",
    });
  });

  it("모두 필요한 관계를 그대로 전달한다", () => {
    const display = toPolicyDisplay(
      details({
        preparation: [
          {
            mode: "ALL_OF",
            scope: "ALWAYS",
            items: [
              { item: "LEASH", status: "REQUIRED" },
              { item: "PET_SEAT", status: "REQUIRED" },
            ],
          },
        ],
      }),
    );

    expect(display?.preparation[0].relation).toBe("allOf");
  });

  // 원문에 "또는"이 없으면 모두인지 하나인지 화면이 정하지 않는다.
  it("관계가 확인되지 않으면 추측하지 않는다", () => {
    const display = toPolicyDisplay(
      details({
        preparation: [
          {
            mode: "UNKNOWN",
            scope: "ALWAYS",
            items: [
              { item: "LEASH", status: "REQUIRED" },
              { item: "STROLLER", status: "REQUIRED" },
            ],
          },
        ],
      }),
    );

    expect(display?.preparation[0].relation).toBe("unknown");
  });

  it("적용 범위를 함께 전달한다", () => {
    const display = toPolicyDisplay(
      details({
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
      }),
    );

    expect(display?.preparation[0]).toMatchObject({
      indoorOnly: true,
      scopeUnknown: false,
    });
  });

  it("요구 수준이 섞인 묶음은 항목별로 나눈다", () => {
    const display = toPolicyDisplay(
      details({
        preparation: [
          {
            mode: "ALL_OF",
            scope: "ALWAYS",
            items: [
              { item: "PET_SEAT", status: "REQUIRED" },
              { item: "POOP_BAG", status: "RECOMMENDED" },
            ],
          },
        ],
      }),
    );

    expect(display?.preparation).toHaveLength(2);
    expect(display?.preparation.map((line) => line.status)).toEqual([
      "REQUIRED",
      "RECOMMENDED",
    ]);
  });
});

describe("toPolicyDisplay — 조건 6행과 중복 제거", () => {
  function singleItemPreparation(
    item: PolicyDetails["preparation"][number]["items"][number],
    scope: PolicyDetails["preparation"][number]["scope"] = "ALWAYS",
  ) {
    return details({
      preparation: [{ mode: "UNKNOWN", scope, items: [item] }],
    });
  }

  // 목줄 하나만 필수인 조건은 위쪽 "목줄" 행이 이미 같은 말을 하고 있다.
  it("핵심 행과 뜻이 같은 단일 조건은 숨긴다", () => {
    expect(
      toPolicyDisplay(singleItemPreparation({ item: "LEASH", status: "REQUIRED" })),
    ).toBeNull();
    expect(
      toPolicyDisplay(singleItemPreparation({ item: "MUZZLE", status: "NOT_REQUIRED" })),
    ).toBeNull();
    expect(
      toPolicyDisplay(
        singleItemPreparation({ item: "VACCINATION_PROOF", status: "REQUIRED" }),
      ),
    ).toBeNull();
  });

  // 컬럼은 권장을 담지 못해 "확인 필요"가 된다. 여기서 빼면 정보가 사라진다.
  it("권장처럼 컬럼이 담지 못하는 수준은 표시한다", () => {
    expect(
      toPolicyDisplay(singleItemPreparation({ item: "LEASH", status: "RECOMMENDED" }))
        ?.preparation,
    ).toHaveLength(1);
  });

  it("실내 한정처럼 범위가 붙은 조건은 표시한다", () => {
    expect(
      toPolicyDisplay(
        singleItemPreparation({ item: "LEASH", status: "REQUIRED" }, "INDOOR"),
      )?.preparation,
    ).toHaveLength(1);
  });

  it("핵심 행이 없는 항목은 단일이어도 표시한다", () => {
    expect(
      toPolicyDisplay(singleItemPreparation({ item: "PET_SEAT", status: "REQUIRED" }))
        ?.preparation,
    ).toHaveLength(1);
  });

  it("항목이 둘 이상이면 관계가 정보라서 표시한다", () => {
    const display = toPolicyDisplay(
      details({
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

    expect(display?.preparation).toHaveLength(1);
  });
});

describe("toPolicyDisplay — 매장 내 상태", () => {
  it("택일 관계를 그대로 전달한다", () => {
    const display = toPolicyDisplay(
      details({
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
      }),
    );

    expect(display?.handling[0]).toEqual({
      ruleKeys: ["HELD_BY_OWNER", "PET_SEAT"],
      relation: "anyOf",
      status: "REQUIRED",
      scope: "ALWAYS",
    });
  });

  it("금지 조건을 그대로 전달한다", () => {
    const display = toPolicyDisplay(
      details({
        handling: [
          { mode: "UNKNOWN", scope: "ALWAYS", rules: [{ rule: "FREE_ROAM", status: "PROHIBITED" }] },
        ],
      }),
    );

    expect(display?.handling[0].status).toBe("PROHIBITED");
  });
});

describe("toPolicyDisplay — 입장 조건", () => {
  it("예방접종 완료 요구를 입장 조건으로 옮긴다", () => {
    const display = toPolicyDisplay(
      details({ entry: { vaccinationCompletionPolicy: "REQUIRED" } }),
    );

    expect(display?.entry).toEqual({ policy: "REQUIRED" });
  });

  it("요구가 없다는 확인도 전달한다", () => {
    expect(
      toPolicyDisplay(details({ entry: { vaccinationCompletionPolicy: "NOT_REQUIRED" } }))
        ?.entry,
    ).toEqual({ policy: "NOT_REQUIRED" });
  });
});

describe("toPolicyDisplay — 확인 필요 항목", () => {
  // 관리자 질문은 한 언어로만 작성돼 반대 언어 화면에 그대로 나가면 읽을 수 없다.
  it("대상만 전달하고 관리자가 쓴 질문은 담지 않는다", () => {
    const display = toPolicyDisplay(
      details({
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

    expect(display?.uncertainties).toEqual([{ targetKey: "PREPARATION" }]);
    expect(JSON.stringify(display)).not.toContain("셋 중 하나만");
  });

  it("영어로 쓴 질문도 표시 항목에 담기지 않는다", () => {
    const display = toPolicyDisplay(
      details({
        uncertainties: [
          { target: "LEASH", reason: "unclear", question: "Is a leash required indoors?" },
        ],
      }),
    );

    expect(display?.uncertainties).toEqual([{ targetKey: "LEASH" }]);
    expect(JSON.stringify(display)).not.toContain("Is a leash required");
  });

  // 판단 이유와 근거 원문은 운영 기록이다.
  it("내부 판단 이유와 근거 원문은 내보내지 않는다", () => {
    const line = toPolicyDisplay(
      details({
        uncertainties: [
          { target: "LEASH", reason: "내부 메모", quote: "안내문 원문 조각" },
        ],
      }),
    )?.uncertainties[0];

    expect(line).toEqual({ targetKey: "LEASH" });
    expect(JSON.stringify(line)).not.toContain("내부 메모");
    expect(JSON.stringify(line)).not.toContain("안내문 원문 조각");
  });
});

describe("toPolicyDisplay — 빈 값과 하위 호환", () => {
  it("구조화되지 않은 장소는 null이다", () => {
    expect(toPolicyDisplay(null)).toBeNull();
  });

  it("아무 내용도 없으면 null이라 기존 조건만 남는다", () => {
    expect(toPolicyDisplay(EMPTY_POLICY_DETAILS)).toBeNull();
  });

  it("항목이 빈 묶음은 표시하지 않는다", () => {
    expect(
      toPolicyDisplay(
        details({
          preparation: [{ mode: "ANY_OF", scope: "ALWAYS", items: [] }],
          handling: [{ mode: "ANY_OF", scope: "ALWAYS", rules: [] }],
        }),
      ),
    ).toBeNull();
  });
});

describe("toPolicyDisplay — 확인되지 않은 값", () => {
  // UNKNOWN은 "제한 없음"이 아니라 "확인되지 않음"이다 (DESIGN.md §3.3).
  it("확인되지 않은 접종 요구는 입장 조건으로 만들지 않는다", () => {
    expect(
      toPolicyDisplay(details({ entry: { vaccinationCompletionPolicy: "UNKNOWN" } })),
    ).toBeNull();
  });

  it("확인되지 않은 요구 수준을 이용 가능으로 바꾸지 않는다", () => {
    const display = toPolicyDisplay(
      details({
        preparation: [
          {
            mode: "UNKNOWN",
            scope: "UNKNOWN",
            items: [{ item: "PET_SEAT", status: "UNKNOWN" }],
          },
        ],
      }),
    );

    expect(display?.preparation[0]).toMatchObject({
      status: "UNKNOWN",
      scopeUnknown: true,
    });
    expect(display?.preparation[0].status).not.toBe("ALLOWED");
  });
});

describe("toPolicyDisplay — 층·구역 예외", () => {
  it("구역 유형에 필요한 값만 남긴다", () => {
    const display = toPolicyDisplay(
      details({
        spaceExceptions: [
          { area: "FLOOR", floor: -1, appliesToSize: "ALL", access: "NOT_ALLOWED" },
          { area: "OTHER", label: " 루프탑 ", appliesToSize: "SMALL", access: "ALLOWED" },
          { area: "TERRACE", appliesToSize: "ALL", access: "UNKNOWN" },
        ],
      }),
    );

    expect(display?.spaceExceptions).toEqual([
      { area: "FLOOR", floor: -1, label: null, sizeKey: null, access: "NOT_ALLOWED" },
      { area: "OTHER", floor: null, label: "루프탑", sizeKey: "SMALL", access: "ALLOWED" },
      { area: "TERRACE", floor: null, label: null, sizeKey: null, access: "UNKNOWN" },
    ]);
  });

  // 층을 0으로 채우거나 "어떤 구역"이라고 얼버무리면 없는 사실이 생긴다.
  it("가리킬 구역이 없는 줄은 만들지 않는다", () => {
    const display = toPolicyDisplay(
      details({
        spaceExceptions: [
          { area: "FLOOR", appliesToSize: "ALL", access: "ALLOWED" },
          { area: "OTHER", label: "  ", appliesToSize: "ALL", access: "ALLOWED" },
        ],
      }),
    );

    expect(display).toBeNull();
  });

  it("완전히 같은 줄은 한 번만 보여준다", () => {
    const display = toPolicyDisplay(
      details({
        spaceExceptions: [
          { area: "TERRACE", appliesToSize: "ALL", access: "ALLOWED" },
          { area: "TERRACE", appliesToSize: "ALL", access: "ALLOWED" },
        ],
      }),
    );

    expect(display?.spaceExceptions).toHaveLength(1);
  });

  it("크기가 다르면 각각 보여준다", () => {
    const display = toPolicyDisplay(
      details({
        spaceExceptions: [
          { area: "TERRACE", appliesToSize: "SMALL", access: "ALLOWED" },
          { area: "TERRACE", appliesToSize: "LARGE", access: "NOT_ALLOWED" },
        ],
      }),
    );

    expect(display?.spaceExceptions.map((line) => line.sizeKey)).toEqual([
      "SMALL",
      "LARGE",
    ]);
  });
});

describe("toPolicyDisplay — 행동 제한과 위생", () => {
  it("상황과 결과를 그대로 옮긴다", () => {
    const display = toPolicyDisplay(
      details({
        behaviorRestrictions: [
          { trigger: "BARKING", outcome: "MAY_RESTRICT" },
          { trigger: "AGGRESSION", outcome: "UNKNOWN" },
        ],
      }),
    );

    expect(display?.behaviorRestrictions).toEqual([
      { triggerKey: "BARKING", outcome: "MAY_RESTRICT" },
      { triggerKey: "AGGRESSION", outcome: "UNKNOWN" },
    ]);
  });

  it("문구가 없는 위생 코드는 화면에 내보내지 않는다", () => {
    const display = toPolicyDisplay(
      details({
        hygiene: ["OWNER_LIABILITY", "WASH_PAWS", "OWNER_LIABILITY"] as PolicyDetails["hygiene"],
      }),
    );

    expect(display?.hygiene).toEqual([{ ruleKey: "OWNER_LIABILITY" }]);
  });
});

describe("toPolicyDisplay — 입장료", () => {
  it("다루지 않은 입장료는 null로 남긴다 (무료가 아니다)", () => {
    expect(toPolicyDisplay(details({ admission: null }))).toBeNull();
  });

  it("상시·크기 무관 요금은 조건 없이 금액만 남긴다", () => {
    const display = toPolicyDisplay(
      details({
        admission: {
          feePolicy: "PAID",
          rates: [
            { period: "ALL", amountKrw: 10000, dogSize: "ALL" },
            { period: "WEEKEND_HOLIDAY", amountKrw: 15000, dogSize: "SMALL" },
          ],
          includedServices: ["음료 1잔"],
        },
      }),
    );

    expect(display?.admission).toEqual({
      feePolicy: "PAID",
      rates: [
        { periodKey: null, sizeKey: null, amountKrw: 10000 },
        { periodKey: "WEEKEND_HOLIDAY", sizeKey: "SMALL", amountKrw: 15000 },
      ],
      includedServices: ["음료 1잔"],
    });
  });

  // 어느 쪽이 사실인지 알 수 없으므로 금액도 무료도 단정하지 않는다.
  it("요금이 있는데 유료가 아니면 금액을 감추고 확인 필요로 낮춘다", () => {
    const display = toPolicyDisplay(
      details({
        admission: {
          feePolicy: "FREE",
          rates: [{ period: "ALL", amountKrw: 5000, dogSize: "ALL" }],
          includedServices: ["음료 1잔"],
        },
      }),
    );

    expect(display?.admission).toEqual({
      feePolicy: "UNKNOWN",
      rates: [],
      includedServices: ["음료 1잔"],
    });
  });

  it("유료인데 금액이 없으면 그대로 둔다", () => {
    const display = toPolicyDisplay(
      details({
        admission: { feePolicy: "PAID", rates: [], includedServices: [] },
      }),
    );

    expect(display?.admission).toEqual({
      feePolicy: "PAID",
      rates: [],
      includedServices: [],
    });
  });
});

/**
 * 저장 시 `reconcileRequiredItems`가 배변봉투를 `requiredItems`에도 넣는다.
 * 카드가 그 목록을 이미 보여주므로 문장으로 다시 말하지 않는다.
 */
describe("toPolicyDisplay — 배변봉투 중복", () => {
  const poopBag = (status: "REQUIRED" | "NOT_REQUIRED"): PolicyDetails =>
    details({
      preparation: [
        { mode: "ALL_OF", scope: "ALWAYS", items: [{ item: "POOP_BAG", status }] },
      ],
    });

  it("필요 준비물 줄에 이미 있으면 문장을 만들지 않는다", () => {
    const display = toPolicyDisplay(poopBag("REQUIRED"), {
      requiredItems: ["POOP_BAG"],
    });

    expect(display).toBeNull();
  });

  // 동기화 이전에 저장된 데이터라면 이 그룹이 유일한 정보원이다.
  it("목록에 없으면 그대로 보여준다", () => {
    const display = toPolicyDisplay(poopBag("REQUIRED"), { requiredItems: [] });

    expect(display?.preparation).toHaveLength(1);
  });

  // 목록은 "안 챙겨도 된다"를 담지 못한다.
  it("안 챙겨도 되는 경우는 목록과 무관하게 보여준다", () => {
    const display = toPolicyDisplay(poopBag("NOT_REQUIRED"), {
      requiredItems: ["POOP_BAG"],
    });

    expect(display?.preparation[0].status).toBe("NOT_REQUIRED");
  });

  it("택일 묶음은 목록이 담지 못하므로 그대로 보여준다", () => {
    const display = toPolicyDisplay(
      details({
        preparation: [
          {
            mode: "ANY_OF",
            scope: "ALWAYS",
            items: [
              { item: "POOP_BAG", status: "REQUIRED" },
              { item: "CARRIER", status: "REQUIRED" },
            ],
          },
        ],
      }),
      { requiredItems: ["POOP_BAG"] },
    );

    expect(display?.preparation).toHaveLength(1);
  });
});

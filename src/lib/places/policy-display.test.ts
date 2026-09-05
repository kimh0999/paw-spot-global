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

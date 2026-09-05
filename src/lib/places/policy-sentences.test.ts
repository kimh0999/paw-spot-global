import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  toPolicyDisplay,
  type PolicyHandlingLine,
  type PolicyPreparationLine,
} from "@/lib/places/policy-display";
import { EMPTY_POLICY_DETAILS, type PolicyDetails } from "@/lib/places/policy-details";
import {
  appendObjectParticle,
  buildHandlingSentence,
  buildPreparationSentence,
  buildUncertaintySentence,
  joinHandlingClauses,
  joinPolicyItems,
  type Translate,
} from "@/lib/places/policy-sentences";

/**
 * 표시 항목을 문장으로 조합하는 로직.
 * 실제 메시지 파일을 읽어 화면에 나가는 문구를 그대로 검증한다.
 */
describe("joinPolicyItems", () => {
  // "모두"는 여기서 붙이지 않는다 — 한국어는 목적격 조사 뒤에 와야 자연스러워서
  // ("목줄과 입마개를 모두") 문장 조합 단계에서 붙인다.
  it("한국어는 받침에 따라 와/과를 고른다", () => {
    expect(joinPolicyItems(["목줄", "이동가방"], "allOf", "ko")).toBe("목줄과 이동가방");
    expect(joinPolicyItems(["케이지", "유모차"], "allOf", "ko")).toBe("케이지와 유모차");
  });

  it("한국어 택일은 '또는 … 중 하나'로 잇는다", () => {
    expect(joinPolicyItems(["목줄", "이동가방"], "anyOf", "ko")).toBe(
      "목줄 또는 이동가방 중 하나",
    );
  });

  it("영어는 either/both로 잇는다", () => {
    expect(joinPolicyItems(["a leash", "a carrier bag"], "anyOf", "en")).toBe(
      "either a leash or a carrier bag",
    );
    expect(joinPolicyItems(["a leash", "a crate"], "allOf", "en")).toBe(
      "both a leash and a crate",
    );
  });

  it("관계가 확인되지 않으면 '모두'나 '하나' 없이 나열만 한다", () => {
    expect(joinPolicyItems(["목줄", "유모차"], "unknown", "ko")).toBe("목줄과 유모차");
    expect(joinPolicyItems(["a leash", "a stroller"], "unknown", "en")).toBe(
      "a leash and a stroller",
    );
  });

  it("항목이 하나면 그대로 둔다", () => {
    expect(joinPolicyItems(["목줄"], "anyOf", "ko")).toBe("목줄");
  });
});

describe("appendObjectParticle", () => {
  it("한국어에서만 목적격 조사를 붙인다", () => {
    expect(appendObjectParticle("목줄", "ko")).toBe("목줄을");
    expect(appendObjectParticle("목줄 또는 이동가방 중 하나", "ko")).toBe(
      "목줄 또는 이동가방 중 하나를",
    );
    expect(appendObjectParticle("a leash", "en")).toBe("a leash");
  });
});

describe("번역 키", () => {
  function policyKeys(file: string): string[] {
    const raw = JSON.parse(
      readFileSync(path.join(process.cwd(), "messages", file), "utf8"),
    );
    const flatten = (value: unknown, prefix = ""): string[] =>
      typeof value === "object" && value !== null
        ? Object.entries(value).flatMap(([key, child]) =>
            flatten(child, `${prefix}${key}.`),
          )
        : [prefix.slice(0, -1)];
    return flatten(raw.places.detail.policyDetails).sort();
  }

  it("ko와 en의 표시용 키가 완전히 일치한다", () => {
    const ko = policyKeys("ko.json");
    const en = policyKeys("en.json");

    expect(ko).toEqual(en);
    expect(ko.length).toBeGreaterThan(0);
  });
});

/** 실제 메시지로 문장을 만들어 본다 — 화면에 나가는 문구를 그대로 검증한다. */
function translator(locale: "ko" | "en"): Translate {
  const messages = JSON.parse(
    readFileSync(path.join(process.cwd(), "messages", `${locale}.json`), "utf8"),
  ).places.detail.policyDetails;

  return (key, values) => {
    const template = key
      .split(".")
      .reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], messages);
    if (typeof template !== "string") throw new Error(`missing message: ${key}`);
    return template.replace(/\{(\w+)\}/g, (_, name: string) => values?.[name] ?? "");
  };
}

describe("문장 조합 — 관계가 확인되지 않은 준비물", () => {
  const line = {
    itemKeys: ["LEASH", "CRATE"] as const,
    relation: "unknown" as const,
    status: "REQUIRED" as const,
    indoorOnly: true,
    scopeUnknown: false,
  };

  it("한국어가 '모두 필수'라고 단정하지 않는다", () => {
    const text = buildPreparationSentence({ ...line, itemKeys: [...line.itemKeys] }, translator("ko"), "ko");

    expect(text).toContain("매장에 확인해 주세요");
    expect(text).not.toContain("반드시 챙겨야 합니다");
    expect(text).not.toContain("모두를");
    expect(text).not.toContain("중 하나를");
  });

  it("영어가 both required나 either sufficient를 단정하지 않는다", () => {
    const text = buildPreparationSentence({ ...line, itemKeys: [...line.itemKeys] }, translator("en"), "en");

    expect(text).toContain("Check with the place");
    expect(text).not.toMatch(/^You must bring/);
    // "둘 다인지 하나면 되는지"를 묻는 형태여야 하고 어느 쪽도 단정하지 않는다.
    expect(text).toMatch(/whether/);
    expect(text).toMatch(/or just one/);
  });

  it("두 언어 모두 매장 확인 안내를 포함한다", () => {
    for (const locale of ["ko", "en"] as const) {
      const text = buildPreparationSentence(
        { ...line, itemKeys: [...line.itemKeys] },
        translator(locale),
        locale,
      );
      expect(text.length).toBeGreaterThan(0);
      expect(text).toMatch(locale === "ko" ? /매장에 확인해 주세요/ : /Check with the place/);
    }
  });

  it("적용 범위는 그대로 문장에 남는다", () => {
    expect(
      buildPreparationSentence({ ...line, itemKeys: [...line.itemKeys] }, translator("ko"), "ko"),
    ).toContain("실내 동반 시");
  });

  it("관계를 아는 묶음은 지금처럼 단정한다", () => {
    const known = {
      ...line,
      itemKeys: ["LEASH", "CARRIER"] as PolicyPreparationLine["itemKeys"],
      relation: "anyOf" as const,
      indoorOnly: false,
    };

    expect(buildPreparationSentence(known, translator("ko"), "ko")).toBe(
      "목줄 또는 이동가방 중 하나를 반드시 챙겨야 합니다",
    );
    expect(buildPreparationSentence(known, translator("en"), "en")).toBe(
      "You must bring either a leash or a carrier bag",
    );
  });
});

describe("문장 조합 — 매장 안에서", () => {
  it("택일 조건을 자연스러운 문장으로 만든다", () => {
    const line = {
      ruleKeys: ["HELD_BY_OWNER", "PET_SEAT"] as PolicyHandlingLine["ruleKeys"],
      relation: "anyOf" as const,
      status: "REQUIRED" as const, scope: "ALWAYS" as const,
    };

    expect(buildHandlingSentence(line, translator("ko"), "ko")).toBe(
      "반려견을 안고 있어야 하거나 전용 의자에 앉혀야 합니다",
    );
    expect(buildHandlingSentence(line, translator("en"), "en")).toBe(
      "You must either hold your dog or seat your dog in a pet seat",
    );
  });

  it("금지 조건을 자연스러운 문장으로 만든다", () => {
    const line = {
      ruleKeys: ["FREE_ROAM"] as PolicyHandlingLine["ruleKeys"],
      relation: "unknown" as const,
      status: "PROHIBITED" as const, scope: "ALWAYS" as const,
    };

    expect(buildHandlingSentence(line, translator("ko"), "ko")).toBe(
      "반려견이 매장 안에서 자유롭게 다니게 해서는 안 됩니다",
    );
    expect(buildHandlingSentence(line, translator("en"), "en")).toBe(
      "You must not let your dog roam freely",
    );
  });

  // "무엇을 지킬지"로 물으면 하나만 적용된다는 뜻이 된다. 관계 미확인은 모두인지 하나인지를 모르는 상태다.
  it("모두인지 하나인지를 묻고 어느 쪽도 단정하지 않는다", () => {
    const line = {
      ruleKeys: ["HELD_BY_OWNER", "IN_CARRIER"] as PolicyHandlingLine["ruleKeys"],
      relation: "unknown" as const,
      status: "REQUIRED" as const, scope: "ALWAYS" as const,
    };

    expect(buildHandlingSentence(line, translator("ko"), "ko")).toBe(
      "반려견을 안고 있기와 이동장 안에 두기를 모두 지켜야 하는지 하나만 지키면 되는지 매장에 확인해 주세요",
    );
    expect(buildHandlingSentence(line, translator("en"), "en")).toBe(
      "Check with the place whether all of these rules apply or only one: holding your dog and keeping your dog in a carrier",
    );
  });

  it("어느 관계도 사실로 단정하지 않는다", () => {
    const line = {
      ruleKeys: ["HELD_BY_OWNER", "IN_CARRIER"] as PolicyHandlingLine["ruleKeys"],
      relation: "unknown" as const,
      status: "REQUIRED" as const, scope: "ALWAYS" as const,
    };

    const ko = buildHandlingSentence(line, translator("ko"), "ko");
    const en = buildHandlingSentence(line, translator("en"), "en");

    expect(ko).toContain("모두 지켜야 하는지 하나만 지키면 되는지");
    expect(ko).not.toContain("야 합니다");
    expect(ko).not.toContain("중 하나가");

    expect(en).toMatch(/whether all of these rules apply or only one/);
    expect(en).not.toMatch(/^You must/);
    expect(en).not.toContain("either holding");
    expect(en).not.toContain("both holding");
  });

  it("항목이 셋이어도 같은 의미로 조합된다", () => {
    const line = {
      ruleKeys: [
        "HELD_BY_OWNER",
        "IN_CARRIER",
        "PET_SEAT",
      ] as PolicyHandlingLine["ruleKeys"],
      relation: "unknown" as const,
      status: "REQUIRED" as const, scope: "ALWAYS" as const,
    };

    expect(buildHandlingSentence(line, translator("ko"), "ko")).toBe(
      "반려견을 안고 있기, 이동장 안에 두기, 전용 의자에 앉히기를 모두 지켜야 하는지 하나만 지키면 되는지 매장에 확인해 주세요",
    );
    expect(buildHandlingSentence(line, translator("en"), "en")).toBe(
      "Check with the place whether all of these rules apply or only one: holding your dog, keeping your dog in a carrier and seating your dog in a pet seat",
    );
  });
});

/**
 * 행동 2개 이상은 모두 "반드시"일 때만 한 문장으로 이을 수 있다.
 * 금지·허용·조건부가 섞이면 앞 절이 요구로 읽혀 뜻이 뒤집히므로 문장을 만들지 않는다.
 * 저장은 policy-details-form이 막지만, 옛 데이터와 폼 밖 입력이 화면까지 올 수 있다.
 */
describe("문장 조합 — 행동 2개 이상인데 필수가 아닌 조건", () => {
  const rules = ["FREE_ROAM", "ON_CHAIR_OR_TABLE"] as PolicyHandlingLine["ruleKeys"];

  it.each(["PROHIBITED", "ALLOWED", "CONDITIONAL", "UNKNOWN"] as const)(
    "%s는 뜻을 추측하지 않고 확인을 요청한다",
    (status) => {
      const line = { ruleKeys: rules, relation: "anyOf" as const, status, scope: "ALWAYS" as const };

      expect(buildHandlingSentence(line, translator("ko"), "ko")).toBe(
        "매장 내 이용 조건을 매장에 확인해 주세요",
      );
      expect(buildHandlingSentence(line, translator("en"), "en")).toBe(
        "Check the in-store rules with the place",
      );
    },
  );

  // 뜻이 뒤집히던 문장이 다시 나오지 않는지 본다.
  it("금지 조건을 요구처럼 잇지 않는다", () => {
    const ko = buildHandlingSentence(
      { ruleKeys: rules, relation: "allOf", status: "PROHIBITED", scope: "ALWAYS" },
      translator("ko"),
      "ko",
    );
    const en = buildHandlingSentence(
      { ruleKeys: rules, relation: "anyOf", status: "PROHIBITED", scope: "ALWAYS" },
      translator("en"),
      "en",
    );

    expect(ko).not.toContain("해야 하거나");
    expect(ko).not.toContain("해야 하고");
    expect(en).not.toContain("must not either");
  });

  it("행동이 하나면 금지·허용·조건부를 그대로 문장으로 만든다", () => {
    const one = ["FREE_ROAM"] as PolicyHandlingLine["ruleKeys"];

    expect(
      buildHandlingSentence(
        { ruleKeys: one, relation: "unknown", status: "ALLOWED", scope: "ALWAYS" },
        translator("ko"),
        "ko",
      ),
    ).toBe("반려견이 매장 안에서 자유롭게 다니게 해도 됩니다");
    expect(
      buildHandlingSentence(
        { ruleKeys: one, relation: "unknown", status: "CONDITIONAL", scope: "ALWAYS" },
        translator("en"),
        "en",
      ),
    ).toBe("You may need to let your dog roam freely, depending on the situation");
  });

  it("모두 필수면 지금처럼 한 문장으로 잇는다", () => {
    expect(
      buildHandlingSentence(
        {
          ruleKeys: ["HELD_BY_OWNER", "PET_SEAT"] as PolicyHandlingLine["ruleKeys"],
          relation: "anyOf",
          status: "REQUIRED",
          scope: "ALWAYS",
        },
        translator("ko"),
        "ko",
      ),
    ).toBe("반려견을 안고 있어야 하거나 전용 의자에 앉혀야 합니다");
  });
});

/**
 * DB에 이미 들어 있던 어긋난 묶음이 화면까지 오는 경로.
 * 저장은 이제 막히지만 옛 행과 폼 밖 입력은 그대로 남아 있다.
 */
describe("어긋난 묶음이 화면에 닿아도 뜻이 뒤집히지 않는다", () => {
  function handlingSentences(details: PolicyDetails, locale: "ko" | "en"): string[] {
    const display = toPolicyDisplay(details);
    return (display?.handling ?? []).map((line) =>
      buildHandlingSentence(line, translator(locale), locale),
    );
  }

  const broken: PolicyDetails = {
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

  it("금지 묶음은 정형 안내로 내린다", () => {
    expect(handlingSentences(broken, "ko")).toEqual([
      "매장 내 이용 조건을 매장에 확인해 주세요",
    ]);
    expect(handlingSentences(broken, "en")).toEqual([
      "Check the in-store rules with the place",
    ]);
  });

  // 상태가 섞인 묶음은 표시 계층이 한 줄씩 나누므로 단일 문장 규칙을 그대로 탄다.
  it("상태가 섞인 묶음은 행동별로 나뉘어 각각 정확히 표현된다", () => {
    const mixed: PolicyDetails = {
      ...EMPTY_POLICY_DETAILS,
      handling: [
        {
          mode: "ALL_OF",
          scope: "ALWAYS",
          rules: [
            { rule: "HELD_BY_OWNER", status: "REQUIRED" },
            { rule: "FREE_ROAM", status: "PROHIBITED" },
          ],
        },
      ],
    };

    expect(handlingSentences(mixed, "ko")).toEqual([
      "반려견을 안고 있어야 합니다",
      "반려견이 매장 안에서 자유롭게 다니게 해서는 안 됩니다",
    ]);
  });
});

/**
 * 실내/실외 구분. 범위가 빠지면 "안고 계세요"와 "바닥에서 걷게 해도 됩니다"가
 * 한 화면에서 모순돼 보인다 — 실제 매장 안내문(화람)이 이 형태다.
 */
describe("문장 조합 — 매장 안에서의 적용 범위", () => {
  const held = ["HELD_BY_OWNER"] as PolicyHandlingLine["ruleKeys"];

  it("실내 한정을 문장에 남긴다", () => {
    const line: PolicyHandlingLine = {
      ruleKeys: held,
      relation: "unknown",
      status: "REQUIRED",
      scope: "INDOOR",
    };

    expect(buildHandlingSentence(line, translator("ko"), "ko")).toBe(
      "실내 동반 시 반려견을 안고 있어야 합니다",
    );
    expect(buildHandlingSentence(line, translator("en"), "en")).toBe(
      "When indoors: You must hold your dog",
    );
  });

  it("실외 한정을 문장에 남긴다", () => {
    const line: PolicyHandlingLine = {
      ruleKeys: ["ON_LEASH_FLOOR"] as PolicyHandlingLine["ruleKeys"],
      relation: "unknown",
      status: "ALLOWED",
      scope: "OUTDOOR",
    };

    expect(buildHandlingSentence(line, translator("ko"), "ko")).toBe(
      "실외 동반 시 목줄을 매고 바닥에서 걷게 해도 됩니다",
    );
    expect(buildHandlingSentence(line, translator("en"), "en")).toBe(
      "When outdoors: You may keep your dog on a leash on the floor",
    );
  });

  it("범위가 확인되지 않았으면 확인을 덧붙인다", () => {
    const line: PolicyHandlingLine = {
      ruleKeys: held,
      relation: "unknown",
      status: "REQUIRED",
      scope: "UNKNOWN",
    };

    expect(buildHandlingSentence(line, translator("ko"), "ko")).toBe(
      "반려견을 안고 있어야 합니다 (언제 적용되는지는 매장에 확인해 주세요)",
    );
  });

  it("항상 적용이면 아무것도 덧붙이지 않는다", () => {
    const line: PolicyHandlingLine = {
      ruleKeys: held,
      relation: "unknown",
      status: "REQUIRED",
      scope: "ALWAYS",
    };

    expect(buildHandlingSentence(line, translator("ko"), "ko")).toBe(
      "반려견을 안고 있어야 합니다",
    );
  });

  // 실제 매장 안내문 한 건이 뜻을 잃지 않고 담기는지 본다.
  it("실내와 실외에 서로 다른 상태를 요구하는 안내문을 담는다", () => {
    const hwaram: PolicyDetails = {
      ...EMPTY_POLICY_DETAILS,
      handling: [
        {
          mode: "ANY_OF",
          scope: "INDOOR",
          rules: [
            { rule: "IN_CARRIER", status: "REQUIRED" },
            { rule: "HELD_BY_OWNER", status: "REQUIRED" },
          ],
        },
        {
          mode: "UNKNOWN",
          scope: "OUTDOOR",
          rules: [{ rule: "ON_LEASH_FLOOR", status: "ALLOWED" }],
        },
      ],
    };

    const lines = (toPolicyDisplay(hwaram)?.handling ?? []).map((line) =>
      buildHandlingSentence(line, translator("ko"), "ko"),
    );

    expect(lines).toEqual([
      "실내 동반 시 이동장 안에 두어야 하거나 반려견을 안고 있어야 합니다",
      "실외 동반 시 목줄을 매고 바닥에서 걷게 해도 됩니다",
    ]);
  });
});

describe("문구 정리", () => {
  // F-3: "모두"는 목적격 조사 뒤에 온다.
  it("한국어 '모두'는 조사 뒤에 붙는다", () => {
    const line: PolicyPreparationLine = {
      itemKeys: ["LEASH", "MUZZLE"],
      relation: "allOf",
      status: "REQUIRED",
      indoorOnly: false,
      scopeUnknown: false,
    };

    expect(buildPreparationSentence(line, translator("ko"), "ko")).toBe(
      "목줄과 입마개를 모두 반드시 챙겨야 합니다",
    );
    expect(buildPreparationSentence(line, translator("en"), "en")).toBe(
      "You must bring both a leash and a muzzle",
    );
  });

  // F-2: 한 줄만 마침표로 끝나면 목록 안에서 튄다.
  it("영어 표시 문구는 어느 것도 마침표로 끝나지 않는다", () => {
    const messages = JSON.parse(
      readFileSync(path.join(process.cwd(), "messages", "en.json"), "utf8"),
    ).places.detail.policyDetails;
    const strings = (value: unknown): string[] =>
      typeof value === "string"
        ? [value]
        : Object.values(value as Record<string, unknown>).flatMap(strings);

    expect(strings(messages).filter((text) => text.endsWith("."))).toEqual([]);
  });
});

describe("문장 조합 — 확인 필요 항목", () => {
  it("대상별 정형 문구를 각 언어로 만든다", () => {
    expect(buildUncertaintySentence({ targetKey: "LEASH" }, translator("ko"))).toBe(
      "목줄 조건을 매장에 확인해 주세요",
    );
    expect(buildUncertaintySentence({ targetKey: "LEASH" }, translator("en"))).toBe(
      "Check the leash requirements with the place",
    );
  });

  it("모든 대상이 두 언어 모두에서 문장이 된다", () => {
    const targets = [
      "INDOOR",
      "MAX_DOG_SIZE",
      "BREED_RESTRICTIONS",
      "CARRIER_STROLLER",
      "LEASH",
      "MUZZLE",
      "VACCINATION_CERTIFICATE",
      "VACCINATION_COMPLETION",
      "PREPARATION",
      "HANDLING",
      "SPACE",
      "BEHAVIOR",
      "ADMISSION",
      "HYGIENE",
    ] as const;

    for (const targetKey of targets) {
      for (const locale of ["ko", "en"] as const) {
        const text = buildUncertaintySentence({ targetKey }, translator(locale));
        expect(text).not.toContain("{");
        expect(text).toMatch(locale === "ko" ? /매장에 확인해 주세요$/ : /^Check /);
      }
    }
  });
});

describe("joinHandlingClauses", () => {
  it("한국어는 연결 어미로 잇는다", () => {
    expect(joinHandlingClauses(["반려견을 안고 있어", "전용 의자에 앉혀"], "anyOf", "ko")).toBe(
      "반려견을 안고 있어야 하거나 전용 의자에 앉혀",
    );
    expect(joinHandlingClauses(["반려견을 안고 있어", "전용 의자에 앉혀"], "allOf", "ko")).toBe(
      "반려견을 안고 있어야 하고 전용 의자에 앉혀",
    );
  });

  it("영어는 either/and로 잇는다", () => {
    expect(joinHandlingClauses(["hold your dog", "seat your dog"], "anyOf", "en")).toBe(
      "either hold your dog or seat your dog",
    );
  });
});

/**
 * 관리자 질문은 한 언어로만 작성된다. 저장은 계속하되 사용자 화면에는 내보내지 않는다.
 * DB 값에서 문장까지 이어서 확인한다.
 */
describe("확인 필요 항목 — 자유문자열이 반대 언어로 새지 않는다", () => {
  function sentences(details: PolicyDetails, locale: "ko" | "en"): string[] {
    const display = toPolicyDisplay(details);
    return (display?.uncertainties ?? []).map((line) =>
      buildUncertaintySentence(line, translator(locale)),
    );
  }

  const koreanQuestion = "셋 중 하나만 챙기면 되나요?";
  const englishQuestion = "Is a leash required indoors?";

  it("한국어로 쓴 질문이 영어 화면에 나오지 않는다", () => {
    const details: PolicyDetails = {
      ...EMPTY_POLICY_DETAILS,
      uncertainties: [
        { target: "PREPARATION", reason: "슬래시가 택일인지 불명확", question: koreanQuestion },
      ],
    };

    expect(sentences(details, "en")).toEqual(["Check what you need to bring with the place"]);
    expect(sentences(details, "en").join(" ")).not.toContain(koreanQuestion);
  });

  it("영어로 쓴 질문이 한국어 화면에 나오지 않는다", () => {
    const details: PolicyDetails = {
      ...EMPTY_POLICY_DETAILS,
      uncertainties: [{ target: "LEASH", reason: "unclear", question: englishQuestion }],
    };

    expect(sentences(details, "ko")).toEqual(["목줄 조건을 매장에 확인해 주세요"]);
    expect(sentences(details, "ko").join(" ")).not.toContain(englishQuestion);
  });

  it("판단 이유와 근거 원문도 어느 언어에서든 나오지 않는다", () => {
    const details: PolicyDetails = {
      ...EMPTY_POLICY_DETAILS,
      uncertainties: [
        {
          target: "MUZZLE",
          reason: "내부 판단 메모",
          quote: "안내문 원문 조각",
          question: koreanQuestion,
        },
      ],
    };

    for (const locale of ["ko", "en"] as const) {
      const text = sentences(details, locale).join(" ");
      expect(text).not.toContain("내부 판단 메모");
      expect(text).not.toContain("안내문 원문 조각");
      expect(text).not.toContain(koreanQuestion);
    }
  });
});

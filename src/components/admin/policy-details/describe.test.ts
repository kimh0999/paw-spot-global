import { describe, expect, it } from "vitest";

import {
  describeHandling,
  describePreparation,
  sharedStatus,
} from "@/components/admin/policy-details/describe";
import type { PolicyDetails } from "@/lib/places/policy-details";

type PreparationGroup = PolicyDetails["preparation"][number];
type HandlingGroup = PolicyDetails["handling"][number];

function preparation(group: Partial<PreparationGroup> = {}): PreparationGroup {
  return {
    mode: "UNKNOWN",
    scope: "ALWAYS",
    items: [{ item: "LEASH", status: "REQUIRED" }],
    ...group,
  } as PreparationGroup;
}

function handling(group: Partial<HandlingGroup> = {}): HandlingGroup {
  return {
    mode: "UNKNOWN",
    rules: [{ rule: "HELD_BY_OWNER", status: "REQUIRED" }],
    ...group,
  } as HandlingGroup;
}

describe("sharedStatus", () => {
  it("모두 같으면 그 값을 돌려준다", () => {
    expect(
      sharedStatus([{ status: "REQUIRED" }, { status: "REQUIRED" }]),
    ).toBe("REQUIRED");
  });

  // 섞인 값을 하나로 합치면 원래 뜻이 사라진다. 화면이 항목별 선택으로 돌아가는 신호다.
  it("섞여 있으면 null을 돌려준다", () => {
    expect(
      sharedStatus([{ status: "REQUIRED" }, { status: "RECOMMENDED" }]),
    ).toBeNull();
  });

  it("빈 묶음은 null이다", () => {
    expect(sharedStatus([])).toBeNull();
  });
});

describe("describePreparation", () => {
  it("항목 1개는 관계를 말하지 않는다", () => {
    expect(describePreparation(preparation())).toBe("목줄을 반드시 챙겨야 합니다");
  });

  // 이 문장이 틀리면 "둘 다 필요"로 오해된다 — 미리보기의 핵심 목적이다.
  it("하나만 필요한 관계를 '또는'으로 읽어 준다", () => {
    expect(
      describePreparation(
        preparation({
          mode: "ANY_OF",
          items: [
            { item: "LEASH", status: "REQUIRED" },
            { item: "CARRIER", status: "REQUIRED" },
          ],
        }),
      ),
    ).toBe("목줄 또는 이동가방 중 하나를 반드시 챙겨야 합니다");
  });

  it("모두 필요한 관계는 '모두'로 읽어 준다", () => {
    expect(
      describePreparation(
        preparation({
          mode: "ALL_OF",
          items: [
            { item: "LEASH", status: "REQUIRED" },
            { item: "CRATE", status: "REQUIRED" },
          ],
        }),
      ),
    ).toBe("목줄과 케이지 모두를 반드시 챙겨야 합니다");
  });

  it("실내 한정 조건을 앞에 붙인다", () => {
    expect(describePreparation(preparation({ scope: "INDOOR" }))).toBe(
      "실내 동반 시 목줄을 반드시 챙겨야 합니다",
    );
  });

  it("확인되지 않은 관계와 적용 범위를 문장 끝에 남긴다", () => {
    expect(
      describePreparation(
        preparation({
          mode: "UNKNOWN",
          scope: "UNKNOWN",
          items: [
            { item: "LEASH", status: "REQUIRED" },
            { item: "STROLLER", status: "REQUIRED" },
          ],
        }),
      ),
    ).toBe("목줄, 유모차를 반드시 챙겨야 합니다 (적용 범위 확인 필요 · 항목 간 관계 확인 필요)");
  });

  it("요구 수준이 섞인 묶음은 항목별로 읽어 준다", () => {
    expect(
      describePreparation(
        preparation({
          mode: "ALL_OF",
          items: [
            { item: "LEASH", status: "REQUIRED" },
            { item: "POOP_BAG", status: "RECOMMENDED" },
          ],
        }),
      ),
    ).toBe("목줄을 반드시 챙겨야 합니다 · 배변봉투 지참을 권장합니다");
  });

  it("항목이 없으면 무엇을 해야 하는지 알린다", () => {
    expect(describePreparation(preparation({ items: [] }))).toBe(
      "챙길 준비물을 1개 이상 선택하세요.",
    );
  });

  it("확인되지 않은 요구 수준을 단정하지 않는다", () => {
    expect(
      describePreparation(preparation({ items: [{ item: "MUZZLE", status: "UNKNOWN" }] })),
    ).toBe("입마개 필요 여부는 확인되지 않았습니다");
  });
});

describe("describeHandling", () => {
  it("단일 규칙을 문장으로 읽어 준다", () => {
    expect(describeHandling(handling())).toBe("보호자가 안고 있기가 필수입니다");
  });

  it("택일 관계를 '또는'으로 읽어 준다", () => {
    expect(
      describeHandling(
        handling({
          mode: "ANY_OF",
          rules: [
            { rule: "HELD_BY_OWNER", status: "REQUIRED" },
            { rule: "PET_SEAT", status: "REQUIRED" },
          ],
        }),
      ),
    ).toBe("보호자가 안고 있기 또는 전용 의자에 앉히기 중 하나가 필수입니다");
  });

  it("금지 조건을 금지로 읽어 준다", () => {
    expect(
      describeHandling(handling({ rules: [{ rule: "FREE_ROAM", status: "PROHIBITED" }] })),
    ).toBe("자유롭게 다니기는 금지입니다");
  });

  it("규칙이 없으면 무엇을 해야 하는지 알린다", () => {
    expect(describeHandling(handling({ rules: [] }))).toBe(
      "매장 안에서의 상태를 1개 이상 선택하세요.",
    );
  });
});

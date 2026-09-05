import { comitativeParticle, objectParticle } from "@/lib/i18n/korean-particle";
import type { PolicyDetails } from "@/lib/places/policy-details";

import {
  HANDLING_RULE_LABELS,
  HANDLING_STATUS_LABELS,
  PREPARATION_ITEM_LABELS,
  PREPARATION_STATUS_LABELS,
} from "./labels";

/**
 * 입력한 조건을 자연어 한 문장으로 옮긴다.
 *
 * 관리자가 고른 값이 실제로 어떤 뜻으로 저장되는지 저장 전에 확인하기 위한 미리보기다.
 * 저장 형식이나 판정 규칙에는 관여하지 않는다 — 표시 전용이다.
 */

type PreparationGroup = PolicyDetails["preparation"][number];
type HandlingGroup = PolicyDetails["handling"][number];

/**
 * 묶음 안의 항목이 모두 같은 요구 수준이면 그 값을, 섞여 있으면 null을 돌려준다.
 *
 * 화면은 묶음마다 요구 수준을 하나만 고르게 하지만, 예전에 항목별로 다르게 저장된 값이
 * 있을 수 있다. 그런 묶음은 자동으로 합치지 않고 항목별 선택을 그대로 보여준다.
 */
export function sharedStatus<T extends { status: string }>(items: T[]): string | null {
  if (items.length === 0) return null;

  const first = items[0].status;
  return items.every((item) => item.status === first) ? first : null;
}

function joinItemNames(names: string[], mode: string): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];

  if (mode === "ANY_OF") return `${names.join(" 또는 ")} 중 하나`;

  if (mode === "ALL_OF") {
    if (names.length === 2) {
      return `${names[0]}${comitativeParticle(names[0])} ${names[1]} 모두`;
    }
    return `${names.join(", ")} 모두`;
  }

  return names.join(", ");
}

function preparationClause(phrase: string, status: string): string {
  switch (status) {
    case "REQUIRED":
      return `${phrase}${objectParticle(phrase)} 반드시 챙겨야 합니다`;
    case "RECOMMENDED":
      return `${phrase} 지참을 권장합니다`;
    case "ALLOWED":
      return `${phrase} 지참이 허용됩니다`;
    case "NOT_REQUIRED":
      return `${phrase} 지참은 필요하지 않습니다`;
    default:
      return `${phrase} 필요 여부는 확인되지 않았습니다`;
  }
}

/** 준비물 묶음 한 개를 문장으로. 항목이 없으면 무엇을 골라야 하는지 알린다. */
export function describePreparation(group: PreparationGroup): string {
  const names = group.items.map(
    (item) => PREPARATION_ITEM_LABELS[item.item] ?? item.item,
  );
  if (names.length === 0) return "챙길 준비물을 1개 이상 선택하세요.";

  const prefix = group.scope === "INDOOR" ? "실내 동반 시 " : "";
  const notes: string[] = [];
  if (group.scope === "UNKNOWN") notes.push("적용 범위 확인 필요");
  if (group.mode === "UNKNOWN" && names.length > 1) notes.push("항목 간 관계 확인 필요");

  const status = sharedStatus(group.items);
  const body =
    status === null
      ? // 항목마다 요구 수준이 다른 예전 데이터. 합치지 않고 그대로 읽어 준다.
        group.items
          .map((item, index) => preparationClause(names[index], item.status))
          .join(" · ")
      : preparationClause(joinItemNames(names, group.mode), status);

  const suffix = notes.length > 0 ? ` (${notes.join(" · ")})` : "";
  return `${prefix}${body}${suffix}`;
}

function handlingClause(phrase: string, status: string): string {
  switch (status) {
    case "REQUIRED":
      return `${phrase}가 필수입니다`;
    case "ALLOWED":
      return `${phrase}가 허용됩니다`;
    case "PROHIBITED":
      return `${phrase}는 금지입니다`;
    case "CONDITIONAL":
      return `${phrase}는 상황에 따라 가능합니다`;
    default:
      return `${phrase} 여부는 확인되지 않았습니다`;
  }
}

/** 매장 내 상태 묶음 한 개를 문장으로. */
const HANDLING_SCOPE_PREFIX: Record<string, string> = {
  INDOOR: "실내에서는 ",
  OUTDOOR: "실외에서는 ",
};

export function describeHandling(group: HandlingGroup): string {
  const names = group.rules.map((rule) => HANDLING_RULE_LABELS[rule.rule] ?? rule.rule);
  if (names.length === 0) return "매장 안에서의 상태를 1개 이상 선택하세요.";

  const prefix = HANDLING_SCOPE_PREFIX[group.scope] ?? "";
  const notes: string[] = [];
  if (group.scope === "UNKNOWN") notes.push("적용 범위 확인 필요");
  if (group.mode === "UNKNOWN" && names.length > 1) notes.push("항목 간 관계 확인 필요");

  const status = sharedStatus(group.rules);
  const body =
    status === null
      ? group.rules
          .map((rule, index) => handlingClause(names[index], rule.status))
          .join(" · ")
      : handlingClause(joinItemNames(names, group.mode), status);

  const suffix = notes.length > 0 ? ` (${notes.join(" · ")})` : "";
  return `${prefix}${body}${suffix}`;
}

/** 선택 상자에 쓸 라벨. 값이 목록에 없으면 원래 코드를 그대로 보여준다. */
export function preparationStatusLabel(status: string): string {
  return PREPARATION_STATUS_LABELS[status] ?? status;
}

export function handlingStatusLabel(status: string): string {
  return HANDLING_STATUS_LABELS[status] ?? status;
}

import type { PolicyDetails } from "@/lib/places/policy-details";

/**
 * 구조화된 이용 조건을 **사용자 화면에 보여줄 항목**으로 옮긴다.
 *
 * 문장을 만들지 않고 라벨 키와 상태 값만 돌려준다. 한국어 문장을 지어 번역하는 방식은
 * 두 언어 중 한쪽이 어색해지므로, 실제 문구 조합은 policy-sentences.ts가 맡는다.
 *
 * 관리자 화면의 describe.ts와 공유하지 않는다. 그쪽은 한국어 전용 미리보기이고
 * 여기는 다국어 표시용이라 요구가 다르다.
 */

type PreparationGroup = PolicyDetails["preparation"][number];
type PreparationItem = PreparationGroup["items"][number]["item"];
type PreparationStatus = PreparationGroup["items"][number]["status"];
type HandlingGroup = PolicyDetails["handling"][number];
type HandlingRule = HandlingGroup["rules"][number]["rule"];
type HandlingStatus = HandlingGroup["rules"][number]["status"];
type UncertaintyTarget = PolicyDetails["uncertainties"][number]["target"];

/** 항목 사이의 관계. `unknown`은 "모두인지 하나인지 확인되지 않음"이다. */
export type PolicyRelation = "anyOf" | "allOf" | "unknown";

export type PolicyEntryLine = {
  /** UNKNOWN은 담지 않는다 — 확인되지 않은 것을 조건처럼 보여주지 않는다. */
  policy: "REQUIRED" | "NOT_REQUIRED";
};

export type PolicyPreparationLine = {
  itemKeys: PreparationItem[];
  relation: PolicyRelation;
  status: PreparationStatus;
  /** 실내 동반 시에만 적용되는 요구인지. */
  indoorOnly: boolean;
  /** 언제 적용되는지 확인되지 않았는지. */
  scopeUnknown: boolean;
};

export type PolicyHandlingLine = {
  ruleKeys: HandlingRule[];
  relation: PolicyRelation;
  status: HandlingStatus;
};

export type PolicyUncertaintyLine = {
  targetKey: UncertaintyTarget;
};

export type PolicyDisplay = {
  entry: PolicyEntryLine | null;
  preparation: PolicyPreparationLine[];
  handling: PolicyHandlingLine[];
  uncertainties: PolicyUncertaintyLine[];
};

const RELATION_BY_MODE: Record<PreparationGroup["mode"], PolicyRelation> = {
  ANY_OF: "anyOf",
  ALL_OF: "allOf",
  UNKNOWN: "unknown",
};

/**
 * 조건 6행이 이미 값을 보여주는 준비물.
 * condition-consistency가 이 항목들로 컬럼을 계산하므로 같은 말이 두 번 나온다.
 */
const CORE_ROW_ITEMS: PreparationItem[] = [
  "LEASH",
  "MUZZLE",
  "VACCINATION_PROOF",
  "CARRIER",
  "CRATE",
  "STROLLER",
];

/**
 * 조건 6행과 뜻이 완전히 같은 그룹인지.
 *
 * 항목이 하나이고, 그 항목이 컬럼으로 옮겨지며, 컬럼이 그대로 담는 상태(필수/불필요)이고,
 * 실내 한정 같은 추가 조건이 없을 때만 중복이다. "목줄 권장"은 컬럼이 `확인 필요`가 되므로
 * 중복이 아니고, "실내에서만 목줄"도 범위 정보가 컬럼에 남지 않으므로 중복이 아니다.
 */
function duplicatesCoreRow(group: PreparationGroup): boolean {
  if (group.items.length !== 1) return false;
  if (group.scope === "INDOOR") return false;

  const only = group.items[0];
  const status = only.status;
  return (
    CORE_ROW_ITEMS.includes(only.item) &&
    (status === "REQUIRED" || status === "NOT_REQUIRED")
  );
}

/** 묶음 안의 상태가 모두 같으면 그 값을, 섞여 있으면 null을. */
function sharedStatus<T extends { status: string }>(entries: T[]): string | null {
  if (entries.length === 0) return null;
  const first = entries[0].status;
  return entries.every((entry) => entry.status === first) ? first : null;
}

function toPreparationLines(groups: PolicyDetails["preparation"]): PolicyPreparationLine[] {
  const lines: PolicyPreparationLine[] = [];

  for (const group of groups) {
    if (group.items.length === 0) continue;
    if (duplicatesCoreRow(group)) continue;

    const indoorOnly = group.scope === "INDOOR";
    const scopeUnknown = group.scope === "UNKNOWN";
    const status = sharedStatus(group.items) as PreparationStatus | null;

    if (status === null) {
      // 항목마다 요구 수준이 다르면 관계로 묶어 말할 수 없다. 한 줄씩 나눠 정확히 전한다.
      for (const item of group.items) {
        lines.push({
          itemKeys: [item.item],
          relation: "allOf",
          status: item.status,
          indoorOnly,
          scopeUnknown,
        });
      }
      continue;
    }

    lines.push({
      itemKeys: group.items.map((item) => item.item),
      relation: RELATION_BY_MODE[group.mode],
      status,
      indoorOnly,
      scopeUnknown,
    });
  }

  return lines;
}

function toHandlingLines(groups: PolicyDetails["handling"]): PolicyHandlingLine[] {
  const lines: PolicyHandlingLine[] = [];

  for (const group of groups) {
    if (group.rules.length === 0) continue;

    const status = sharedStatus(group.rules) as HandlingStatus | null;

    if (status === null) {
      for (const rule of group.rules) {
        lines.push({ ruleKeys: [rule.rule], relation: "allOf", status: rule.status });
      }
      continue;
    }

    lines.push({
      ruleKeys: group.rules.map((rule) => rule.rule),
      relation: RELATION_BY_MODE[group.mode],
      status,
    });
  }

  return lines;
}

/**
 * 보여줄 것이 하나도 없으면 null을 돌려준다 — 화면은 기존 조건 6행만 그대로 둔다.
 * `details`가 null인 장소(아직 구조화되지 않음)도 마찬가지다.
 */
export function toPolicyDisplay(details: PolicyDetails | null): PolicyDisplay | null {
  if (!details) return null;

  const completion = details.entry.vaccinationCompletionPolicy;
  const display: PolicyDisplay = {
    entry: completion === "UNKNOWN" ? null : { policy: completion },
    preparation: toPreparationLines(details.preparation),
    handling: toHandlingLines(details.handling),
    // 대상 코드만 넘긴다. 관리자가 적은 질문·판단 이유·근거 원문은 한 언어로만 쓰여 있어
    // 반대 언어 화면에 그대로 나가면 읽을 수 없다. 문구는 대상별 정형문으로 만든다.
    uncertainties: details.uncertainties.map((item) => ({ targetKey: item.target })),
  };

  const isEmpty =
    display.entry === null &&
    display.preparation.length === 0 &&
    display.handling.length === 0 &&
    display.uncertainties.length === 0;

  return isEmpty ? null : display;
}

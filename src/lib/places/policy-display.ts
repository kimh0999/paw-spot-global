import { HYGIENE_RULES, type PolicyDetails } from "@/lib/places/policy-details";

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
type SpaceException = PolicyDetails["spaceExceptions"][number];
type SpaceArea = SpaceException["area"];
type SpaceAccess = SpaceException["access"];
type SizeScope = SpaceException["appliesToSize"];
type BehaviorRestriction = PolicyDetails["behaviorRestrictions"][number];
type Admission = NonNullable<PolicyDetails["admission"]>;
type FeePeriod = Admission["rates"][number]["period"];
type HygieneRule = PolicyDetails["hygiene"][number];

/** 크기·기간의 `ALL`은 "조건 없음"이라 문장에 넣을 말이 없다. 그런 값은 null로 지운다. */
type NarrowedSize = Exclude<SizeScope, "ALL">;
type NarrowedPeriod = Exclude<FeePeriod, "ALL">;

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
  /**
   * 언제 적용되는 상태인지.
   *
   * 준비물처럼 boolean 두 개로 나누지 않고 값을 그대로 넘긴다 — 실외 한정이 있어
   * 두 개로는 모자라고, 하나를 늘리면 세 boolean이 서로 배타적이라는 사실이 타입에서
   * 사라진다.
   */
  scope: HandlingGroup["scope"];
};

export type PolicyUncertaintyLine = {
  targetKey: UncertaintyTarget;
};

export type PolicySpaceLine = {
  area: SpaceArea;
  /** `FLOOR`일 때만 값이 있다. 음수는 지하다. 비어 있으면 이 줄을 아예 만들지 않는다. */
  floor: number | null;
  /** `OTHER`일 때만 값이 있다. 관리자가 적은 구역 이름이라 번역하지 않는다. */
  label: string | null;
  /** 크기 조건이 있을 때만. 크기 무관이면 null이다. */
  sizeKey: NarrowedSize | null;
  access: SpaceAccess;
};

export type PolicyBehaviorLine = {
  triggerKey: BehaviorRestriction["trigger"];
  outcome: BehaviorRestriction["outcome"];
};

export type PolicyAdmissionRate = {
  /** 상시 요금이면 null — 언제 적용되는지 덧붙일 말이 없다. */
  periodKey: NarrowedPeriod | null;
  sizeKey: NarrowedSize | null;
  amountKrw: number;
};

export type PolicyAdmissionDisplay = {
  feePolicy: Admission["feePolicy"];
  rates: PolicyAdmissionRate[];
  /** 관리자가 적은 짧은 글. 한 언어로만 쓰여 있어도 사실이라 그대로 보여준다. */
  includedServices: string[];
};

export type PolicyHygieneLine = {
  ruleKey: HygieneRule;
};

export type PolicyDisplay = {
  entry: PolicyEntryLine | null;
  preparation: PolicyPreparationLine[];
  handling: PolicyHandlingLine[];
  spaceExceptions: PolicySpaceLine[];
  behaviorRestrictions: PolicyBehaviorLine[];
  /** 입장료를 다루지 않은 장소는 null이다. "무료"와 구분한다. */
  admission: PolicyAdmissionDisplay | null;
  hygiene: PolicyHygieneLine[];
  uncertainties: PolicyUncertaintyLine[];
};

/** 화면에 같은 말이 두 번 나오지 않게 한다. 옛 데이터에는 중복이 남아 있을 수 있다. */
function dedupe<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const value = key(item);
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

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

/**
 * 카드 위쪽 "필요 준비물" 줄이 이미 보여주는 배변봉투인지.
 *
 * `reconcileRequiredItems`가 단독 REQUIRED 배변봉투를 `requiredItems`에 넣으므로 그대로
 * 두면 같은 사실이 두 번 나온다. 실제로 그 목록에 있을 때만 뺀다 — 동기화 이전에 저장된
 * 데이터라면 이 그룹이 유일한 정보원이다. "안 챙겨도 됩니다"는 목록이 담지 못하는 사실이라
 * REQUIRED만 대상으로 한다.
 */
function duplicatesRequiredItemsRow(
  group: PreparationGroup,
  requiredItems: readonly string[],
): boolean {
  if (group.items.length !== 1 || group.scope !== "ALWAYS") return false;

  const only = group.items[0];
  return (
    only.item === "POOP_BAG" &&
    only.status === "REQUIRED" &&
    requiredItems.includes("POOP_BAG")
  );
}

function toPreparationLines(
  groups: PolicyDetails["preparation"],
  requiredItems: readonly string[],
): PolicyPreparationLine[] {
  const lines: PolicyPreparationLine[] = [];

  for (const group of groups) {
    if (group.items.length === 0) continue;
    if (duplicatesCoreRow(group)) continue;
    if (duplicatesRequiredItemsRow(group, requiredItems)) continue;

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
        lines.push({
          ruleKeys: [rule.rule],
          relation: "allOf",
          status: rule.status,
          scope: group.scope,
        });
      }
      continue;
    }

    lines.push({
      ruleKeys: group.rules.map((rule) => rule.rule),
      relation: RELATION_BY_MODE[group.mode],
      status,
      scope: group.scope,
    });
  }

  return lines;
}

/**
 * 층·구역 예외.
 *
 * 구역을 가리킬 말이 없는 줄(층 번호 없는 특정 층, 이름 없는 기타 구역)은 만들지 않는다 —
 * 층을 0으로 채우거나 "어떤 구역"이라고 얼버무리면 없는 사실이 생긴다. 저장 시 스키마가
 * 막지만 옛 데이터가 있을 수 있어 여기서도 확인한다.
 */
export function toSpaceLines(items: PolicyDetails["spaceExceptions"]): PolicySpaceLine[] {
  const lines = items.flatMap((item) => {
    if (item.area === "FLOOR" && item.floor == null) return [];
    if (item.area === "OTHER" && !item.label?.trim()) return [];

    return [
      {
        area: item.area,
        floor: item.area === "FLOOR" ? (item.floor as number) : null,
        label: item.area === "OTHER" ? (item.label as string).trim() : null,
        sizeKey: item.appliesToSize === "ALL" ? null : item.appliesToSize,
        access: item.access,
      },
    ];
  });

  return dedupe(
    lines,
    (line) => `${line.area}|${line.floor ?? ""}|${line.label ?? ""}|${line.sizeKey ?? ""}|${line.access}`,
  );
}

function toBehaviorLines(
  items: PolicyDetails["behaviorRestrictions"],
): PolicyBehaviorLine[] {
  return dedupe(
    items.map((item) => ({ triggerKey: item.trigger, outcome: item.outcome })),
    (line) => `${line.triggerKey}|${line.outcome}`,
  );
}

/**
 * 입장료.
 *
 * 요금이 있는데 유료가 아닌 조합은 저장 경로가 막지만, 그 앞에 저장된 값이나 폼을 거치지
 * 않은 값이 남아 있을 수 있다. 그때는 어느 쪽이 사실인지 알 수 없으므로 금액을 보여주지
 * 않고 "확인 필요"로 낮춘다 — 무료라고도, 그 금액이라고도 단정하지 않는다.
 * 포함 서비스는 요금과 별개의 사실이라 그대로 남긴다.
 */
function toAdmissionDisplay(admission: PolicyDetails["admission"]): PolicyAdmissionDisplay | null {
  if (!admission) return null;

  const includedServices = dedupe(
    admission.includedServices.map((service) => service.trim()).filter(Boolean),
    (service) => service,
  );

  if (admission.rates.length > 0 && admission.feePolicy !== "PAID") {
    return { feePolicy: "UNKNOWN", rates: [], includedServices };
  }

  return {
    feePolicy: admission.feePolicy,
    rates: dedupe(
      admission.rates.map((rate) => ({
        periodKey: rate.period === "ALL" ? null : rate.period,
        sizeKey: rate.dogSize === "ALL" ? null : rate.dogSize,
        amountKrw: rate.amountKrw,
      })),
      (rate) => `${rate.periodKey ?? ""}|${rate.sizeKey ?? ""}|${rate.amountKrw}`,
    ),
    includedServices,
  };
}

/** 위생·책임. 문구가 없는 코드는 화면에 키가 그대로 나가므로 알려진 것만 통과시킨다. */
function toHygieneLines(rules: PolicyDetails["hygiene"]): PolicyHygieneLine[] {
  const known = new Set<string>(HYGIENE_RULES);

  return dedupe(
    rules.filter((rule) => known.has(rule)).map((rule) => ({ ruleKey: rule })),
    (line) => line.ruleKey,
  );
}

/**
 * 보여줄 것이 하나도 없으면 null을 돌려준다 — 화면은 기존 조건 6행만 그대로 둔다.
 * `details`가 null인 장소(아직 구조화되지 않음)도 마찬가지다.
 */
export function toPolicyDisplay(
  details: PolicyDetails | null,
  /** 카드가 이미 보여주는 값. 같은 사실을 두 번 쓰지 않으려고 받는다. */
  options: { requiredItems?: readonly string[] } = {},
): PolicyDisplay | null {
  if (!details) return null;

  const completion = details.entry.vaccinationCompletionPolicy;
  const display: PolicyDisplay = {
    entry: completion === "UNKNOWN" ? null : { policy: completion },
    preparation: toPreparationLines(details.preparation, options.requiredItems ?? []),
    handling: toHandlingLines(details.handling),
    spaceExceptions: toSpaceLines(details.spaceExceptions),
    behaviorRestrictions: toBehaviorLines(details.behaviorRestrictions),
    admission: toAdmissionDisplay(details.admission),
    hygiene: toHygieneLines(details.hygiene),
    // 대상 코드만 넘긴다. 관리자가 적은 질문·판단 이유·근거 원문은 한 언어로만 쓰여 있어
    // 반대 언어 화면에 그대로 나가면 읽을 수 없다. 문구는 대상별 정형문으로 만든다.
    uncertainties: details.uncertainties.map((item) => ({ targetKey: item.target })),
  };

  const isEmpty =
    display.entry === null &&
    display.preparation.length === 0 &&
    display.handling.length === 0 &&
    display.spaceExceptions.length === 0 &&
    display.behaviorRestrictions.length === 0 &&
    display.admission === null &&
    display.hygiene.length === 0 &&
    display.uncertainties.length === 0;

  return isEmpty ? null : display;
}

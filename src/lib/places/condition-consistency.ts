import type {
  CarrierStrollerPolicy,
  LeashPolicy,
  MuzzlePolicy,
  VaccinationCertificatePolicy,
} from "@/lib/places/constants";
import type {
  PolicyDetails,
  PreparationItem,
  PreparationScope,
} from "@/lib/places/policy-details";

/**
 * policyDetails(정확한 원본)에서 PlaceCondition 컬럼(보수적 요약값)을 계산한다.
 *
 * 왜 필요한가: "목줄 **또는** 이동가방 필수"를 leash=REQUIRED로 저장하면
 * 이동가방만 챙긴 방문자에게 사실과 다른 안내가 나간다. 컬럼에는 "또는"이 없으므로
 * 택일 관계인 항목은 단언하지 않고 UNKNOWN으로 남긴다 — UNKNOWN은 "제한 없음"이
 * 아니라 "확인되지 않음"이고, 화면에서 "매장에 확인"으로 표시된다(DESIGN.md §3.3).
 *
 * 이 함수는 관리자 폼이 아니라 **모든 쓰기 경로**가 호출한다
 * (create-place.ts / update-place.ts). 폼을 우회해 들어오는 값도 같은 규칙을 거친다.
 */

export type ReconcilableColumns = {
  leash: LeashPolicy;
  muzzle: MuzzlePolicy;
  carrierStrollerPolicy: CarrierStrollerPolicy;
  vaccinationCertificatePolicy: VaccinationCertificatePolicy;
};

/** 준비물 한 항목이 원본에서 어떻게 언급됐는지. */
type ItemEvidence = {
  mentioned: boolean;
  /** 단독 그룹이거나 ALL_OF 그룹에서 REQUIRED — 무조건 챙겨야 한다. */
  requiredAlone: boolean;
  /** ANY_OF·UNKNOWN 그룹에서 다른 항목과 함께 REQUIRED — 택일이라 단언할 수 없다. */
  requiredAsAlternative: boolean;
  /** 매장이 필요 없다고 확인해 준 경우. */
  confirmedNotRequired: boolean;
  /** requiredAlone이 실내에만 적용되는지. */
  indoorOnly: boolean;
};

const EMPTY_EVIDENCE: ItemEvidence = {
  mentioned: false,
  requiredAlone: false,
  requiredAsAlternative: false,
  confirmedNotRequired: false,
  indoorOnly: false,
};

/** 이동장·유모차 컬럼 하나가 대표하는 준비물들. */
const CARRIER_COLUMN_ITEMS: PreparationItem[] = ["CARRIER", "CRATE", "STROLLER"];

function collectEvidence(details: PolicyDetails): Map<PreparationItem, ItemEvidence> {
  const evidence = new Map<PreparationItem, ItemEvidence>();

  for (const group of details.preparation) {
    // 항목이 하나뿐인 그룹은 mode와 무관하게 택일이 아니다.
    const isAlternativeGroup = group.mode !== "ALL_OF" && group.items.length > 1;

    for (const { item, status } of group.items) {
      const prev = evidence.get(item) ?? EMPTY_EVIDENCE;
      const requiredAlone =
        prev.requiredAlone || (status === "REQUIRED" && !isAlternativeGroup);

      evidence.set(item, {
        mentioned: true,
        requiredAlone,
        requiredAsAlternative:
          prev.requiredAsAlternative || (status === "REQUIRED" && isAlternativeGroup),
        confirmedNotRequired: prev.confirmedNotRequired || status === "NOT_REQUIRED",
        indoorOnly: resolveIndoorOnly(prev, requiredAlone, status, group.scope),
      });
    }
  }

  return evidence;
}

/**
 * 무조건 필요한 요구가 실내에만 걸리는지.
 * 같은 항목에 ALWAYS 요구가 하나라도 있으면 실내 한정이 아니다.
 */
function resolveIndoorOnly(
  prev: ItemEvidence,
  requiredAlone: boolean,
  status: string,
  scope: PreparationScope,
): boolean {
  if (!requiredAlone) return false;
  if (status !== "REQUIRED") return prev.indoorOnly;
  if (scope !== "INDOOR") return false;
  return prev.requiredAlone ? prev.indoorOnly : true;
}

/**
 * 항목 하나를 REQUIRED / NOT_REQUIRED / UNKNOWN 세 값으로 요약한다.
 * 언급되지 않았으면 null — 이 경우 기존 컬럼 값을 그대로 둔다.
 */
function summarize(
  evidence: ItemEvidence | undefined,
): "REQUIRED" | "NOT_REQUIRED" | "UNKNOWN" | null {
  if (!evidence?.mentioned) return null;
  if (evidence.requiredAlone) return "REQUIRED";
  // 택일 관계는 컬럼으로 표현할 수 없다. 단언하지 않는다.
  if (evidence.requiredAsAlternative) return "UNKNOWN";
  if (evidence.confirmedNotRequired) return "NOT_REQUIRED";
  // RECOMMENDED·ALLOWED는 "필요 없음"이 아니다.
  return "UNKNOWN";
}

/** 언급되지 않았으면 null — 이 경우 기존 컬럼 값을 그대로 둔다. */
function deriveCarrierColumn(
  evidence: Map<PreparationItem, ItemEvidence>,
): CarrierStrollerPolicy | null {
  const found = CARRIER_COLUMN_ITEMS.map((item) => evidence.get(item)).filter(
    (e): e is ItemEvidence => e?.mentioned === true,
  );
  if (found.length === 0) return null;

  const required = found.find((e) => e.requiredAlone);
  if (required) return required.indoorOnly ? "REQUIRED_INDOOR" : "REQUIRED_ALWAYS";

  if (found.some((e) => e.requiredAsAlternative)) return "UNKNOWN";
  if (found.every((e) => e.confirmedNotRequired)) return "NOT_REQUIRED";
  return "UNKNOWN";
}

/**
 * policyDetails가 **실제로 값을 계산해 주는** 컬럼만 돌려준다.
 *
 * 관리자 폼은 이 결과에 있는 항목만 읽기 전용으로 잠근다. 여기 없는 컬럼은
 * 상세 조건이 언급하지 않은 것이므로 관리자가 계속 직접 골라야 한다
 * (`leash=PARTIAL_AREA`처럼 준비물 그룹으로 표현할 수 없는 값이 여기 해당한다).
 * 폼이 이 함수를 그대로 쓰기 때문에 화면의 "자동 계산됨" 표시와 실제 저장값이 어긋나지 않는다.
 */
export function derivedColumns(
  details: PolicyDetails | null,
): Partial<ReconcilableColumns> {
  if (!details) return {};

  const evidence = collectEvidence(details);
  const derived: Partial<ReconcilableColumns> = {};

  const leash = summarize(evidence.get("LEASH"));
  if (leash) derived.leash = leash;

  const muzzle = summarize(evidence.get("MUZZLE"));
  if (muzzle) derived.muzzle = muzzle;

  const vaccination = summarize(evidence.get("VACCINATION_PROOF"));
  if (vaccination) derived.vaccinationCertificatePolicy = vaccination;

  const carrier = deriveCarrierColumn(evidence);
  if (carrier) derived.carrierStrollerPolicy = carrier;

  return derived;
}

/**
 * 저장할 컬럼 값을 돌려준다.
 *
 * - `details`가 null이면(아직 구조화되지 않은 장소) 컬럼을 건드리지 않는다.
 * - policyDetails가 언급하지 않은 항목의 컬럼도 건드리지 않는다.
 *   `leash=PARTIAL_AREA`처럼 준비물 그룹으로 표현할 수 없는 값이 살아남는다.
 * - 언급된 항목은 원본이 이기며, REQUIRED에서 UNKNOWN으로 내려갈 수도 있다.
 *
 * 돌려주는 키는 이 네 개뿐이다. 호출한 쪽이 결과를 저장 데이터에 펼치므로, 넘겨받은
 * 객체를 통째로 되돌려주면 조건 컬럼이 아닌 값(`clearPolicyDetails` 같은 폼 신호)까지
 * 저장 데이터에 섞인다.
 */
export function reconcileConditionColumns(
  details: PolicyDetails | null,
  current: ReconcilableColumns,
): ReconcilableColumns {
  const derived = derivedColumns(details);

  return {
    leash: derived.leash ?? current.leash,
    muzzle: derived.muzzle ?? current.muzzle,
    carrierStrollerPolicy: derived.carrierStrollerPolicy ?? current.carrierStrollerPolicy,
    vaccinationCertificatePolicy:
      derived.vaccinationCertificatePolicy ?? current.vaccinationCertificatePolicy,
  };
}

/**
 * `PlaceCondition.requiredItems`가 표현하는 준비물.
 * 지금은 배변봉투 하나뿐이며(`REQUIRED_ITEMS`), 상세 조건의 같은 항목과 사실이 겹친다.
 */
const POOP_BAG: PreparationItem = "POOP_BAG";

/**
 * 상세 조건이 배변봉투를 필수로 정하는지.
 *
 * - `true` / `false`: 준비물 그룹이 이 항목을 언급했다. 상세 조건이 기준이다.
 * - `null`: 언급하지 않았다 — 컬럼 규칙과 같이 관리자가 고른 값을 그대로 둔다.
 *
 * 판단은 컬럼과 같은 `summarize`를 쓴다. 그래서 택일(목줄 **또는** 배변봉투)이나
 * 권장·확인 필요는 REQUIRED가 되지 않는다. `requiredItems`는 "확인되지 않음"을 담을 수
 * 없고 목록에 있으면 화면에 "필요 준비물"로 단언되므로, 확신할 수 없으면 빼는 쪽이 맞다.
 * 뺀다고 "필요 없음"이 되지는 않는다 — 목록이 비면 그 줄 자체가 표시되지 않고,
 * 확인이 필요하다는 사실은 policyDetails에 그대로 남아 상세 화면에 나온다.
 */
export function derivedPoopBagRequired(details: PolicyDetails | null): boolean | null {
  if (!details) return null;

  const summary = summarize(collectEvidence(details).get(POOP_BAG));
  return summary === null ? null : summary === "REQUIRED";
}

/**
 * 저장할 `requiredItems`를 정한다.
 *
 * 배변봉투 외의 항목은 건드리지 않는다 — 상세 조건이 아무 말도 하지 않는 값이다.
 * 이 함수는 관리자 폼이 아니라 모든 쓰기 경로가 호출한다(create-place.ts / update-place.ts).
 */
export function reconcileRequiredItems(
  details: PolicyDetails | null,
  current: readonly string[],
): string[] {
  const required = derivedPoopBagRequired(details);
  if (required === null) return [...current];

  const others = current.filter((item) => item !== POOP_BAG);
  return required ? [...others, POOP_BAG] : others;
}

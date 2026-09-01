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

function reconcileCarrierColumn(
  evidence: Map<PreparationItem, ItemEvidence>,
  current: CarrierStrollerPolicy,
): CarrierStrollerPolicy {
  const found = CARRIER_COLUMN_ITEMS.map((item) => evidence.get(item)).filter(
    (e): e is ItemEvidence => e?.mentioned === true,
  );
  if (found.length === 0) return current;

  const required = found.find((e) => e.requiredAlone);
  if (required) return required.indoorOnly ? "REQUIRED_INDOOR" : "REQUIRED_ALWAYS";

  if (found.some((e) => e.requiredAsAlternative)) return "UNKNOWN";
  if (found.every((e) => e.confirmedNotRequired)) return "NOT_REQUIRED";
  return "UNKNOWN";
}

/**
 * 저장할 컬럼 값을 돌려준다.
 *
 * - `details`가 null이면(아직 구조화되지 않은 장소) 컬럼을 건드리지 않는다.
 * - policyDetails가 언급하지 않은 항목의 컬럼도 건드리지 않는다.
 *   `leash=PARTIAL_AREA`처럼 준비물 그룹으로 표현할 수 없는 값이 살아남는다.
 * - 언급된 항목은 원본이 이기며, REQUIRED에서 UNKNOWN으로 내려갈 수도 있다.
 */
export function reconcileConditionColumns(
  details: PolicyDetails | null,
  current: ReconcilableColumns,
): ReconcilableColumns {
  if (!details) return current;

  const evidence = collectEvidence(details);

  const leash = summarize(evidence.get("LEASH"));
  const muzzle = summarize(evidence.get("MUZZLE"));
  const vaccination = summarize(evidence.get("VACCINATION_PROOF"));

  return {
    leash: leash ?? current.leash,
    muzzle: muzzle ?? current.muzzle,
    carrierStrollerPolicy: reconcileCarrierColumn(
      evidence,
      current.carrierStrollerPolicy,
    ),
    vaccinationCertificatePolicy: vaccination ?? current.vaccinationCertificatePolicy,
  };
}

/**
 * 검증된 장소 조건 입력에서 저장할 컬럼 값을 뽑는다.
 * create-place / update-place가 컬럼을 직접 쓰지 않고 이 함수를 거치게 해서,
 * 어느 쓰기 경로로 들어와도 원본과 요약값이 어긋나지 않게 한다.
 */
export function reconciledColumns(
  input: ReconcilableColumns & { policyDetails?: PolicyDetails },
): ReconcilableColumns {
  return reconcileConditionColumns(input.policyDetails ?? null, {
    leash: input.leash,
    muzzle: input.muzzle,
    carrierStrollerPolicy: input.carrierStrollerPolicy,
    vaccinationCertificatePolicy: input.vaccinationCertificatePolicy,
  });
}

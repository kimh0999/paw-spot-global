import type { HandlingScope, PolicyDetails, PreparationItem } from "./policy-details";
import type { PlaceListItem } from "@/types/place";

/**
 * 이동장·유모차 조건을 요약 컬럼(`carrierStrollerPolicy`)과 세부 정책에서 함께 읽는다.
 * 카드·미리보기·상세·목록 필터가 같은 사실을 말하도록 해석은 여기 한 곳에만 둔다 —
 * `dog-access.ts`가 동반 가능 여부에 대해 하는 일과 같다.
 *
 * **두 가지를 나눠서 답한다.**
 * - `key` — **의무가 있는가.** 필터가 쓰는 값이다.
 * - `means` — **어떤 수단이 그 의무를 채우는가.** 확인된 근거가 있을 때만 이름을 댄다.
 *
 * **왜 필요한가.** 쓰기 시점에 컬럼을 맞추는 `condition-consistency.ts`는 준비물 그룹
 * (`preparation`)만 읽는다. "매장 안에서 이동장에 있어야 한다"는 `handling`의
 * `IN_CARRIER`는 컬럼을 전혀 건드리지 않으므로, 컬럼이 `NOT_REQUIRED`로 남은 채
 * `필수 아님` 필터를 통과할 수 있었다. 저장 데이터를 고쳐 쓰는 대신 읽는 자리에서
 * 함께 해석한다(결정 **D-21**, D-15와 같은 방식).
 *
 * 판단 규칙:
 * - **`IN_CARRIER`만 의무의 근거로 본다.** `HELD_BY_OWNER`(안기)·`ON_LEASH_FLOOR`(목줄)·
 *   `PET_SEAT`는 이동장 사용 의무가 아니다. 다른 행동 조건을 이동장 정책으로 환산하지 않는다.
 * - 요약 컬럼을 **끌어올리기만 한다.** 세부 정책이 더 약하게 말한다고 컬럼을 낮추지 않는다.
 * - **수단을 추정하지 않는다.** `IN_CARRIER`가 필수라는 근거는 이동장 하나만 말한다.
 *   그것으로 유모차나 안기를 대체 수단이라 말하지 않는다.
 * - 저장 데이터를 바꾸지 않는다. 해석만 한다.
 */

export type CarrierRequirementKey =
  | "notRequired"
  | "requiredIndoor"
  | "requiredAlways"
  | "unknown";

/**
 * 의무를 채우는 수단. **확인된 근거가 있을 때만** 이름을 댄다.
 *
 * `unspecified`는 "수단이 없다"가 아니라 "무엇이 되는지 확인되지 않았다"는 뜻이다.
 * 요약 컬럼은 `CARRIER`·`CRATE`·`STROLLER`를 한 값으로 뭉쳐 담으므로 컬럼만으로는
 * 셋을 구분할 수 없고, 그때는 수단을 추정하지 않는 중립 문구를 쓴다(`DESIGN.md` §9).
 */
export type CarrierMeansKey = "unspecified" | "carrier" | "crate" | "stroller";

export interface CarrierRequirementFacts {
  /** 화면이 한 줄로 단언하고 필터가 판정에 쓰는 값. */
  key: CarrierRequirementKey;
  /** 요약 컬럼이 말하는 것. 해석 전 원본이다. */
  summary: NonNullable<PlaceListItem["carrierStrollerPolicy"]>;
  /** 요약 컬럼보다 강한 의무를 `handling`에서 읽어 올렸는가. */
  raisedByHandling: boolean;
  /** 의무를 채우는 수단. 의무가 없거나 근거가 없으면 `unspecified`. */
  means: CarrierMeansKey;
}

/**
 * 보수적인 쪽이 이긴다. `unknown`이 `notRequired`보다 위인 것은
 * "확인되지 않음"을 "필요 없음"으로 내려 읽지 않기 위해서다(D-03).
 */
const REQUIREMENT_RANK: Record<CarrierRequirementKey, number> = {
  notRequired: 0,
  unknown: 1,
  requiredIndoor: 2,
  requiredAlways: 3,
};

const SUMMARY_KEY: Record<
  NonNullable<PlaceListItem["carrierStrollerPolicy"]>,
  CarrierRequirementKey
> = {
  not_required: "notRequired",
  required_indoor: "requiredIndoor",
  required_always: "requiredAlways",
  unknown: "unknown",
};

/**
 * 의무가 적용되는 범위를 컬럼 어휘로 옮긴다.
 *
 * `OUTDOOR`에 해당하는 컬럼 값이 없다 — `CarrierStrollerPolicy`는 실내와 항상만 구분한다.
 * 실외 전용 의무를 `실내에서 필요`로 옮기면 없는 사실을 만들고, `필수 아님`으로 두면
 * 있는 의무를 지운다. 그래서 **의무가 있다는 사실만 남기고 범위는 단언하지 않는다.**
 */
const SCOPE_KEY: Record<HandlingScope, CarrierRequirementKey> = {
  ALWAYS: "requiredAlways",
  INDOOR: "requiredIndoor",
  OUTDOOR: "unknown",
  UNKNOWN: "unknown",
};

/** 이동장·유모차 컬럼 하나가 대표하는 준비물. `condition-consistency.ts`와 같은 목록이다. */
const CARRIER_MEANS: Record<
  Extract<PreparationItem, "CARRIER" | "CRATE" | "STROLLER">,
  CarrierMeansKey
> = {
  CARRIER: "carrier",
  CRATE: "crate",
  STROLLER: "stroller",
};

type HandlingGroup = PolicyDetails["handling"][number];

/**
 * 이 묶음이 이동장 사용 **의무**에 대해 말하는 것.
 *
 * `status`가 먼저다. 관리자 입력에서 `CONDITIONAL`은 `상황에 따라`이고 표시 문구는
 * `…해야 하는 경우가 있습니다` / `You may need to …, depending on the situation` —
 * 즉 **조건부 의무이지 조건부 허용이 아니다.** 어떤 상황에서 걸리는지는 구조화돼 있지
 * 않아 반영할 조건이 없으므로 `필요 없음`으로 내리지 않고 미확인으로 둔다. `UNKNOWN`도
 * (`…해야 하는지 확인되지 않았습니다`) 같다. `ALLOWED`(…도 됩니다)와
 * `PROHIBITED`(…서는 안 됩니다)만 의무가 아니다.
 *
 * 그다음이 묶음의 `mode`다. 행동이 하나뿐인 묶음은 `mode`와 무관하게 택일이 아니다
 * (`condition-consistency.ts`의 준비물 그룹과 같은 기준).
 *
 * - `ALL_OF` 또는 단일 행동 — 이동장을 **반드시** 써야 한다. 범위대로 의무가 선다.
 * - `ANY_OF` — 확인된 택일이다. "안고 계시거나 이동장에"처럼 이동장을 **대신할 수단이
 *   확인된** 경우이므로 이동장 사용 의무는 서지 않는다. 선택지에 `IN_CARRIER`가
 *   등장한다는 이유만으로 필수로 올리지 않는다.
 * - `UNKNOWN` — 묶음 안 행동들의 관계를 확인하지 못했다. 이동장이 무조건 필요한지
 *   대신할 수단이 있는지 알 수 없으므로 `필요 없음`이라고도 말하지 않는다.
 */
function carrierObligation(group: HandlingGroup): CarrierRequirementKey {
  const statuses = group.rules
    .filter((entry) => entry.rule === "IN_CARRIER")
    .map((entry) => entry.status);
  if (statuses.length === 0) return "notRequired";

  // 의무 여부를 단언할 수 없는 값이 하나라도 있으면 미확인이다.
  if (statuses.some((status) => status === "CONDITIONAL" || status === "UNKNOWN")) {
    return "unknown";
  }
  if (!statuses.includes("REQUIRED")) return "notRequired";

  if (group.mode === "ALL_OF" || group.rules.length === 1) return SCOPE_KEY[group.scope];
  return group.mode === "ANY_OF" ? "notRequired" : "unknown";
}

/**
 * 준비물 그룹이 **이름을 댈 수 있는** 수단 하나를 확인해 주는가.
 *
 * 셋 중 둘 이상이 얽히거나 택일이면 컬럼 문구로 옮길 수 없으므로 이름을 대지 않는다 —
 * 그 관계는 상세의 준비물 문장(`policy-sentences.ts`)이 그대로 말한다.
 */
function meansFromPreparation(details: PolicyDetails): CarrierMeansKey {
  const named = new Set<CarrierMeansKey>();

  for (const group of details.preparation) {
    const isAlternativeGroup = group.mode !== "ALL_OF" && group.items.length > 1;
    if (isAlternativeGroup) continue;

    for (const { item, status } of group.items) {
      if (status !== "REQUIRED") continue;
      const means = CARRIER_MEANS[item as keyof typeof CARRIER_MEANS];
      if (means) named.add(means);
    }
  }

  return named.size === 1 ? [...named][0] : "unspecified";
}

export function resolveCarrierRequirement(
  carrierStrollerPolicy: PlaceListItem["carrierStrollerPolicy"],
  policyDetails: PolicyDetails | null,
): CarrierRequirementFacts {
  const summary = carrierStrollerPolicy ?? "unknown";
  const summaryKey = SUMMARY_KEY[summary];

  let key = summaryKey;
  let raisedByCarrierRule = false;

  for (const group of policyDetails?.handling ?? []) {
    const obligation = carrierObligation(group);
    if (REQUIREMENT_RANK[obligation] <= REQUIREMENT_RANK[key]) continue;
    key = obligation;
    // 이 의무의 근거는 `IN_CARRIER` 하나다. 수단은 이동장이며 유모차·안기가 아니다.
    raisedByCarrierRule =
      obligation === "requiredIndoor" || obligation === "requiredAlways";
  }

  const hasObligation = key === "requiredIndoor" || key === "requiredAlways";
  const means: CarrierMeansKey = !hasObligation
    ? "unspecified"
    : raisedByCarrierRule
      ? "carrier"
      : policyDetails
        ? meansFromPreparation(policyDetails)
        : "unspecified";

  return { key, summary, raisedByHandling: key !== summaryKey, means };
}

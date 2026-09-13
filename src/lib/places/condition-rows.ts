import {
  resolveCarrierRequirement,
  type CarrierRequirementKey,
} from "./carrier-requirement";
import { resolveDogAccess, type DogAccessKey } from "./dog-access";
import { showsVaccinationRow } from "./display";
import type { ConditionStatus, PlaceDetail } from "@/types/place";

/**
 * 상세 화면의 조건 행.
 *
 * 상단 요약과 아래 전체 표가 **같은 문구·같은 상태**를 쓰도록 한 곳에서 만든다.
 * 두 곳이 각자 조건을 해석하면 같은 장소가 한 화면 안에서 다르게 읽힌다.
 */
export interface ConditionRow {
  key: string;
  label: string;
  value: string;
  status: ConditionStatus;
}

/**
 * `places.detail.beforeYouGo` 네임스페이스의 메시지 조회 함수.
 * 이동장 문구가 수단(`means`)에 따라 갈리므로 값을 함께 받는다.
 */
type Translate = (key: string, values?: Record<string, string>) => string;

/**
 * 조건 행을 표시 순서대로 만든다.
 *
 * 앞의 셋(동반 가능 여부 · 이동장·유모차 · 최대 허용 크기)이 **입장을 가르는 핵심 조건**이라
 * 상단 요약은 이 셋만 쓴다. 목줄·입마개·증빙은 지켜야 할 조건이라 전체 표에서 이어 읽는다.
 */
export function buildConditionRows(
  condition: PlaceDetail["condition"],
  t: Translate,
): ConditionRow[] {
  if (!condition) return [];

  const unknownRow = { value: t("checkWithStore"), status: "neutral" as ConditionStatus };
  const rows: ConditionRow[] = [];

  // 실내 조건 행은 요약 컬럼만으로 판단하지 않는다. 세부 정책의 구역 기록까지
  // 함께 읽어야 `실내 불가 · 야외 미확인`과 정보 불일치를 구분할 수 있다.
  const access = resolveDogAccess(condition.indoor, condition.policyDetails);
  const accessMap: Record<DogAccessKey, { value: string; status: ConditionStatus }> = {
    allowed: { value: t("indoor.allowed"), status: "good" },
    outdoorOnly: { value: t("indoor.outdoor_only"), status: "warning" },
    partialArea: { value: t("indoor.partial_area"), status: "warning" },
    notAllowed: { value: t("indoor.not_allowed"), status: "bad" },
    indoorBlockedOutdoorUnconfirmed: {
      value: t("indoor.indoorBlockedOutdoorUnconfirmed"),
      status: "warning",
    },
    conflict: { value: t("indoor.conflict"), status: "neutral" },
    unknown: { value: t("indoor.unknown"), status: "neutral" },
  };
  rows.push({ key: "indoor", label: t("indoor.label"), ...accessMap[access.key] });

  // 이동장 행도 요약 컬럼만으로 판단하지 않는다. `handling`의 `IN_CARRIER` 의무까지
  // 함께 읽어야 목록 필터와 이 행이 같은 말을 한다(D-21).
  const carrier = resolveCarrierRequirement(
    condition.carrierStrollerPolicy,
    condition.policyDetails,
  );
  const carrierMap: Record<
    CarrierRequirementKey,
    { value: string; status: ConditionStatus }
  > = {
    notRequired: { value: t("carrier.not_required"), status: "good" },
    requiredIndoor: {
      value: t("carrier.required_indoor", { means: carrier.means }),
      status: "warning",
    },
    requiredAlways: {
      value: t("carrier.required_always", { means: carrier.means }),
      status: "bad",
    },
    unknown: { value: t("carrier.unknown"), status: "neutral" },
  };
  rows.push({ key: "carrier", label: t("carrier.label"), ...carrierMap[carrier.key] });

  /**
   * 최대 허용 크기는 **상한을 알려주는 사실**이지 그 자체로 좋고 나쁜 조건이 아니다.
   * 소형견 보호자에게 `소형견까지`는 통과이고, 대형견 보호자에게는 제한이다.
   * 반려견 기준 판정은 방문 가능 배너가 따로 하므로 여기서는 중립으로 둔다 —
   * 카드의 조건 요약도 중립이라 두 화면이 같은 색으로 읽힌다.
   */
  const dogSizeMap: Record<string, string> = {
    small: t("dogSize.small"),
    medium: t("dogSize.medium"),
    large: t("dogSize.large"),
    unknown: t("dogSize.unknown"),
  };
  rows.push({
    key: "dogSize",
    label: t("dogSize.label"),
    value: dogSizeMap[condition.maxDogSize ?? ""] ?? unknownRow.value,
    status: "neutral",
  });

  const leashMap: Record<string, { value: string; status: ConditionStatus }> = {
    required: { value: t("leash.required"), status: "warning" },
    not_required: { value: t("leash.not_required"), status: "good" },
    partial_area: { value: t("leash.partial_area"), status: "warning" },
  };
  rows.push({
    key: "leash",
    label: t("leash.label"),
    ...(leashMap[condition.leash ?? ""] ?? unknownRow),
  });

  const muzzleMap: Record<string, { value: string; status: ConditionStatus }> = {
    required: { value: t("muzzle.required"), status: "bad" },
    not_required: { value: t("muzzle.not_required"), status: "good" },
    conditional: { value: t("muzzle.conditional"), status: "warning" },
  };
  rows.push({
    key: "muzzle",
    label: t("muzzle.label"),
    ...(muzzleMap[condition.muzzle ?? ""] ?? unknownRow),
  });

  const vaccinationMap: Record<string, { value: string; status: ConditionStatus }> = {
    required: { value: t("vaccination.required"), status: "warning" },
    not_required: { value: t("vaccination.not_required"), status: "good" },
  };
  // 확인되지 않은 증빙 조건은 행 자체를 만들지 않는다.
  if (showsVaccinationRow(condition.vaccinationCertificatePolicy)) {
    rows.push({
      key: "vaccination",
      label: t("vaccination.label"),
      ...(vaccinationMap[condition.vaccinationCertificatePolicy ?? ""] ?? unknownRow),
    });
  }

  return rows;
}

/** 입장을 가르는 핵심 조건 3개. 상단 요약이 쓰는 범위다. */
export const CORE_CONDITION_COUNT = 3;

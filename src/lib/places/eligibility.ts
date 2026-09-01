import type { DogSizeFilter, PlaceListItem } from "@/types/place";

export type VisitEligibilityStatus = "allowed" | "blocked" | "unknown";

export interface VisitEligibility {
  status: VisitEligibilityStatus;
  /** places.card.eligibility 아래의 메시지 키 */
  messageKey:
    | "canVisit"
    | "tooLarge"
    | "dogsNotAllowed"
    | "sizeUnconfirmed"
    | "conditionsUnconfirmed";
}

const SIZE_RANK: Record<"small" | "medium" | "large", number> = {
  small: 1,
  medium: 2,
  large: 3,
};

// 실내 동반·이동장·허용 크기는 방문 가능 여부를 가르는 핵심 조건이다 (DESIGN.md §1).
function hasUnconfirmedCoreCondition(place: PlaceListItem): boolean {
  const core = [place.indoor, place.carrierStrollerPolicy, place.maxDogSize];
  return core.some((value) => value == null || value === "unknown");
}

/** Dog.size(DB enum)를 필터·판정에서 쓰는 값으로 옮긴다. */
export function toDogSizeFilter(size: string): DogSizeFilter {
  if (size === "SMALL") return "small";
  if (size === "MEDIUM") return "medium";
  if (size === "LARGE") return "large";
  return "all";
}

/**
 * 등록된 반려견 크기와 장소 조건을 대조해 방문 가능 여부를 단언한다.
 * 반려견 프로필이 없으면 판정하지 않고 null을 돌려준다. 조건은 그대로 노출된다.
 *
 * **확인되지 않은 조건은 통과로 치지 않는다.** 크기가 맞아도 실내 동반이 미확인이면
 * "방문 가능"이라고 말하지 않는다(DESIGN.md §3.3). 핵심 조건 판별을 getVisitStatus와
 * 공유하므로 카드 배너와 미리보기 배지가 서로 다른 말을 하지 않는다.
 */
export function getVisitEligibility(
  place: PlaceListItem,
  dogSize: DogSizeFilter,
): VisitEligibility | null {
  if (dogSize === "all") return null;

  if (place.indoor === "not_allowed") {
    return { status: "blocked", messageKey: "dogsNotAllowed" };
  }

  const limit = place.maxDogSize;
  if (limit !== "small" && limit !== "medium" && limit !== "large") {
    // 상한이 확인되지 않았다. 크기가 맞는지 판단할 근거가 없다.
    return { status: "unknown", messageKey: "sizeUnconfirmed" };
  }

  if (SIZE_RANK[limit] < SIZE_RANK[dogSize]) {
    return { status: "blocked", messageKey: "tooLarge" };
  }

  // 크기는 맞는다. 남은 핵심 조건이 확인되지 않았다면 아직 방문 가능이 아니다.
  if (hasUnconfirmedCoreCondition(place)) {
    return { status: "unknown", messageKey: "conditionsUnconfirmed" };
  }

  return { status: "allowed", messageKey: "canVisit" };
}

/**
 * 미리보기 패널 상단에 단언하는 방문 가능 상태.
 * 데이터 모델에 `not_allowed`가 있으므로 "조건부"로 뭉뚱그리지 않고 별도 상태로 구분한다.
 */
export type VisitStatus = "available" | "conditional" | "confirm" | "notAllowed";

/** places.preview.allowances 아래의 메시지 키 */
export type AllowanceKey =
  | "indoorAllowed"
  | "noCarrier"
  | "largeDogs"
  | "noLeash"
  | "noMuzzle";

/** places.preview.conditions 아래의 메시지 키 */
export type VisitConditionKey =
  | "indoorOutdoorOnly"
  | "indoorPartialArea"
  | "indoorNotAllowed"
  | "carrierIndoor"
  | "carrierAlways"
  | "sizeSmallOnly"
  | "sizeMediumOnly"
  | "leashRequired"
  | "leashPartialArea"
  | "muzzleRequired"
  | "muzzleConditional";

export interface PlaceConditionBreakdown {
  /** 확실히 허용된 조건만 담는다. */
  allowances: AllowanceKey[];
  /** 지켜야 하거나 주의해야 하는 조건만 담는다. */
  conditions: VisitConditionKey[];
}

/**
 * 장소 조건을 "확실히 가능한 것"과 "지켜야 하는 것"으로 나눈다.
 * `unknown`과 `null`은 어느 쪽에도 넣지 않는다. 확인되지 않은 조건을 가능한 조건처럼 보이게 하지 않는다.
 * 한 필드는 한쪽에만 들어가므로 두 목록에 같은 조건이 중복되지 않는다.
 */
export function getPlaceConditionBreakdown(place: PlaceListItem): PlaceConditionBreakdown {
  const allowances: AllowanceKey[] = [];
  const conditions: VisitConditionKey[] = [];

  if (place.indoor === "allowed") allowances.push("indoorAllowed");
  else if (place.indoor === "outdoor_only") conditions.push("indoorOutdoorOnly");
  else if (place.indoor === "partial_area") conditions.push("indoorPartialArea");
  else if (place.indoor === "not_allowed") conditions.push("indoorNotAllowed");

  if (place.carrierStrollerPolicy === "not_required") allowances.push("noCarrier");
  else if (place.carrierStrollerPolicy === "required_indoor") conditions.push("carrierIndoor");
  else if (place.carrierStrollerPolicy === "required_always") conditions.push("carrierAlways");

  if (place.maxDogSize === "large") allowances.push("largeDogs");
  else if (place.maxDogSize === "medium") conditions.push("sizeMediumOnly");
  else if (place.maxDogSize === "small") conditions.push("sizeSmallOnly");

  if (place.leash === "not_required") allowances.push("noLeash");
  else if (place.leash === "required") conditions.push("leashRequired");
  else if (place.leash === "partial_area") conditions.push("leashPartialArea");

  if (place.muzzle === "not_required") allowances.push("noMuzzle");
  else if (place.muzzle === "required") conditions.push("muzzleRequired");
  else if (place.muzzle === "conditional") conditions.push("muzzleConditional");

  return { allowances, conditions };
}


/**
 * 상태 카드에 표시할 방문 가능 상태를 실제 구조화된 데이터로 판정한다.
 * 아래 조건 목록과 모순되지 않도록 동반 불가와 미확인을 "조건부"보다 먼저 판정한다.
 */
export function getVisitStatus(place: PlaceListItem, dogSize: DogSizeFilter): VisitStatus {
  if (getVisitEligibility(place, dogSize)?.status === "blocked") return "notAllowed";
  if (place.indoor === "not_allowed") return "notAllowed";
  if (hasUnconfirmedCoreCondition(place)) return "confirm";
  if (getPlaceConditionBreakdown(place).conditions.length > 0) return "conditional";
  return "available";
}

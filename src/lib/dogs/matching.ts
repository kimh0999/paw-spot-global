import type { DogSize } from "@/lib/constants";

/**
 * 반려견 한 마리와 장소 조건을 대조한 결과.
 * 확인되지 않은 조건을 허용으로 추정하지 않는다 (DESIGN.md §3.3).
 */
export type DogMatchStatus = "MATCH" | "MISMATCH" | "CHECK_REQUIRED";

/**
 * 판정 사유. 상태만으로는 "왜"를 알 수 없어 화면 문구를 고를 수 없다.
 * 특히 동반 불가를 크기 제한 문구로 안내하면 사실과 다른 말이 된다.
 */
export type DogMatchReason =
  | "SIZE_LIMIT"
  | "PET_NOT_ALLOWED"
  | "BREED_RESTRICTION"
  | "UNKNOWN_CONDITION";

export interface DogMatchResult {
  status: DogMatchStatus;
  /** MATCH일 때만 null이다. */
  reason: DogMatchReason | null;
}

export type MatchableDog = {
  id: string;
  name: string;
  size: DogSize;
};

/**
 * 판정에 필요한 장소 조건만 추린 입력.
 * `maxDogSize`가 null이면 PlaceCondition 자체가 없다는 뜻이다.
 *
 * `indoor`는 실내 가능 여부가 아니라 동반 가능 여부까지 담는다.
 * 실내만 불가한 경우는 `outdoor_only`·`partial_area`로 따로 있고,
 * `not_allowed`는 반려견 동반 자체가 불가능하다는 뜻이다 (기획서 v3 §6-5).
 */
export type MatchablePlace = {
  indoor:
    | "allowed"
    | "outdoor_only"
    | "partial_area"
    | "not_allowed"
    | "unknown"
    | null;
  maxDogSize: "small" | "medium" | "large" | "unknown" | null;
  breedRestrictions: string | null;
};

/**
 * 스키마는 허용 크기를 목록이 아니라 상한값 하나(`PlaceCondition.maxDogSize`)로 갖는다.
 * 판정 규칙은 허용 크기 목록 기준이므로 상한값을 목록으로 펼쳐서 쓴다.
 * `unknown`과 조건 없음은 빈 목록이다 — "제한 없음"이 아니라 "확인되지 않음"이다.
 */
export function getAllowedSizes(
  maxDogSize: MatchablePlace["maxDogSize"],
): DogSize[] {
  switch (maxDogSize) {
    case "small":
      return ["SMALL"];
    case "medium":
      return ["SMALL", "MEDIUM"];
    case "large":
      return ["SMALL", "MEDIUM", "LARGE"];
    default:
      return [];
  }
}

function hasBreedRestrictions(place: MatchablePlace): boolean {
  return (place.breedRestrictions ?? "").trim() !== "";
}

/** 반려견 동반 자체가 불가능한 장소인지. 크기를 보기 전에 먼저 걸러야 한다. */
function isPetNotAllowed(place: MatchablePlace): boolean {
  return place.indoor === "not_allowed";
}

/**
 * 반려견 한 마리 판정.
 *
 * 사유 우선순위를 그대로 분기 순서로 쓴다:
 * PET_NOT_ALLOWED > SIZE_LIMIT > BREED_RESTRICTION > UNKNOWN_CONDITION > MATCH
 *
 * 견종 제한은 지금 자유 텍스트라서 breedCode와 기계적으로 대조할 수 없다.
 * 제한 문구가 있으면 크기가 허용되더라도 CHECK_REQUIRED로 남긴다.
 */
export function matchDogToPlace(
  dog: Pick<MatchableDog, "size">,
  place: MatchablePlace,
): DogMatchResult {
  if (isPetNotAllowed(place)) {
    return { status: "MISMATCH", reason: "PET_NOT_ALLOWED" };
  }

  const allowedSizes = getAllowedSizes(place.maxDogSize);
  const isSizeConfirmed = allowedSizes.length > 0;

  if (isSizeConfirmed && !allowedSizes.includes(dog.size)) {
    return { status: "MISMATCH", reason: "SIZE_LIMIT" };
  }
  if (hasBreedRestrictions(place)) {
    return { status: "CHECK_REQUIRED", reason: "BREED_RESTRICTION" };
  }
  if (!isSizeConfirmed) {
    return { status: "CHECK_REQUIRED", reason: "UNKNOWN_CONDITION" };
  }

  return { status: "MATCH", reason: null };
}

const STATUS_PRIORITY: Record<DogMatchStatus, number> = {
  MISMATCH: 2,
  CHECK_REQUIRED: 1,
  MATCH: 0,
};

const REASON_PRIORITY: Record<DogMatchReason, number> = {
  PET_NOT_ALLOWED: 4,
  SIZE_LIMIT: 3,
  BREED_RESTRICTION: 2,
  UNKNOWN_CONDITION: 1,
};

function reasonRank(reason: DogMatchReason | null): number {
  return reason ? REASON_PRIORITY[reason] : 0;
}

/**
 * 가장 나쁜 판정이 전체 판정이다.
 * 상태는 MISMATCH > CHECK_REQUIRED > MATCH, 같은 상태 안에서는 사유 우선순위로 고른다.
 * 동반 불가는 장소 속성이라 모든 반려견에 똑같이 붙고 자연히 최우선이 된다.
 */
export function resolveWorstMatch(
  results: readonly DogMatchResult[],
): DogMatchResult | null {
  if (results.length === 0) return null;

  return results.reduce((worst, result) => {
    if (STATUS_PRIORITY[result.status] !== STATUS_PRIORITY[worst.status]) {
      return STATUS_PRIORITY[result.status] > STATUS_PRIORITY[worst.status]
        ? result
        : worst;
    }
    return reasonRank(result.reason) > reasonRank(worst.reason) ? result : worst;
  });
}

/**
 * 여러 마리를 함께 데려가는 경우(`match=all`)의 판정.
 * 대조할 반려견이 없으면 판정하지 않고 null을 돌려준다.
 */
export function matchDogsToPlace(
  dogs: readonly Pick<MatchableDog, "size">[],
  place: MatchablePlace,
): DogMatchResult | null {
  return resolveWorstMatch(dogs.map((dog) => matchDogToPlace(dog, place)));
}

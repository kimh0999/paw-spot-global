import type { PolicyDetails } from "./policy-details";
import type { PlaceListItem } from "@/types/place";

/**
 * 동반 가능 여부를 요약 컬럼(`indoor`)과 세부 정책(`policyDetails.spaceExceptions`)에서
 * 함께 읽는다. 카드·미리보기·상세가 같은 사실을 말하도록 해석은 여기 한 곳에만 둔다.
 *
 * 여기서 정하는 것은 **사실**이다. 줄바꿈·라벨 배치·몇 줄까지 보여줄지는 각 화면이 정한다.
 *
 * 판단 규칙:
 * - `access`가 `UNKNOWN`인 기록은 허용의 근거로도 불가의 근거로도 쓰지 않는다.
 * - `handling.scope`는 출입 허용·불가를 추론하는 근거로 쓰지 않는다. 출입은 `spaceExceptions`에만 있다.
 * - 구역과 적용 대상을 보존한다. 테라스를 전체 야외로, 특정 크기를 전체 반려견으로 넓히지 않는다.
 * - 실내와 야외 양쪽에 불가 기록이 있어도 장소 전체 `NOT_ALLOWED`로 바꾸지 않는다.
 *   `NOT_ALLOWED`는 요약 컬럼이 그렇게 확인됐을 때만 쓰는 값이다.
 */

export type SpaceRecord = PolicyDetails["spaceExceptions"][number];

/** 야외로 볼 구역. `FLOOR`·`OTHER`는 실내인지 야외인지 알 수 없으므로 포함하지 않는다. */
const OUTDOOR_AREAS = ["OUTDOOR", "TERRACE"] as const;

export type DogAccessKey =
  | "allowed"
  | "outdoorOnly"
  | "partialArea"
  | "notAllowed"
  | "unknown"
  /** 전체 반려견 실내 불가가 확인됐고 야외·테라스에 확인된 출입 정보가 없다. */
  | "indoorBlockedOutdoorUnconfirmed"
  /** 요약 컬럼과 세부 정책이 명백히 어긋난다. 어느 쪽도 사실로 확정하지 않는다. */
  | "conflict";

export interface DogAccessFacts {
  /** 화면이 한 줄로 단언할 때 쓰는 값. */
  key: DogAccessKey;
  /** 요약 컬럼이 말하는 것. 해석 전 원본이다. */
  summary: NonNullable<PlaceListItem["indoor"]>;
  /** 표시할 구역 기록. `access: UNKNOWN`은 제외한다. 구역·적용 대상을 그대로 보존한다. */
  areaRecords: SpaceRecord[];
  /** 요약과 명백히 어긋나는 기록. 정상적인 크기·세부 구역 예외는 담지 않는다. */
  conflictingRecords: SpaceRecord[];
}

function isOutdoor(record: SpaceRecord): boolean {
  return (OUTDOOR_AREAS as readonly string[]).includes(record.area);
}

/** 전체 반려견(`ALL`)에 적용되는 기록만 요약 컬럼과 충돌할 수 있다. */
function appliesToAll(record: SpaceRecord): boolean {
  return record.appliesToSize === "ALL";
}

export function resolveDogAccess(
  indoor: PlaceListItem["indoor"],
  policyDetails: PolicyDetails | null,
): DogAccessFacts {
  const summary = indoor ?? "unknown";

  // UNKNOWN 기록은 아무것도 말하지 않는다. 표시에서도 근거에서도 뺀다.
  const areaRecords = (policyDetails?.spaceExceptions ?? []).filter(
    (record) => record.access !== "UNKNOWN",
  );

  const indoorBlockedForAll = areaRecords.some(
    (r) => r.area === "INDOOR" && appliesToAll(r) && r.access === "NOT_ALLOWED",
  );
  const hasConfirmedOutdoor = areaRecords.some(isOutdoor);

  /**
   * 충돌은 "같은 범위를 두고 서로 반대로 말할 때"만이다.
   * 일반 정책 + 특정 크기 예외(대형견만 실내 불가)나 세부 구역 예외(2층만 불가)는
   * 정상적인 표현이므로 충돌로 보지 않는다.
   */
  const conflictingRecords = areaRecords.filter((r) => {
    if (!appliesToAll(r)) return false;

    switch (summary) {
      case "allowed":
        return r.area === "INDOOR" && r.access === "NOT_ALLOWED";
      case "not_allowed":
        // 장소 전체 불가인데 전체 반려견이 들어갈 수 있는 구역이 있다.
        return r.access === "ALLOWED";
      case "outdoor_only":
        return (
          (isOutdoor(r) && r.access === "NOT_ALLOWED") ||
          (r.area === "INDOOR" && r.access === "ALLOWED")
        );
      // `partial_area`는 구역별로 갈린다는 뜻이고 `unknown`은 아무 주장도 하지 않는다.
      // 둘 다 구역 기록과 어긋날 수 없다.
      default:
        return false;
    }
  });

  const key = ((): DogAccessKey => {
    if (conflictingRecords.length > 0) return "conflict";
    if (summary === "unknown" && indoorBlockedForAll && !hasConfirmedOutdoor) {
      return "indoorBlockedOutdoorUnconfirmed";
    }
    switch (summary) {
      case "allowed":
        return "allowed";
      case "outdoor_only":
        return "outdoorOnly";
      case "partial_area":
        return "partialArea";
      case "not_allowed":
        return "notAllowed";
      default:
        return "unknown";
    }
  })();

  return { key, summary, areaRecords, conflictingRecords };
}

/**
 * 이 장소의 동반 가능 여부를 단언할 수 있는지.
 * 충돌이 있으면 어느 쪽도 사실로 확정하지 않는다(방문 가능도 불가도 말하지 않는다).
 */
export function hasDogAccessConflict(facts: DogAccessFacts): boolean {
  return facts.key === "conflict";
}

/**
 * 요약 한 줄과 함께 보여줄 구역 기록.
 * 요약 문구가 이미 말한 사실은 빼서 같은 내용을 두 번 읽게 하지 않는다.
 * 빼는 것은 **문장이 겹치는 기록뿐**이고, 구역·적용 대상이 다른 기록은 그대로 남긴다.
 */
export function displayableAreaRecords(facts: DogAccessFacts): SpaceRecord[] {
  if (facts.key !== "indoorBlockedOutdoorUnconfirmed") return facts.areaRecords;

  // 복합 상태 문구가 `실내 동반 불가`를 이미 담고 있다.
  return facts.areaRecords.filter(
    (r) => !(r.area === "INDOOR" && appliesToAll(r) && r.access === "NOT_ALLOWED"),
  );
}

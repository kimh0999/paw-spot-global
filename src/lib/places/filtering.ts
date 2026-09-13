import { resolveCarrierRequirement } from "./carrier-requirement";
import { needsRecheck } from "./display";
import { resolveDogAccess } from "./dog-access";
import type {
  CategoryFilterValue,
  IndoorFilter,
  PlaceFilters,
  PlaceListItem,
  SortOption,
} from "@/types/place";

/**
 * 실내 필터 값 → 이 필터가 인정하는 단 하나의 확정값.
 *
 * 긍정 조건 필터는 **확인된 일치 값만** 통과시킨다(D-03). `unknown`과 값 없음은 조건을
 * 충족한 것처럼 보이면 안 되므로 자연히 빠진다 — 이동장 필터와 같은 규칙이다.
 */
const INDOOR_FILTER_MATCH: Record<
  Exclude<IndoorFilter, "all">,
  PlaceListItem["indoor"]
> = {
  indoor: "allowed",
  outdoor: "outdoor_only",
  "partial-area": "partial_area",
};

type FilterPlacesOptions = {
  places: PlaceListItem[];
  selectedCategory: CategoryFilterValue;
  searchQuery: string;
  filters: PlaceFilters;
  referenceDate: Date;
};

type GetFilteredAndSortedPlacesOptions = FilterPlacesOptions & {
  sortOption: SortOption;
};

export function filterPlaces({
  places,
  selectedCategory,
  searchQuery,
  filters,
  referenceDate,
}: FilterPlacesOptions): PlaceListItem[] {
  return places.filter((place) => {
    if (selectedCategory !== "all" && place.category !== selectedCategory) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameKrMatch = place.nameKr.toLowerCase().includes(q);
      const nameEnMatch = place.nameEn?.toLowerCase().includes(q) ?? false;
      const addressMatch = place.address.toLowerCase().includes(q);
      if (!nameKrMatch && !nameEnMatch && !addressMatch) return false;
    }

    if (filters.indoor !== "all") {
      /**
       * **D-15** — `실내 가능`으로 거를 때는 요약 컬럼과 구역 기록이 어긋나는 장소를 뺀다.
       *
       * 서비스는 이런 장소를 이미 표시·판정에서 `동반 조건 정보 불일치`로 다루는데
       * (`condition-rows.ts`·`eligibility.ts`) 필터만 요약 컬럼을 확인된 값으로 읽어
       * 앞뒤가 맞지 않았다. 어긋난 기록은 D-03이 말하는 "확인된 일치 값"이 아니다.
       *
       * 적용 범위는 **`실내 가능` 필터 하나뿐**이다. 다른 필터로 번지지 않고, 저장된
       * 데이터를 `UNKNOWN`으로 바꾸지도 않는다 — 필터 통과 여부만 정한다. 필터를 걸지
       * 않으면 불일치 장소도 목록에 남아 기존 불일치 안내와 함께 보인다.
       *
       * 충돌 판정은 화면들이 쓰는 `resolveDogAccess`를 그대로 쓴다. 여기서 따로
       * 해석하면 목록과 카드가 다른 근거로 같은 장소를 말하게 된다.
       */
      if (
        filters.indoor === "indoor" &&
        resolveDogAccess(place.indoor, place.policyDetails).key === "conflict"
      ) {
        return false;
      }

      if (place.indoor !== INDOOR_FILTER_MATCH[filters.indoor]) return false;
    }

    /**
     * `필수 아님`은 **이동장·유모차의 사용 의무만** 부정한다. 반입이 허용된다거나
     * 안기·목줄 같은 다른 조건이 없다는 뜻이 아니다 — 그 사실은 요약 컬럼이 담지 않는다.
     *
     * 판정은 `resolveCarrierRequirement`에 맡긴다. 요약 컬럼만 보면 `handling`이 말하는
     * 이동장 의무를 놓쳐, 같은 장소를 두고 상세는 `실내에서 이동장 필요`라고 하는데
     * 목록만 `필수 아님`으로 통과시킨다(결정 D-21). 필터에 따로 예외를 두지 않고
     * 화면들이 쓰는 해석을 그대로 쓴다 — 실내 필터가 `resolveDogAccess`를 쓰는 것과 같다.
     *
     * `UNKNOWN`과 값 없음은 제외한다(D-03). 확인되지 않은 조건을 충족한 것처럼 보이게 하지 않는다.
     */
    if (
      filters.carrier === "not-required" &&
      resolveCarrierRequirement(place.carrierStrollerPolicy, place.policyDetails).key !==
        "notRequired"
    ) {
      return false;
    }

    // 크기 필터만 예외로 미확인을 남긴다. 크기 미확인은 `EligibilityBanner`가
    // `Size limit unconfirmed`로 따로 단언하므로, 목록에서 지우면 정보를 감추는 셈이 된다(D-03).
    if (filters.dogSize === "medium" && place.maxDogSize === "small") {
      return false;
    }
    if (
      filters.dogSize === "large" &&
      (place.maxDogSize === "small" || place.maxDogSize === "medium")
    ) {
      return false;
    }

    /**
     * `최근 90일 안에 확인된 곳만` — 판정을 재확인 배지와 **같은 함수**에 맡긴다.
     *
     * 직접 경계를 계산하면 `referenceDate`의 시각 성분 때문에 배지와 어긋났다.
     * `needsRecheck`는 `확인한 날의 자정`부터 지난 일수를 내림해 `>= 90`이면 참이므로
     * **89일 포함 · 정확히 90일 제외 · 91일 제외**이고, 확인 이력이 없으면(`null`)
     * 참이라 함께 제외된다. 즉 `재확인 필요` 배지가 붙은 장소는 언제나 빠진다(D-02).
     */
    if (filters.recent === "90days" && needsRecheck(place.latestVerifiedAt, referenceDate)) {
      return false;
    }

    return true;
  });
}

export function sortPlaces(
  places: PlaceListItem[],
  sortOption: SortOption,
): PlaceListItem[] {
  return [...places].sort((a, b) => {
    switch (sortOption) {
      case "distance": {
        const aDist = a.distanceMeters;
        const bDist = b.distanceMeters;
        if (aDist != null && bDist != null) return aDist - bDist;
        if (aDist != null) return -1;
        if (bDist != null) return 1;
        return 0;
      }
      case "recent":
        return (b.latestVerifiedAt ?? "").localeCompare(a.latestVerifiedAt ?? "");
      case "indoor-first": {
        const aScore = a.indoor === "allowed" ? 0 : 1;
        const bScore = b.indoor === "allowed" ? 0 : 1;
        return aScore - bScore;
      }
      case "no-carrier-first": {
        // 순서도 필터와 같은 해석을 쓴다. 요약 컬럼만 보면 `이동장 불필요 우선`이
        // 세부 정책상 이동장이 필요한 장소를 앞에 세운다(D-21).
        const score = (place: PlaceListItem) =>
          resolveCarrierRequirement(place.carrierStrollerPolicy, place.policyDetails).key ===
          "notRequired"
            ? 0
            : 1;
        return score(a) - score(b);
      }
      default:
        return 0;
    }
  });
}

export function getFilteredAndSortedPlaces(
  options: GetFilteredAndSortedPlacesOptions,
): PlaceListItem[] {
  return sortPlaces(filterPlaces(options), options.sortOption);
}

export function getActiveFilterCount(filters: PlaceFilters): number {
  return (
    (filters.indoor !== "all" ? 1 : 0) +
    (filters.carrier !== "all" ? 1 : 0) +
    (filters.dogSize !== "all" ? 1 : 0) +
    (filters.recent !== "all" ? 1 : 0)
  );
}

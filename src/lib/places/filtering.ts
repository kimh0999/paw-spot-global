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

export function parseVerifiedAt(verifiedAt: string): Date {
  const [year, month, day] = verifiedAt.split(".").map(Number);
  return new Date(year, month - 1, day);
}

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

    if (
      filters.indoor !== "all" &&
      place.indoor !== INDOOR_FILTER_MATCH[filters.indoor]
    ) {
      return false;
    }

    // UNKNOWN and null are excluded from both non-"all" carrier filters.
    if (filters.carrier === "not-required") {
      if (place.carrierStrollerPolicy !== "not_required") return false;
    }
    if (filters.carrier === "can-bring") {
      if (
        place.carrierStrollerPolicy !== "not_required" &&
        place.carrierStrollerPolicy !== "required_indoor" &&
        place.carrierStrollerPolicy !== "required_always"
      ) {
        return false;
      }
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

    if (filters.recent !== "all") {
      const days = filters.recent === "30days" ? 30 : 90;
      const cutoff = new Date(referenceDate);
      cutoff.setDate(cutoff.getDate() - days);
      if (!place.latestVerifiedAt || parseVerifiedAt(place.latestVerifiedAt) < cutoff) {
        return false;
      }
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
        const aScore = a.carrierStrollerPolicy === "not_required" ? 0 : 1;
        const bScore = b.carrierStrollerPolicy === "not_required" ? 0 : 1;
        return aScore - bScore;
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

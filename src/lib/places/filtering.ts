import type {
  CategoryFilterValue,
  PlaceFilters,
  PlaceListItem,
  SortOption,
} from "@/types/place";

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

    if (filters.indoor === "indoor") {
      if (
        place.indoor !== "allowed" &&
        place.indoor !== "unknown" &&
        place.indoor !== null
      ) {
        return false;
      }
    }
    if (filters.indoor === "outdoor") {
      if (
        place.indoor !== "outdoor_only" &&
        place.indoor !== "unknown" &&
        place.indoor !== null
      ) {
        return false;
      }
    }
    if (filters.indoor === "partial-area") {
      if (
        place.indoor !== "partial_area" &&
        place.indoor !== "unknown" &&
        place.indoor !== null
      ) {
        return false;
      }
    }
    if (filters.indoor === "exclude-unknown") {
      if (place.indoor === "unknown" || place.indoor === null) return false;
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

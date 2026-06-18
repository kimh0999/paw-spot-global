"use client";

import { useCallback, useMemo, useState } from "react";

import {
  getActiveFilterCount,
  getFilteredAndSortedPlaces,
} from "@/lib/places/filtering";
import type {
  CategoryFilterValue,
  PlaceFilters,
  PlaceListItem,
  SortOption,
} from "@/types/place";

const DEFAULT_FILTERS: PlaceFilters = {
  indoor: "all",
  carrier: "all",
  dogSize: "all",
  recent: "all",
};

type UsePlaceListStateOptions = {
  initialPlaces: PlaceListItem[];
  initialSortOption: SortOption;
  initialCategory?: CategoryFilterValue;
  initialSearchQuery?: string;
  referenceDate: Date;
};

export function usePlaceListState({
  initialPlaces,
  initialSortOption,
  initialCategory = "all",
  initialSearchQuery = "",
  referenceDate,
}: UsePlaceListStateOptions) {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilterValue>(initialCategory);
  const [filters, setFilters] = useState<PlaceFilters>(DEFAULT_FILTERS);
  const [sortOption, setSortOption] = useState<SortOption>(initialSortOption);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  const filteredAndSorted = useMemo(
    () =>
      getFilteredAndSortedPlaces({
        places: initialPlaces,
        selectedCategory,
        searchQuery,
        filters,
        sortOption,
        referenceDate,
      }),
    [
      initialPlaces,
      selectedCategory,
      searchQuery,
      filters,
      sortOption,
      referenceDate,
    ],
  );

  const selectedPlace = useMemo(
    () => initialPlaces.find((place) => place.id === selectedPlaceId),
    [initialPlaces, selectedPlaceId],
  );

  const activeFilterCount = useMemo(
    () => getActiveFilterCount(filters),
    [filters],
  );

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const handlePlaceSelect = useCallback((placeId: string) => {
    setSelectedPlaceId((prev) => (prev === placeId ? null : placeId));
  }, []);

  return {
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    sortOption,
    setSortOption,
    selectedPlaceId,
    setSelectedPlaceId,
    filteredAndSorted,
    selectedPlace,
    activeFilterCount,
    resetFilters,
    handlePlaceSelect,
  };
}

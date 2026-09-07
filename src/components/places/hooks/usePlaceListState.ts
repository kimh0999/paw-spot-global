"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  getActiveFilterCount,
  getFilteredAndSortedPlaces,
} from "@/lib/places/filtering";
import {
  DEFAULT_PLACE_LIST_PARAMS,
  parsePlaceListParams,
  serializePlaceListParams,
  type PlaceListParams,
} from "@/lib/places/place-list-params";
import type {
  CategoryFilterValue,
  PlaceFilters,
  PlaceListItem,
  SortOption,
} from "@/types/place";

/** 타이핑이 멎은 뒤 주소를 갱신하기까지 기다리는 시간. 목록은 기다리지 않고 즉시 걸러진다. */
const SEARCH_URL_DEBOUNCE_MS = 300;

type UsePlaceListStateOptions = {
  initialPlaces: PlaceListItem[];
  referenceDate: Date;
};

/**
 * 주소만 바꾸고 서버를 다시 부르지 않는다.
 *
 * 카테고리·검색어·필터·정렬은 전부 클라이언트에서 적용된다(`filtering.ts`). `router.push`를
 * 쓰면 값이 바뀔 때마다 서버 컴포넌트가 다시 돌아 같은 장소를 다시 조회하게 된다. Next 14는
 * native history 호출을 라우터와 동기화하므로 `useSearchParams`는 그대로 따라온다.
 *
 * 쓰는 순간의 `window.location.search`에서 출발해 이 화면이 모르는 파라미터
 * (`lat`/`lng`·반려견 선택)를 잃지 않는다. 여러 갱신이 겹쳐도 서로를 덮어쓰지 않는다.
 */
function writePlaceListParams(
  patch: Partial<PlaceListParams>,
  mode: "push" | "replace",
): void {
  const query = serializePlaceListParams(
    new URLSearchParams(window.location.search),
    patch,
  );
  const url = query
    ? `${window.location.pathname}?${query}`
    : window.location.pathname;

  if (mode === "push") window.history.pushState(null, "", url);
  else window.history.replaceState(null, "", url);
}

export function usePlaceListState({
  initialPlaces,
  referenceDate,
}: UsePlaceListStateOptions) {
  const searchParams = useSearchParams();

  // 주소가 목록 조건의 단일 출처다. 같은 값을 state로 복사하지 않으므로
  // 뒤로가기·앞으로가기가 그대로 화면에 반영되고, 되돌릴 state가 없어 서로 밀어내지 않는다.
  const urlParams = useMemo(
    () => parsePlaceListParams(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const { category: selectedCategory, filters, sortOption } = urlParams;

  // 검색어만 예외다. 입력과 동시에 목록이 걸러져야 하므로(검색 버튼이 없다) 입력값은
  // 로컬에 두고 주소만 뒤늦게 따라붙는다. 주소에는 앞뒤 공백을 뗀 값이 들어간다.
  const [searchQuery, setSearchQuery] = useState(urlParams.searchQuery);
  const syncedQuery = useRef(urlParams.searchQuery);
  const trimmedQuery = searchQuery.trim();

  // 뒤로가기나 링크 이동으로 주소가 바깥에서 바뀐 경우에만 입력창을 맞춘다.
  useEffect(() => {
    if (urlParams.searchQuery === syncedQuery.current) return;
    syncedQuery.current = urlParams.searchQuery;
    setSearchQuery(urlParams.searchQuery);
  }, [urlParams.searchQuery]);

  // 타이핑 도중에는 주소를 밀지 않는다. 글자마다 히스토리가 쌓이면 뒤로가기가 쓸모없어진다.
  useEffect(() => {
    if (trimmedQuery === syncedQuery.current) return;
    const timer = setTimeout(() => {
      syncedQuery.current = trimmedQuery;
      writePlaceListParams({ searchQuery: trimmedQuery }, "replace");
    }, SEARCH_URL_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [trimmedQuery]);

  // 카테고리·정렬·필터는 사용자가 되돌아오고 싶어 할 선택이라 히스토리에 남긴다.
  const setSelectedCategory = useCallback((category: CategoryFilterValue) => {
    writePlaceListParams({ category }, "push");
  }, []);

  const setFilters = useCallback((next: PlaceFilters) => {
    writePlaceListParams({ filters: next }, "push");
  }, []);

  const setSortOption = useCallback((next: SortOption) => {
    writePlaceListParams({ sortOption: next }, "push");
  }, []);

  const resetFilters = useCallback(() => {
    // 필터 네 개만 주소에서 걷어낸다. 카테고리·검색어·정렬·위치는 그대로 둔다.
    writePlaceListParams(
      { filters: DEFAULT_PLACE_LIST_PARAMS.filters },
      "push",
    );
  }, []);

  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);

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

  // Selecting always opens the detail view; the back button clears it.
  const handlePlaceSelect = useCallback((placeId: string) => {
    setSelectedPlaceId(placeId);
  }, []);

  const clearSelectedPlace = useCallback(() => {
    setSelectedPlaceId(null);
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
    hoveredPlaceId,
    setHoveredPlaceId,
    filteredAndSorted,
    selectedPlace,
    activeFilterCount,
    resetFilters,
    handlePlaceSelect,
    clearSelectedPlace,
  };
}

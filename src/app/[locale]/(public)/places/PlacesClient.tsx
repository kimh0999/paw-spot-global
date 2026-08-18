"use client";

import { useState, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { LayoutList, LoaderCircle, MapIcon, MapPin, PawPrint, Search, X } from "lucide-react";

import Header from "@/components/Header";
import FilterModal from "@/components/places/FilterModal";
import MapPanel from "@/components/places/MapPanel";
import PlaceCard from "@/components/places/PlaceCard";
import PlacePreviewCard from "@/components/places/PlacePreviewCard";
import SortDropdown from "@/components/places/SortDropdown";
import { usePlaceListState } from "@/components/places/hooks/usePlaceListState";
import { useUserLocationQuery } from "@/components/places/hooks/useUserLocationQuery";
import { DOG_MATCH_FILTER_ENABLED } from "@/lib/dogs/constants";
import {
  matchDogsToPlace,
  type DogMatchResult,
  type MatchableDog,
} from "@/lib/dogs/matching";
import { stripDogSelectionFromUrl } from "@/lib/dogs/selection";
import { toDogSizeFilter } from "@/lib/places/eligibility";
import { cn } from "@/lib/utils";
import type { CategoryFilterValue, PlaceListItem } from "@/types/place";

interface PlacesClientProps {
  initialPlaces: PlaceListItem[];
  userLocation: { lat: number; lng: number } | null;
  initialCategory?: CategoryFilterValue;
  initialSearchQuery?: string;
  favoritePlaceIds?: string[];
  /** URL에서 고른 반려견 중 이 사용자의 것으로 확인된 목록. */
  matchDogs?: MatchableDog[];
  /** 확인되지 않은 dogId가 섞여 있었는지. URL을 조용히 정리하는 데 쓴다. */
  hasStaleDogSelection?: boolean;
}

// 모바일 Bottom Sheet 단계: 결과 수만 → 목록 → 선택한 장소 요약
type SheetState = "peek" | "results" | "selected";

const SHEET_HEIGHT: Record<SheetState, string> = {
  peek: "h-24",
  results: "h-[75vh]",
  selected: "h-72",
};

export default function PlacesClient({ initialPlaces, userLocation, initialCategory, initialSearchQuery, favoritePlaceIds, matchDogs, hasStaleDogSelection = false }: PlacesClientProps) {
  const t = useTranslations("places");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const selectedDogs = useMemo(() => matchDogs ?? [], [matchDogs]);
  // 한 마리만 고른 경우에만 미리보기의 크기 판정을 함께 맞춘다.
  const previewDogSize =
    selectedDogs.length === 1 ? toDogSizeFilter(selectedDogs[0].size) : "all";

  const CATEGORIES: { value: CategoryFilterValue; label: string }[] = [
    { value: "all", label: t("filters.category.all") },
    { value: "cafe", label: t("filters.category.cafe") },
    { value: "restaurant", label: t("filters.category.restaurant") },
    { value: "travel", label: t("filters.category.travel") },
  ];

  const initialSortOption =
    searchParams.get("sort") === "distance" ? "distance" : "recent";
  const [referenceDate] = useState(() => new Date());
  const {
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    sortOption,
    setSortOption,
    selectedPlaceId,
    hoveredPlaceId,
    setHoveredPlaceId,
    filteredAndSorted,
    selectedPlace,
    activeFilterCount,
    resetFilters,
    handlePlaceSelect,
    clearSelectedPlace,
  } = usePlaceListState({
    initialPlaces,
    initialSortOption,
    initialCategory,
    initialSearchQuery,
    referenceDate,
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSheetListOpen, setIsSheetListOpen] = useState(false);
  const {
    isLocating,
    locationDenied,
    locationBlocked,
    hasLocationInUrl,
    handleMyLocation,
  } = useUserLocationQuery();

  useEffect(() => {
    if (searchParams.get("sort") === "distance") {
      setSortOption("distance");
    }
  }, [searchParams, setSortOption]);

  // 확인되지 않은 dogId는 오류로 알리지 않고 주소에서만 걷어낸다.
  useEffect(() => {
    if (!hasStaleDogSelection) return;
    router.replace(stripDogSelectionFromUrl(pathname, searchParams.toString()), {
      scroll: false,
    });
  }, [hasStaleDogSelection, router, pathname, searchParams]);

  const dogMatchByPlaceId = useMemo(() => {
    const map = new Map<string, DogMatchResult>();
    if (selectedDogs.length === 0) return map;

    for (const place of initialPlaces) {
      const result = matchDogsToPlace(selectedDogs, place);
      if (result) map.set(place.id, result);
    }
    return map;
  }, [initialPlaces, selectedDogs]);

  const matchDogName = selectedDogs.length === 1 ? selectedDogs[0].name : null;

  function getDogMatch(placeId: string) {
    const result = dogMatchByPlaceId.get(placeId);
    return result ? { ...result, dogName: matchDogName } : undefined;
  }

  // 맞춤 필터가 꺼져 있으면 목록은 그대로 두고 배지만 붙인다.
  // 크기 정보가 없는 장소가 많은 동안 목록에서 사라지는 편이 더 나쁘기 때문이다.
  const visiblePlaces =
    DOG_MATCH_FILTER_ENABLED && selectedDogs.length > 0
      ? filteredAndSorted.filter(
          (place) => dogMatchByPlaceId.get(place.id)?.status !== "MISMATCH",
        )
      : filteredAndSorted;

  const favoriteIdSet = useMemo(
    () => new Set(favoritePlaceIds ?? []),
    [favoritePlaceIds],
  );
  const isSelectedFavorite = selectedPlace
    ? favoriteIdSet.has(selectedPlace.id)
    : false;

  // 선택 상태에서 파생한다. 요약을 닫으면 직전 단계(peek 또는 results)로 자연스럽게 돌아간다.
  const sheetState: SheetState = selectedPlace
    ? "selected"
    : isSheetListOpen
      ? "results"
      : "peek";

  const previewCard = selectedPlace ? (
    <PlacePreviewCard
      place={selectedPlace}
      referenceDate={referenceDate}
      onClose={clearSelectedPlace}
      userLocation={userLocation}
      isFavorite={isSelectedFavorite}
      dogSize={previewDogSize}
    />
  ) : null;

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-surface">
      <Header />

      <div className="relative flex min-h-0 flex-1">
        {/* 목록 패널 — lg 이상에서는 좌측 컬럼, 그 아래에서는 지도 위 Bottom Sheet */}
        <section
          aria-label={t("list.title")}
          className={cn(
            "absolute inset-x-0 bottom-0 z-bottom-sheet flex flex-col overflow-hidden rounded-t-2xl border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] shadow-lg",
            "transition-[height] duration-300 ease-out motion-reduce:transition-none",
            SHEET_HEIGHT[sheetState],
            "lg:static lg:z-auto lg:h-auto lg:w-[340px] lg:shrink-0 lg:rounded-none lg:border-r lg:border-t-0 lg:pb-0 lg:shadow-none lg:transition-none",
          )}
        >
          {/* 시트 손잡이 — 모바일에서 끌어올릴 영역임을 알리는 장식 */}
          <span
            className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border-strong lg:hidden"
            aria-hidden="true"
          />

          {/* 모바일 시트 컨트롤 — 결과 수 + 목록/지도 전환 */}
          <div
            className={cn(
              "flex shrink-0 items-center justify-between gap-2 px-4 py-2 lg:hidden",
              sheetState === "selected" && "hidden",
            )}
          >
            <p className="text-sm font-semibold text-content">
              {t("list.resultCount", { count: visiblePlaces.length })}
            </p>
            <button
              type="button"
              onClick={() => setIsSheetListOpen((prev) => !prev)}
              className="flex h-11 items-center gap-1.5 rounded-full border border-border-strong bg-surface px-4 text-sm font-semibold text-content outline-none transition-colors hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isSheetListOpen ? (
                <MapIcon size={16} strokeWidth={1.5} aria-hidden="true" />
              ) : (
                <LayoutList size={16} strokeWidth={1.5} aria-hidden="true" />
              )}
              {isSheetListOpen ? t("sheet.showMap") : t("sheet.showList")}
            </button>
          </div>

          {/* 선택한 장소 요약 — 모바일에서는 시트 안에 표시 */}
          <div className={cn("min-h-0 flex-1 lg:hidden", sheetState !== "selected" && "hidden")}>
            {previewCard}
          </div>

          {/* 검색 · 카테고리 · 필터 · 정렬 */}
          <div
            className={cn(
              "shrink-0 flex-col gap-2 border-b border-border px-4 pb-3 pt-1 lg:flex lg:pt-3",
              sheetState === "results" ? "flex" : "hidden",
            )}
          >
            {/* 입력과 동시에 필터링되므로 별도 검색 버튼을 두지 않는다 */}
            <div className="relative">
              <Search
                size={16}
                strokeWidth={1.5}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-content-muted"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("list.searchPlaceholder")}
                aria-label={t("list.searchPlaceholder")}
                className="h-11 w-full rounded-xl border border-border-strong pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelectedCategory(value)}
                  aria-pressed={selectedCategory === value}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    selectedCategory === value
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface-subtle text-content hover:bg-border",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleMyLocation}
                disabled={isLocating}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  hasLocationInUrl
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border-strong bg-surface text-content hover:bg-surface-subtle",
                  isLocating && "cursor-not-allowed opacity-60",
                )}
              >
                {isLocating ? (
                  <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" strokeWidth={1.5} aria-hidden="true" />
                ) : (
                  <MapPin className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                )}
                {t("list.myLocation")}
              </button>

              <button
                type="button"
                onClick={() => setIsFilterOpen(true)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  activeFilterCount > 0
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border-strong bg-surface text-content hover:bg-surface-subtle",
                )}
              >
                {t("list.filter")}
                {activeFilterCount > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs font-bold leading-none text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* 어떤 반려견 기준으로 배지가 붙었는지 밝히고, 한 번에 전체로 돌아갈 길을 둔다. */}
          {selectedDogs.length > 0 && (
            <div
              className={cn(
                "shrink-0 items-center justify-between gap-2 border-b border-border bg-primary-soft px-4 py-2 lg:flex",
                sheetState === "results" ? "flex" : "hidden",
              )}
            >
              <p className="min-w-0 truncate text-sm font-semibold text-primary">
                {matchDogName
                  ? t("list.dogSelection.single", { name: matchDogName })
                  : t("list.dogSelection.multi", { count: selectedDogs.length })}
              </p>
              <button
                type="button"
                onClick={() =>
                  router.replace(
                    stripDogSelectionFromUrl(pathname, searchParams.toString()),
                    { scroll: false },
                  )
                }
                className="flex h-9 shrink-0 items-center gap-1 rounded-full px-2 text-sm font-semibold text-primary outline-none hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X size={14} strokeWidth={2} aria-hidden="true" />
                {t("list.dogSelection.clear")}
              </button>
            </div>
          )}

          {locationDenied && (
            <p
              className={cn(
                "shrink-0 border-b border-border bg-warning-soft px-4 py-2 text-xs text-warning lg:block",
                sheetState === "results" ? "block" : "hidden",
              )}
            >
              {t("list.locationDenied")}
            </p>
          )}
          {locationBlocked && (
            <p
              className={cn(
                "shrink-0 border-b border-border bg-warning-soft px-4 py-2 text-xs text-warning lg:block",
                sheetState === "results" ? "block" : "hidden",
              )}
            >
              {t("list.locationBlocked")}
            </p>
          )}

          {/* 결과 수와 정렬은 서로를 설명하므로 같은 줄에 둔다. 모바일 결과 수는 시트 헤더에 이미 있다. */}
          <div
            className={cn(
              "shrink-0 items-center justify-between gap-2 px-4 py-2 lg:flex",
              sheetState === "results" ? "flex" : "hidden",
            )}
          >
            <p className="hidden text-sm text-content-secondary lg:block">
              {t("list.resultCount", { count: visiblePlaces.length })}
            </p>
            <div className="ml-auto">
              <SortDropdown
                value={sortOption}
                onChange={setSortOption}
                hasLocation={userLocation != null || hasLocationInUrl}
              />
            </div>
          </div>

          {/* 장소 목록 — 패널 안에서만 독립적으로 스크롤한다 */}
          <div
            className={cn(
              "min-h-0 flex-1 overflow-y-auto px-4 pb-4 lg:block",
              sheetState === "results" ? "block" : "hidden",
            )}
          >
            {visiblePlaces.length > 0 ? (
              <ul className="space-y-2">
                {visiblePlaces.map((place) => (
                  <li
                    key={place.id}
                    onMouseEnter={() => setHoveredPlaceId(place.id)}
                    onMouseLeave={() => setHoveredPlaceId(null)}
                  >
                    <PlaceCard
                      place={place}
                      referenceDate={referenceDate}
                      onClick={() => handlePlaceSelect(place.id)}
                      action="select"
                      isSelected={selectedPlaceId === place.id}
                      dogMatch={getDogMatch(place.id)}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-20 text-center text-content-muted">
                <PawPrint className="mx-auto mb-3 h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
                <p className="text-sm">{t("list.empty")}</p>
              </div>
            )}
          </div>
        </section>

        {/* 선택한 장소 상세 — xl 이상은 목록 옆 컬럼, lg 구간은 지도 폭을 지키려고 지도 위 overlay로 띄운다 */}
        <section
          aria-label={t("preview.title")}
          className={cn(
            "hidden overflow-hidden bg-surface",
            // lg overlay — 목록 폭 340px + 여백 16px 만큼 띄운다
            "lg:absolute lg:inset-y-4 lg:left-[356px] lg:z-map-control lg:w-[360px] lg:rounded-xl lg:border lg:border-border lg:shadow-lg",
            // xl 3분할 컬럼 — 미선택 시 폭 0으로 닫히고 지도가 확장된다
            "xl:static xl:inset-auto xl:z-auto xl:shrink-0 xl:rounded-none xl:border-0 xl:shadow-none",
            "xl:transition-[width] xl:duration-standard xl:ease-standard motion-reduce:xl:transition-none",
            selectedPlace
              ? "lg:block xl:w-[380px] xl:border-r"
              : "xl:block xl:w-0",
          )}
        >
          {previewCard}
        </section>

        {/* 지도 — 남은 너비를 모두 쓰고, 선택이 바뀌어도 재마운트하지 않는다 */}
        <div className="relative min-h-0 flex-1">
          <MapPanel
            places={visiblePlaces}
            selectedPlaceId={selectedPlaceId}
            hoveredPlaceId={hoveredPlaceId}
            onSelectPlace={handlePlaceSelect}
            placeholder={t("list.mapPlaceholder")}
            userLocation={userLocation}
            onRequestUserLocation={handleMyLocation}
            isLocating={isLocating}
          />
        </div>
      </div>

      <FilterModal
        isOpen={isFilterOpen}
        filters={filters}
        onClose={() => setIsFilterOpen(false)}
        onChange={setFilters}
        onReset={resetFilters}
        onApply={() => setIsFilterOpen(false)}
      />
    </div>
  );
}

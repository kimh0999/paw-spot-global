"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import Header from "@/components/Header";
import PlaceCard from "@/components/places/PlaceCard";
import FilterModal from "@/components/places/FilterModal";
import SortDropdown from "@/components/places/SortDropdown";
import MapPanel from "@/components/places/MapPanel";
import SelectedPlacePanel from "@/components/places/SelectedPlacePanel";
import { usePlaceListState } from "@/components/places/hooks/usePlaceListState";
import { useUserLocationQuery } from "@/components/places/hooks/useUserLocationQuery";
import type { CategoryFilterValue, PlaceListItem } from "@/types/place";

interface PlacesClientProps {
  initialPlaces: PlaceListItem[];
  userLocation: { lat: number; lng: number } | null;
  initialCategory?: CategoryFilterValue;
  initialSearchQuery?: string;
}

export default function PlacesClient({ initialPlaces, userLocation, initialCategory, initialSearchQuery }: PlacesClientProps) {
  const t = useTranslations("places");
  const searchParams = useSearchParams();

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
    setSelectedPlaceId,
    filteredAndSorted,
    selectedPlace,
    activeFilterCount,
    resetFilters,
    handlePlaceSelect,
  } = usePlaceListState({
    initialPlaces,
    initialSortOption,
    initialCategory,
    initialSearchQuery,
    referenceDate,
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
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

  const mapPlaceholder = t("list.mapPlaceholder");

  return (
    <div className="flex flex-col bg-white md:h-screen md:overflow-hidden">
      <Header />

      <div className="flex-1 flex flex-col md:flex-row md:min-h-0 md:overflow-hidden">

        <aside className="flex flex-col bg-white md:w-[400px] md:shrink-0 md:border-r md:border-gray-100 md:overflow-hidden">

          <div className="shrink-0 px-4 pt-4 pb-3 border-b border-gray-100">
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("list.searchPlaceholder")}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
              <button
                type="button"
                className="px-5 py-2.5 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 active:bg-orange-700 transition-colors shrink-0 text-sm"
              >
                {t("list.searchButton")}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelectedCategory(value)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === value
                      ? "bg-orange-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="md:hidden h-60 shrink-0 border-b border-gray-100">
            <MapPanel
              places={filteredAndSorted}
              selectedPlaceId={selectedPlaceId}
              onSelectPlace={handlePlaceSelect}
              placeholder={mapPlaceholder}
              userLocation={userLocation}
              onRequestUserLocation={handleMyLocation}
              isLocating={isLocating}
            />
          </div>

          <div className="shrink-0 border-b border-gray-100 px-4 py-2.5 flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleMyLocation}
              disabled={isLocating}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                hasLocationInUrl
                  ? "bg-orange-500 border-orange-500 text-white"
                  : "border-gray-300 text-gray-700 hover:border-gray-400 bg-white"
              } ${isLocating ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <span>{isLocating ? "⏳" : "📍"}</span>
              {t("list.myLocation")}
            </button>

            <button
              type="button"
              onClick={() => setIsFilterOpen(true)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                activeFilterCount > 0
                  ? "bg-orange-50 border-orange-400 text-orange-700"
                  : "border-gray-300 text-gray-700 hover:border-gray-400 bg-white"
              }`}
            >
              {t("list.filter")}
              {activeFilterCount > 0 && (
                <span className="bg-orange-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <SortDropdown value={sortOption} onChange={setSortOption} />
          </div>

          {locationDenied && (
            <div className="shrink-0 bg-amber-50 border-b border-amber-100 px-4 py-2">
              <p className="text-xs text-amber-700">{t("list.locationDenied")}</p>
            </div>
          )}
          {locationBlocked && (
            <div className="shrink-0 bg-amber-50 border-b border-amber-100 px-4 py-2">
              <p className="text-xs text-amber-700">{t("list.locationBlocked")}</p>
            </div>
          )}

          <div className="shrink-0 px-4 py-2.5 border-b border-gray-100">
            <p className="text-sm text-gray-600">
              {t("list.resultCount", { count: filteredAndSorted.length })}
            </p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
            {filteredAndSorted.length > 0 ? (
              <>
                <div className="flex flex-col gap-4">
                  {filteredAndSorted.map((place) => (
                    <div
                      key={place.id}
                      className={
                        selectedPlaceId === place.id
                          ? "rounded-2xl ring-2 ring-orange-400"
                          : undefined
                      }
                    >
                      <PlaceCard
                        place={place}
                        onClick={() => handlePlaceSelect(place.id)}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-center mt-8 pb-4">
                  <button
                    type="button"
                    className="px-8 py-3 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {t("list.loadMore")}
                  </button>
                </div>
              </>
            ) : (
              <div className="py-20 text-center text-gray-400">
                <p className="text-4xl mb-3">🐾</p>
                <p className="text-sm">{t("list.empty")}</p>
              </div>
            )}
          </div>

          {selectedPlace && (
            <div className="md:hidden border-t border-gray-100 max-h-80 overflow-y-auto">
              <SelectedPlacePanel
                place={selectedPlace}
                onClose={() => setSelectedPlaceId(null)}
              />
            </div>
          )}
        </aside>

        {selectedPlace && (
          <div className="hidden md:block md:w-[440px] md:shrink-0 md:border-r md:border-gray-100 md:overflow-y-auto">
            <SelectedPlacePanel
              place={selectedPlace}
              onClose={() => setSelectedPlaceId(null)}
            />
          </div>
        )}

        <div className="hidden md:block flex-1">
          <MapPanel
            places={filteredAndSorted}
            selectedPlaceId={selectedPlaceId}
            onSelectPlace={handlePlaceSelect}
            placeholder={mapPlaceholder}
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

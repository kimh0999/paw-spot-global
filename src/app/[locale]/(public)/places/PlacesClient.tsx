"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";

import Header from "@/components/Header";
import PlaceCard from "@/components/places/PlaceCard";
import FilterModal from "@/components/places/FilterModal";
import SortDropdown from "@/components/places/SortDropdown";
import MapPanel from "@/components/places/MapPanel";
import { displayPlaceName, isSupportedLocale } from "@/lib/i18n/locale";
import type {
  CategoryFilterValue,
  PlaceFilters,
  PlaceListItem,
  SortOption,
} from "@/types/place";

interface PlacesClientProps {
  initialPlaces: PlaceListItem[];
}

const DEFAULT_FILTERS: PlaceFilters = {
  indoor: "all",
  carrier: "all",
  dogSizes: [],
  recent: "all",
};

function parseVerifiedAt(verifiedAt: string): Date {
  const [year, month, day] = verifiedAt.split(".").map(Number);
  return new Date(year, month - 1, day);
}

export default function PlacesClient({ initialPlaces }: PlacesClientProps) {
  const t = useTranslations("places");
  const rawLocale = useLocale();
  const locale = isSupportedLocale(rawLocale) ? rawLocale : "en";

  const CATEGORIES: { value: CategoryFilterValue; label: string }[] = [
    { value: "all", label: t("filters.category.all") },
    { value: "cafe", label: t("filters.category.cafe") },
    { value: "restaurant", label: t("filters.category.restaurant") },
    { value: "travel", label: t("filters.category.travel") },
  ];

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilterValue>("all");
  const [filters, setFilters] = useState<PlaceFilters>(DEFAULT_FILTERS);
  const [sortOption, setSortOption] = useState<SortOption>("recent");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [useMyLocation, setUseMyLocation] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  const handleMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => {
        setUseMyLocation(true);
        setLocationDenied(false);
      },
      () => {
        setUseMyLocation(false);
        setLocationDenied(true);
      }
    );
  };

  const filteredAndSorted = initialPlaces
    .filter((p) => {
      if (selectedCategory !== "all" && p.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameKrMatch = p.nameKr.toLowerCase().includes(q);
        const nameEnMatch = p.nameEn?.toLowerCase().includes(q) ?? false;
        const addressMatch = p.address.toLowerCase().includes(q);
        if (!nameKrMatch && !nameEnMatch && !addressMatch) return false;
      }
      if (filters.indoor === "indoor" && p.indoorAllowed !== true) return false;
      if (filters.indoor === "outdoor" && p.indoorAllowed !== false) return false;
      if (filters.indoor === "exclude-unknown" && p.indoorAllowed === null) return false;
      if (filters.carrier === "not-required" && p.carrierRequired !== false) return false;
      if (filters.carrier === "required" && p.carrierRequired !== true) return false;
      if (filters.carrier === "stroller-ok" && p.strollerAllowed !== true) return false;
      if (filters.dogSizes.length > 0 && !filters.dogSizes.some((s) => p.dogSizesAllowed.includes(s))) return false;
      if (filters.recent !== "all") {
        const days = filters.recent === "30days" ? 30 : 90;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        if (!p.latestVerifiedAt || parseVerifiedAt(p.latestVerifiedAt) < cutoff) return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortOption) {
        case "recent":
          return (b.latestVerifiedAt ?? "").localeCompare(a.latestVerifiedAt ?? "");
        case "indoor-first": {
          const aScore = a.indoorAllowed === true ? 0 : 1;
          const bScore = b.indoorAllowed === true ? 0 : 1;
          return aScore - bScore;
        }
        case "no-carrier-first": {
          const aScore = a.carrierRequired === false ? 0 : 1;
          const bScore = b.carrierRequired === false ? 0 : 1;
          return aScore - bScore;
        }
        default:
          return 0;
      }
    });

  const selectedPlace = initialPlaces.find((p) => p.id === selectedPlaceId);
  const selectedPlaceName = selectedPlace
    ? displayPlaceName(selectedPlace, locale).primary
    : undefined;

  const activeFilterCount =
    (filters.indoor !== "all" ? 1 : 0) +
    (filters.carrier !== "all" ? 1 : 0) +
    filters.dogSizes.length +
    (filters.recent !== "all" ? 1 : 0);

  const locationLabel = useMyLocation ? t("list.locationCurrent") : t("list.locationDefault");

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* 검색 + 카테고리 */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 pt-8 pb-5">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{t("list.title")}</h1>
        <p className="text-sm text-gray-500 mb-5">{t("list.description")}</p>

        <div className="flex gap-2 mb-4">
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

      {/* 지도 */}
      <div className="h-80 sm:h-96">
        <MapPanel
          selectedPlaceName={selectedPlaceName}
          placeholder={t("list.mapPlaceholder")}
        />
      </div>

      {/* 위치 거부 안내 */}
      {locationDenied && (
        <div className="bg-amber-50 border-b border-amber-100 px-4 sm:px-6 py-2.5">
          <p className="text-xs text-amber-700">{t("list.locationDenied")}</p>
        </div>
      )}

      {/* 컨트롤 */}
      <div className="border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleMyLocation}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
            useMyLocation
              ? "bg-orange-500 border-orange-500 text-white"
              : "border-gray-300 text-gray-700 hover:border-gray-400 bg-white"
          }`}
        >
          <span>📍</span>
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

      {/* 결과 수 */}
      <div className="px-4 sm:px-6 py-3">
        <p className="text-sm text-gray-600">
          {locationLabel} {t("list.resultCount", { count: filteredAndSorted.length })}
        </p>
      </div>

      {/* 카드 그리드 */}
      <div className="px-4 sm:px-6 pb-16">
        {filteredAndSorted.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredAndSorted.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  onClick={() => setSelectedPlaceId(place.id)}
                />
              ))}
            </div>
            <div className="flex justify-center mt-10">
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

      <FilterModal
        isOpen={isFilterOpen}
        filters={filters}
        onClose={() => setIsFilterOpen(false)}
        onChange={setFilters}
        onReset={() => setFilters(DEFAULT_FILTERS)}
        onApply={() => setIsFilterOpen(false)}
      />
    </div>
  );
}

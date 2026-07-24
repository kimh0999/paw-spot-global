"use client";

import { useTranslations, useLocale } from "next-intl";
import { Coffee, Utensils, Compass, MapPin, Footprints, History } from "lucide-react";

import type { PlaceListItem, ConditionStatus } from "@/types/place";
import { displayPlaceName, isSupportedLocale } from "@/lib/i18n/locale";
import { formatDistance, formatWalkingTime } from "@/lib/geo/distance";
import { STALE_VERIFICATION_WEEKS, weeksSinceVerified } from "@/lib/places/display";
import ConditionBadge from "./ConditionBadge";

interface PlaceCardProps {
  place: PlaceListItem;
  referenceDate: Date;
  onClick?: () => void;
}

const categoryIconStyle: Record<PlaceListItem["category"], string> = {
  cafe: "bg-orange-50 text-orange-500",
  restaurant: "bg-orange-50 text-orange-500",
  travel: "bg-orange-50 text-orange-500",
  etc: "bg-stone-100 text-stone-500",
};

function CategoryIcon({ category }: { category: PlaceListItem["category"] }) {
  const props = { size: 18, "aria-hidden": true as const };
  switch (category) {
    case "cafe": return <Coffee {...props} />;
    case "restaurant": return <Utensils {...props} />;
    case "travel": return <Compass {...props} />;
    default: return <MapPin {...props} />;
  }
}

export default function PlaceCard({ place, referenceDate, onClick }: PlaceCardProps) {
  const t = useTranslations("places");
  const rawLocale = useLocale();
  const locale = isSupportedLocale(rawLocale) ? rawLocale : "en";

  const categoryLabels: Partial<Record<PlaceListItem["category"], string>> = {
    cafe: t("card.category.cafe"),
    restaurant: t("card.category.restaurant"),
    travel: t("card.category.travel"),
  };
  const categoryLabel = categoryLabels[place.category] ?? place.category;

  const { primary: placeName } = displayPlaceName(place, locale);
  const distanceText =
    place.distanceMeters != null
      ? formatDistance(place.distanceMeters, locale)
      : null;
  const walkText = formatWalkingTime(place.distanceMeters, locale);

  const weeksStale = weeksSinceVerified(place.latestVerifiedAt, referenceDate);
  const isStale = weeksStale != null && weeksStale >= STALE_VERIFICATION_WEEKS;

  const chips: Array<{ label: string; status: ConditionStatus }> = [];

  switch (place.indoor) {
    case "allowed":
      chips.push({ label: t("card.indoor.allowed"), status: "good" });
      break;
    case "outdoor_only":
      chips.push({ label: t("card.indoor.outdoorOnly"), status: "warning" });
      break;
    case "partial_area":
      chips.push({ label: t("card.indoor.partialArea"), status: "warning" });
      break;
    case "not_allowed":
      chips.push({ label: t("card.indoor.notAllowed"), status: "bad" });
      break;
    default:
      chips.push({ label: t("card.indoor.unknown"), status: "warning" });
  }

  switch (place.carrierStrollerPolicy) {
    case "not_required":
      chips.push({ label: t("card.carrierStroller.notRequired"), status: "good" });
      break;
    case "required_indoor":
      chips.push({ label: t("card.carrierStroller.requiredIndoor"), status: "warning" });
      break;
    case "required_always":
      chips.push({ label: t("card.carrierStroller.requiredAlways"), status: "bad" });
      break;
    default:
      chips.push({ label: t("card.carrierStroller.unknown"), status: "warning" });
  }

  if (place.maxDogSize === "small") {
    chips.push({ label: t("card.maxDogSize.small"), status: "neutral" });
  } else if (place.maxDogSize === "medium") {
    chips.push({ label: t("card.maxDogSize.medium"), status: "neutral" });
  } else if (place.maxDogSize === "large") {
    chips.push({ label: t("card.maxDogSize.large"), status: "neutral" });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-orange-200 hover:bg-orange-50/30 transition-colors">
      <div className="p-3">
        {/* Header: icon + name + distance */}
        <div className="flex items-start gap-2.5 mb-2">
          <div
            className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${categoryIconStyle[place.category]}`}
          >
            <CategoryIcon category={place.category} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <h3 className="font-semibold text-gray-900 text-[15px] leading-snug truncate">
                {placeName}
              </h3>
              {distanceText && (
                <span className="shrink-0 text-[11px] font-semibold text-gray-500 mt-0.5">
                  {distanceText}
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5 truncate">
              {categoryLabel} · {place.address}
            </p>
            {walkText && (
              <p className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5">
                <Footprints size={11} className="shrink-0" aria-hidden="true" />
                {walkText}
              </p>
            )}
          </div>
        </div>

        {/* Condition chips */}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {chips.map((chip) => (
              <ConditionBadge key={chip.label} label={chip.label} status={chip.status} />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-100 pt-2 flex items-center justify-between gap-2">
          {isStale ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-100">
              <History size={10} aria-hidden="true" />
              {t("card.staleBadge", { weeks: weeksStale })}
            </span>
          ) : (
            <span aria-hidden="true" />
          )}
          <button
            type="button"
            onClick={onClick}
            className="shrink-0 text-[11px] font-semibold text-orange-500 hover:text-orange-600 transition-colors"
          >
            {t("card.detail")} →
          </button>
        </div>
      </div>
    </div>
  );
}

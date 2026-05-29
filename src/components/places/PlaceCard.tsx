"use client";

import { useTranslations, useLocale } from "next-intl";

import type { PlaceListItem, ConditionStatus } from "@/types/place";
import { displayPlaceName, isSupportedLocale } from "@/lib/i18n/locale";
import { formatDistance } from "@/lib/geo/distance";
import ConditionBadge from "./ConditionBadge";

interface PlaceCardProps {
  place: PlaceListItem;
  onClick?: () => void;
}

const categoryIcon: Record<PlaceListItem["category"], string> = {
  cafe: "☕",
  restaurant: "🍽️",
  travel: "🌿",
  etc: "📍",
};

const cardBg: Record<PlaceListItem["category"], string> = {
  cafe: "from-amber-100 to-orange-50",
  restaurant: "from-orange-100 to-red-50",
  travel: "from-green-100 to-emerald-50",
  etc: "from-gray-100 to-slate-50",
};

export default function PlaceCard({ place, onClick }: PlaceCardProps) {
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

  const chips: Array<{ label: string; status: ConditionStatus }> = [];

  // Indoor chip
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

  // Carrier/stroller chip (skip unknown)
  if (place.carrierStrollerPolicy === "not_required") {
    chips.push({ label: t("card.carrierStroller.notRequired"), status: "good" });
  } else if (place.carrierStrollerPolicy === "required") {
    chips.push({ label: t("card.carrierStroller.required"), status: "bad" });
  }

  // Max dog size chip (skip unknown/null)
  if (place.maxDogSize === "small") {
    chips.push({ label: t("card.maxDogSize.small"), status: "warning" });
  } else if (place.maxDogSize === "medium") {
    chips.push({ label: t("card.maxDogSize.medium"), status: "warning" });
  } else if (place.maxDogSize === "large") {
    chips.push({ label: t("card.maxDogSize.large"), status: "good" });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-orange-200 transition-all">
      <div
        className={`w-full h-36 bg-gradient-to-br ${cardBg[place.category]} flex items-center justify-center`}
      >
        <span className="text-5xl">{categoryIcon[place.category]}</span>
      </div>

      <div className="p-4">
        <p className="text-xs text-gray-400 mb-1">
          {categoryLabel}
        </p>
        <h3 className="font-bold text-gray-900 text-base leading-snug">{placeName}</h3>
        <div className="mb-3">
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{place.address}</p>
          {distanceText && (
            <p className="text-xs text-orange-600 font-medium mt-0.5">{distanceText}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {chips.map((chip) => (
            <ConditionBadge key={chip.label} label={chip.label} status={chip.status} />
          ))}
        </div>

        {place.caution && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5 mb-3">
            {t("card.caution")} {place.caution}
          </p>
        )}

        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-gray-400">
            {t("card.verifiedAt")} {place.latestVerifiedAt ?? "-"}
            {place.verificationMethod ? ` · ${place.verificationMethod}` : ""}
          </p>
          <button
            type="button"
            onClick={onClick}
            className="text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors"
          >
            {t("card.detail")}
          </button>
        </div>
      </div>
    </div>
  );
}

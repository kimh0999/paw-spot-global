"use client";

import { useTranslations, useLocale } from "next-intl";

import { formatDistance } from "@/lib/geo/distance";
import { displayPlaceName, isSupportedLocale } from "@/lib/i18n/locale";
import type { ConditionStatus, PlaceListItem } from "@/types/place";
import ConditionBadge from "./ConditionBadge";

interface SelectedPlacePanelProps {
  place: PlaceListItem;
  onClose: () => void;
}

const categoryIcon: Record<PlaceListItem["category"], string> = {
  cafe: "☕",
  restaurant: "🍽️",
  travel: "🌿",
  etc: "📍",
};

const thumbnailBg: Record<PlaceListItem["category"], string> = {
  cafe: "from-amber-100 to-orange-50",
  restaurant: "from-orange-100 to-red-50",
  travel: "from-green-100 to-emerald-50",
  etc: "from-gray-100 to-slate-50",
};

export default function SelectedPlacePanel({ place, onClose }: SelectedPlacePanelProps) {
  const t = useTranslations("places");
  const rawLocale = useLocale();
  const locale = isSupportedLocale(rawLocale) ? rawLocale : "en";

  const { primary: placeName } = displayPlaceName(place, locale);

  const categoryLabels: Partial<Record<PlaceListItem["category"], string>> = {
    cafe: t("card.category.cafe"),
    restaurant: t("card.category.restaurant"),
    travel: t("card.category.travel"),
  };
  const categoryLabel = categoryLabels[place.category] ?? place.category;

  const conditionChips: Array<{ label: string; status: ConditionStatus }> = [];

  // Indoor chip
  switch (place.indoor) {
    case "allowed":
      conditionChips.push({ label: t("card.indoor.allowed"), status: "good" });
      break;
    case "outdoor_only":
      conditionChips.push({ label: t("card.indoor.outdoorOnly"), status: "warning" });
      break;
    case "partial_area":
      conditionChips.push({ label: t("card.indoor.partialArea"), status: "warning" });
      break;
    case "not_allowed":
      conditionChips.push({ label: t("card.indoor.notAllowed"), status: "bad" });
      break;
    default:
      conditionChips.push({ label: t("card.indoor.unknown"), status: "warning" });
  }

  // Carrier/stroller chip (skip unknown)
  if (place.carrierStrollerPolicy === "not_required") {
    conditionChips.push({ label: t("card.carrierStroller.notRequired"), status: "good" });
  } else if (place.carrierStrollerPolicy === "required") {
    conditionChips.push({ label: t("card.carrierStroller.required"), status: "bad" });
  }

  // Max dog size chip (skip unknown/null)
  if (place.maxDogSize === "small") {
    conditionChips.push({ label: t("card.maxDogSize.small"), status: "warning" });
  } else if (place.maxDogSize === "medium") {
    conditionChips.push({ label: t("card.maxDogSize.medium"), status: "warning" });
  } else if (place.maxDogSize === "large") {
    conditionChips.push({ label: t("card.maxDogSize.large"), status: "good" });
  }

  // Leash chip (skip unknown)
  if (place.leash === "required") {
    conditionChips.push({ label: t("card.leash.required"), status: "bad" });
  } else if (place.leash === "not_required") {
    conditionChips.push({ label: t("card.leash.notRequired"), status: "good" });
  } else if (place.leash === "partial_area") {
    conditionChips.push({ label: t("card.leash.partialArea"), status: "warning" });
  }

  // Muzzle chip (skip unknown)
  if (place.muzzle === "required") {
    conditionChips.push({ label: t("card.muzzle.required"), status: "bad" });
  } else if (place.muzzle === "not_required") {
    conditionChips.push({ label: t("card.muzzle.notRequired"), status: "good" });
  } else if (place.muzzle === "conditional") {
    conditionChips.push({ label: t("card.muzzle.conditional"), status: "warning" });
  }

  const distanceText =
    place.distanceMeters != null
      ? formatDistance(place.distanceMeters, locale)
      : null;

  return (
    <div className="bg-white">
      <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 bg-white border-b border-gray-100">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
          {categoryLabel}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          ✕
        </button>
      </div>

      <div
        className={`w-full h-44 bg-gradient-to-br ${thumbnailBg[place.category]} flex items-center justify-center`}
      >
        <span className="text-7xl">{categoryIcon[place.category]}</span>
      </div>

      <div className="px-5 py-4 space-y-4">
        <h2 className="text-lg font-bold text-gray-900 leading-snug">{placeName}</h2>

        <div className="flex items-start gap-2">
          <span className="shrink-0 mt-0.5 text-base">📍</span>
          <p className="text-sm text-gray-600 leading-relaxed">{place.address}</p>
        </div>

        {place.phone && (
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-base">📞</span>
            <p className="text-sm text-gray-600">{place.phone}</p>
          </div>
        )}

        {distanceText && (
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-base">🚶</span>
            <p className="text-sm text-gray-600">{distanceText}</p>
          </div>
        )}

        {place.latestVerifiedAt && (
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-base">✅</span>
            <p className="text-sm text-gray-500">
              {t("card.verifiedAt")} {place.latestVerifiedAt}
              {place.verificationMethod ? ` · ${place.verificationMethod}` : ""}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            {t("card.conditions")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {conditionChips.map((chip) => (
              <ConditionBadge key={chip.label} label={chip.label} status={chip.status} />
            ))}
          </div>
        </div>

        {place.caution && (
          <div className="bg-amber-50 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-amber-700 mb-1">
              ⚠️ {t("card.caution")}
            </p>
            <p className="text-sm text-amber-800 leading-relaxed">{place.caution}</p>
          </div>
        )}

        <button
          type="button"
          disabled
          className="w-full py-3 bg-gray-100 text-gray-400 font-semibold rounded-xl text-sm cursor-not-allowed"
        >
          {t("card.detail")}
        </button>

        <div className="h-2" />
      </div>
    </div>
  );
}

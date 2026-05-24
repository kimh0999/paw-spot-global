"use client";

import { useTranslations, useLocale } from "next-intl";

import type { PlaceListItem, ConditionStatus } from "@/types/place";
import { displayPlaceName, isSupportedLocale } from "@/lib/i18n/locale";
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

  const chips: Array<{ label: string; status: ConditionStatus }> = [];

  if (place.indoorAllowed === true) chips.push({ label: t("card.indoor.allowed"), status: "good" });
  else if (place.indoorAllowed === false) chips.push({ label: t("card.indoor.outdoorOnly"), status: "warning" });
  else chips.push({ label: t("card.indoor.unknown"), status: "warning" });

  if (place.carrierRequired === false) chips.push({ label: t("card.carrier.notRequired"), status: "good" });
  else if (place.carrierRequired === true) chips.push({ label: t("card.carrier.required"), status: "bad" });

  const sizeLabel: Record<string, string> = {
    small: t("card.size.small"),
    medium: t("card.size.medium"),
    large: t("card.size.large"),
  };
  place.dogSizesAllowed.forEach((size) => {
    chips.push({ label: sizeLabel[size], status: "good" });
  });

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
        <p className="text-xs text-gray-500 mt-0.5 mb-3 leading-relaxed">{place.address}</p>

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

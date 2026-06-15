import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";

import ConditionBadge from "@/components/places/ConditionBadge";
import { Link } from "@/i18n/navigation";
import { displayPlaceName, isSupportedLocale } from "@/lib/i18n/locale";
import type {
  ConditionStatus,
  HomePlaceItem,
  PlaceListItem,
} from "@/types/place";

interface HomePlaceCardProps {
  place: HomePlaceItem;
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

export default async function HomePlaceCard({ place }: HomePlaceCardProps) {
  const [rawLocale, tCard, tHome] = await Promise.all([
    getLocale(),
    getTranslations("places.card"),
    getTranslations("home.recentPlaces"),
  ]);
  const locale = isSupportedLocale(rawLocale) ? rawLocale : "en";
  const { primary: placeName } = displayPlaceName(place, locale);
  const categoryLabel = tCard(`category.${place.category}`);
  const chips: Array<{ label: string; status: ConditionStatus }> = [];

  switch (place.indoor) {
    case "allowed":
      chips.push({ label: tCard("indoor.allowed"), status: "good" });
      break;
    case "outdoor_only":
      chips.push({ label: tCard("indoor.outdoorOnly"), status: "warning" });
      break;
    case "partial_area":
      chips.push({ label: tCard("indoor.partialArea"), status: "warning" });
      break;
    case "not_allowed":
      chips.push({ label: tCard("indoor.notAllowed"), status: "bad" });
      break;
    default:
      chips.push({ label: tCard("indoor.unknown"), status: "warning" });
  }

  if (place.carrierStrollerPolicy === "not_required") {
    chips.push({
      label: tCard("carrierStroller.notRequired"),
      status: "good",
    });
  } else if (place.carrierStrollerPolicy === "required") {
    chips.push({
      label: tCard("carrierStroller.required"),
      status: "bad",
    });
  } else if (place.maxDogSize === "small") {
    chips.push({ label: tCard("maxDogSize.small"), status: "warning" });
  } else if (place.maxDogSize === "medium") {
    chips.push({ label: tCard("maxDogSize.medium"), status: "warning" });
  } else if (place.maxDogSize === "large") {
    chips.push({ label: tCard("maxDogSize.large"), status: "good" });
  }

  return (
    <Link
      href={`/places/${place.id}`}
      className="group block overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all hover:border-orange-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
    >
      {place.thumbnailUrl ? (
        <div className="relative h-44 w-full bg-gray-100">
          <Image
            src={place.thumbnailUrl}
            alt={placeName}
            fill
            unoptimized
            className="object-cover transition-transform group-hover:scale-105"
          />
        </div>
      ) : (
        <div
          className={`flex h-44 w-full items-center justify-center bg-gradient-to-br ${cardBg[place.category]}`}
        >
          <span
            className="text-6xl"
            role="img"
            aria-label={categoryLabel}
          >
            {categoryIcon[place.category]}
          </span>
        </div>
      )}

      <div className="p-5">
        <p className="mb-1 text-xs text-gray-400">{categoryLabel}</p>
        <h3 className="text-base font-bold leading-snug text-gray-900">
          {placeName}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-gray-500">
          {place.address}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <ConditionBadge
              key={chip.label}
              label={chip.label}
              status={chip.status}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-400">
            {tHome("verifiedAt")}{" "}
            {place.latestVerifiedAt ?? tHome("checkRequired")}
          </p>
          <span className="shrink-0 text-xs font-semibold text-orange-600 group-hover:text-orange-700">
            {tCard("detail")}
          </span>
        </div>
      </div>
    </Link>
  );
}

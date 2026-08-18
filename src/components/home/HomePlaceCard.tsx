import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Coffee, Utensils, Compass, MapPin, type LucideIcon } from "lucide-react";

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

const categoryIcon: Record<PlaceListItem["category"], LucideIcon> = {
  cafe: Coffee,
  restaurant: Utensils,
  travel: Compass,
  etc: MapPin,
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
  const CategoryIcon = categoryIcon[place.category];
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

  switch (place.carrierStrollerPolicy) {
    case "not_required":
      chips.push({ label: tCard("carrierStroller.notRequired"), status: "good" });
      break;
    case "required_indoor":
      chips.push({ label: tCard("carrierStroller.requiredIndoor"), status: "warning" });
      break;
    case "required_always":
      chips.push({ label: tCard("carrierStroller.requiredAlways"), status: "bad" });
      break;
    default:
      chips.push({ label: tCard("carrierStroller.unknown"), status: "warning" });
  }

  if (place.maxDogSize === "small") {
    chips.push({ label: tCard("maxDogSize.small"), status: "warning" });
  } else if (place.maxDogSize === "medium") {
    chips.push({ label: tCard("maxDogSize.medium"), status: "warning" });
  } else if (place.maxDogSize === "large") {
    chips.push({ label: tCard("maxDogSize.large"), status: "good" });
  }

  return (
    <Link
      href={`/places/${place.id}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-surface transition-all hover:border-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      {place.thumbnailUrl ? (
        <div className="relative h-44 w-full bg-surface-subtle">
          <Image
            src={place.thumbnailUrl}
            alt={placeName}
            fill
            unoptimized
            className="object-cover transition-transform group-hover:scale-105"
          />
        </div>
      ) : (
        <div className="flex h-44 w-full items-center justify-center bg-surface-subtle">
          <CategoryIcon
            className="w-6 h-6 text-content-muted"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </div>
      )}

      <div className="p-5">
        <p className="mb-1 text-xs text-content-muted">{categoryLabel}</p>
        <h3 className="text-base font-bold leading-snug text-content">
          {placeName}
        </h3>
        {/* 주소는 보조 정보다. 길이에 따라 카드 높이가 달라지지 않도록 한 줄로 자른다. */}
        <p className="mt-1 truncate text-sm leading-relaxed text-content-secondary">
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
          <p className="text-xs text-content-muted">
            {tHome("verifiedAt")}{" "}
            {place.latestVerifiedAt ?? tHome("checkRequired")}
          </p>
          <span className="shrink-0 text-xs font-semibold text-primary group-hover:text-primary-hover">
            {tCard("detail")}
          </span>
        </div>
      </div>
    </Link>
  );
}

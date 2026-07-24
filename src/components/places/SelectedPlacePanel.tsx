"use client";

import { useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  X,
  Coffee,
  Utensils,
  Compass,
  MapPin,
  Navigation,
  Footprints,
  BadgeCheck,
  TriangleAlert,
  Phone,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { formatDistance, formatWalkingTime } from "@/lib/geo/distance";
import { verificationMethodKey } from "@/lib/places/display";
import { displayPlaceName, isSupportedLocale } from "@/lib/i18n/locale";
import type { PlaceListItem } from "@/types/place";

interface SelectedPlacePanelProps {
  place: PlaceListItem;
  onClose: () => void;
  userLocation?: { lat: number; lng: number } | null;
}

// Keeps the category glyph consistent with PlaceCard.
function CategoryIcon({ category }: { category: PlaceListItem["category"] }) {
  const props = { className: "w-3 h-3 shrink-0", "aria-hidden": true as const };
  switch (category) {
    case "cafe": return <Coffee {...props} />;
    case "restaurant": return <Utensils {...props} />;
    case "travel": return <Compass {...props} />;
    default: return <MapPin {...props} />;
  }
}

export default function SelectedPlacePanel({ place, onClose, userLocation }: SelectedPlacePanelProps) {
  const t = useTranslations("places");
  const rawLocale = useLocale();
  const locale = isSupportedLocale(rawLocale) ? rawLocale : "en";

  // Move focus to the title when the detail view opens so screen readers announce the change.
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, [place.id]);

  const { primary: placeName } = displayPlaceName(place, locale);

  const categoryLabels: Partial<Record<PlaceListItem["category"], string>> = {
    cafe: t("card.category.cafe"),
    restaurant: t("card.category.restaurant"),
    travel: t("card.category.travel"),
  };
  const categoryLabel = categoryLabels[place.category] ?? place.category;

  const distanceText =
    place.distanceMeters != null ? formatDistance(place.distanceMeters, locale) : null;
  const walkText = formatWalkingTime(place.distanceMeters, locale);

  const pathKey = verificationMethodKey(place.verificationMethod);
  const pathLabel = pathKey ? t(`card.verificationPath.${pathKey}`) : null;

  // Three-block hierarchy: A allowed / B bring / C check & caution.
  const allowedLabels: string[] = [];
  const prepareLabels: string[] = [];
  const checkLabels: string[] = [];

  switch (place.indoor) {
    case "allowed":
      allowedLabels.push(t("selectedPlacePanel.conditions.indoor.allowed"));
      break;
    case "outdoor_only":
      allowedLabels.push(t("selectedPlacePanel.conditions.indoor.outdoorOnly"));
      break;
    case "partial_area":
      checkLabels.push(t("selectedPlacePanel.conditions.indoor.partialArea"));
      break;
    case "not_allowed":
      checkLabels.push(t("selectedPlacePanel.conditions.indoor.notAllowed"));
      break;
    case "unknown":
      checkLabels.push(t("selectedPlacePanel.conditions.indoor.unknown"));
      break;
    // null: not shown
  }

  if (place.carrierStrollerPolicy === "not_required") {
    allowedLabels.push(t("selectedPlacePanel.conditions.carrier.notRequired"));
  } else if (place.carrierStrollerPolicy === "required_indoor") {
    prepareLabels.push(t("selectedPlacePanel.conditions.carrier.requiredIndoor"));
  } else if (place.carrierStrollerPolicy === "required_always") {
    prepareLabels.push(t("selectedPlacePanel.conditions.carrier.requiredAlways"));
  } else if (place.carrierStrollerPolicy === "unknown") {
    checkLabels.push(t("selectedPlacePanel.conditions.carrier.unknown"));
  }

  if (place.maxDogSize === "small") {
    allowedLabels.push(t("selectedPlacePanel.conditions.dogSize.small"));
  } else if (place.maxDogSize === "medium") {
    allowedLabels.push(t("selectedPlacePanel.conditions.dogSize.medium"));
  } else if (place.maxDogSize === "large") {
    allowedLabels.push(t("selectedPlacePanel.conditions.dogSize.large"));
  } else if (place.maxDogSize === "unknown") {
    checkLabels.push(t("selectedPlacePanel.conditions.dogSize.unknown"));
  }

  if (place.leash === "not_required") {
    allowedLabels.push(t("selectedPlacePanel.conditions.leash.notRequired"));
  } else if (place.leash === "required") {
    prepareLabels.push(t("selectedPlacePanel.conditions.leash.required"));
  } else if (place.leash === "partial_area") {
    checkLabels.push(t("selectedPlacePanel.conditions.leash.partialArea"));
  } else if (place.leash === "unknown") {
    checkLabels.push(t("selectedPlacePanel.conditions.leash.unknown"));
  }

  if (place.muzzle === "not_required") {
    allowedLabels.push(t("selectedPlacePanel.conditions.muzzle.notRequired"));
  } else if (place.muzzle === "required") {
    prepareLabels.push(t("selectedPlacePanel.conditions.muzzle.required"));
  } else if (place.muzzle === "conditional") {
    checkLabels.push(t("selectedPlacePanel.conditions.muzzle.conditional"));
  } else if (place.muzzle === "unknown") {
    checkLabels.push(t("selectedPlacePanel.conditions.muzzle.unknown"));
  }

  const directionsUrl = place.location
    ? `https://www.google.com/maps/dir/?api=1&destination=${place.location.lat},${place.location.lng}` +
      (userLocation ? `&origin=${userLocation.lat},${userLocation.lng}` : "")
    : null;

  const hasCheckBlock = checkLabels.length > 0 || place.caution != null;

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      {/* Header with close button */}
      <div className="shrink-0 flex items-start gap-2 px-4 py-3 border-b border-gray-100">
        <div className="min-w-0 flex-1">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="text-base font-semibold text-gray-900 leading-snug outline-none focus-visible:ring-2 focus-visible:ring-blue-300 rounded"
          >
            {placeName}
          </h2>
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1 text-xs text-gray-500">
            <span className="inline-flex items-center gap-0.5">
              <CategoryIcon category={place.category} />
              {categoryLabel}
            </span>
            {distanceText && (
              <>
                <span className="text-gray-300">·</span>
                <span className="inline-flex items-center gap-0.5">
                  <Navigation className="w-3 h-3 shrink-0" aria-hidden="true" />
                  {distanceText}
                </span>
              </>
            )}
            {walkText && (
              <>
                <span className="text-gray-300">·</span>
                <span className="inline-flex items-center gap-0.5">
                  <Footprints className="w-3 h-3 shrink-0" aria-hidden="true" />
                  {walkText}
                </span>
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("selectedPlacePanel.close")}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
        <p className="flex items-start gap-1.5 text-xs text-gray-500">
          <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
          <span className="leading-relaxed">{place.address}</span>
        </p>

        {/* Block A — Allowed (green) */}
        {allowedLabels.length > 0 && (
          <div className="rounded-xl border border-green-100 bg-green-50/60 p-3.5 space-y-1.5">
            <span className="inline-block px-1.5 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">
              {t("selectedPlacePanel.groups.allowed")}
            </span>
            <ul className="space-y-1">
              {allowedLabels.map((label) => (
                <li key={label} className="flex items-start gap-1.5 text-sm text-gray-700">
                  <span className="shrink-0 text-green-600 leading-relaxed" aria-hidden="true">✓</span>
                  <span className="leading-relaxed">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Block B — Bring (neutral/grey) */}
        {prepareLabels.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3.5 space-y-1.5">
            <span className="inline-block px-1.5 py-0.5 rounded text-xs font-semibold bg-gray-200 text-gray-700">
              {t("selectedPlacePanel.groups.prepare")}
            </span>
            <ul className="space-y-1">
              {prepareLabels.map((label) => (
                <li key={label} className="flex items-start gap-1.5 text-sm text-gray-700">
                  <span className="shrink-0 text-gray-400 leading-relaxed" aria-hidden="true">•</span>
                  <span className="leading-relaxed">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Block C — Check before you go (warning, most prominent, full text) */}
        {hasCheckBlock && (
          <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3.5 space-y-2">
            <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-800">
              <TriangleAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
              {t("selectedPlacePanel.groups.check")}
            </span>
            {checkLabels.length > 0 && (
              <ul className="space-y-1">
                {checkLabels.map((label) => (
                  <li key={label} className="flex items-start gap-1.5 text-sm text-amber-900">
                    <span className="shrink-0 leading-relaxed" aria-hidden="true">!</span>
                    <span className="leading-relaxed">{label}</span>
                  </li>
                ))}
              </ul>
            )}
            {place.caution && (
              <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-line">
                {place.caution}
              </p>
            )}
          </div>
        )}

        <Button asChild variant="outline" className="w-full" size="sm">
          <Link href={`/places/${place.id}`}>{t("card.detail")}</Link>
        </Button>

        {/* Last verification — small, at the bottom of the body */}
        <p className="flex items-center gap-1 text-[11px] text-gray-400 pt-1">
          <BadgeCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {place.latestVerifiedAt
              ? `${t("selectedPlacePanel.lastChecked")}: ${place.latestVerifiedAt}${pathLabel ? ` · ${pathLabel}` : ""}`
              : t("selectedPlacePanel.noVerification")}
          </span>
        </p>
      </div>

      {/* Sticky bottom action bar — Directions (primary) + Call. Save is TODO (no DB feature yet). */}
      <div className="shrink-0 flex gap-2 px-4 py-3 border-t border-gray-100 bg-white">
        {directionsUrl && (
          <Button asChild size="sm" className="flex-1 bg-orange-500 text-white hover:bg-orange-600">
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
              <Navigation className="w-4 h-4" aria-hidden="true" />
              {t("selectedPlacePanel.actions.directions")}
            </a>
          </Button>
        )}
        {place.phone && (
          <Button asChild variant="outline" size="sm" className={directionsUrl ? "shrink-0" : "flex-1"}>
            <a href={`tel:${place.phone}`}>
              <Phone className="w-4 h-4" aria-hidden="true" />
              {t("selectedPlacePanel.actions.call")}
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

import Image from "next/image";
import { notFound } from "next/navigation";

import { getTranslations } from "next-intl/server";
import {
  Coffee,
  Utensils,
  Compass,
  MapPin,
  BadgeCheck,
  Phone,
  Globe,
  Camera,
  Map,
  History,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import BeforeYouGoCard from "@/components/places/BeforeYouGoCard";
import DogMatchBadge from "@/components/places/DogMatchBadge";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { matchDogsToPlace } from "@/lib/dogs/matching";
import { getUserDogsByIds } from "@/lib/dogs/queries";
import { parseDogSelection } from "@/lib/dogs/selection";
import { displayPlaceName, isSupportedLocale } from "@/lib/i18n/locale";
import { needsRecheck } from "@/lib/places/display";
import { getPlaceById } from "@/lib/places/queries";
import type { PlaceListItem } from "@/types/place";

const categoryIcon: Record<PlaceListItem["category"], LucideIcon> = {
  cafe: Coffee,
  restaurant: Utensils,
  travel: Compass,
  etc: MapPin,
};

interface Props {
  params: { locale: string; id: string };
  searchParams: { dogId?: string; dogIds?: string; match?: string };
}

export default async function PlaceDetailPage({ params, searchParams }: Props) {
  const { locale, id } = params;
  const safeLocale = isSupportedLocale(locale) ? locale : "en";

  const place = await getPlaceById(id);
  if (!place) notFound();

  // 목록에서 반려견을 고른 채 들어오면 상세에서도 같은 기준으로 판정한다.
  // 확인되지 않은 dogId는 판정 없이 조용히 지나간다.
  const user = await getCurrentUser();
  const selectedDogs = user
    ? await getUserDogsByIds(user.id, parseDogSelection(searchParams).dogIds)
    : [];
  const dogMatch = matchDogsToPlace(selectedDogs, {
    indoor: place.condition?.indoor ?? null,
    maxDogSize: place.condition?.maxDogSize ?? null,
    breedRestrictions: place.condition?.breedRestrictions ?? null,
  });

  const t = await getTranslations({ locale: safeLocale, namespace: "places.detail" });
  const tCard = await getTranslations({ locale: safeLocale, namespace: "places.card" });

  const { primary: placeName, secondary: placeNameSecondary } = displayPlaceName(
    place,
    safeLocale,
  );

  const categoryLabel =
    place.category === "cafe"
      ? tCard("category.cafe")
      : place.category === "restaurant"
        ? tCard("category.restaurant")
        : place.category === "travel"
          ? tCard("category.travel")
          : place.category.toUpperCase();

  const CategoryIcon = categoryIcon[place.category];

  // 목록·카드와 같은 판정을 쓴다. 기준이 되는 확인일도 같은 `formatVerifiedAt` 결과다.
  // 여기서 90일을 다시 세지 않는다 — 화면마다 경계가 갈라지면 같은 장소가 다르게 보인다.
  const showRecheckBadge =
    place.latestVerification != null &&
    needsRecheck(place.latestVerification.verifiedAt, new Date());

  const googleMapsUrl =
    place.location != null
      ? `https://www.google.com/maps/search/?api=1&query=${place.location.lat},${place.location.lng}`
      : null;

  return (
    <div className="min-h-screen bg-surface-subtle">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Back */}
        <Link
          href="/places"
          className="inline-flex items-center gap-1.5 text-sm text-content-secondary hover:text-content transition-colors"
        >
          ← {t("back")}
        </Link>

        {/* Header */}
        <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
          {place.thumbnailUrl ? (
            <div className="relative w-full h-52 bg-surface-subtle">
              <Image
                src={place.thumbnailUrl}
                alt={placeName}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-full h-52 bg-surface-subtle flex items-center justify-center">
              <CategoryIcon
                className="w-6 h-6 text-content-muted"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </div>
          )}
          <div className="px-5 py-4 space-y-2">
            <Badge variant="secondary" className="text-xs">
              {categoryLabel}
            </Badge>
            <h1 className="text-xl font-bold text-content leading-snug">{placeName}</h1>
            {placeNameSecondary && (
              <p className="text-sm text-content-muted">{placeNameSecondary}</p>
            )}
            <div className="flex items-start gap-2 pt-1">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-content-muted" strokeWidth={1.5} aria-hidden="true" />
              <p className="text-sm text-content-secondary leading-relaxed">{place.address}</p>
            </div>
            {place.latestVerification && (
              <div className="flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 shrink-0 mt-0.5 text-content-muted" strokeWidth={1.5} aria-hidden="true" />
                <p className="text-sm text-content-secondary">
                  {tCard("verifiedAt")} {place.latestVerification.verifiedAt}
                </p>
              </div>
            )}
          </div>
        </div>

        {dogMatch && (
          <DogMatchBadge
            status={dogMatch.status}
            reason={dogMatch.reason}
            dogName={selectedDogs.length === 1 ? selectedDogs[0].name : null}
          />
        )}

        {/* Before You Go (most prominent) */}
        <BeforeYouGoCard condition={place.condition} locale={safeLocale} />

        {/* Disclaimer */}
        <p className="text-xs text-content-muted text-center px-2">{t("disclaimer")}</p>

        {/* Place Info */}
        <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-content">{t("info.title")}</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            {place.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 shrink-0 mt-0.5 text-content-muted" strokeWidth={1.5} aria-hidden="true" />
                <a
                  href={`tel:${place.phone}`}
                  className="text-sm text-content-secondary hover:text-content transition-colors"
                >
                  {place.phone}
                </a>
              </div>
            )}
            {place.website && (
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 shrink-0 mt-0.5 text-content-muted" strokeWidth={1.5} aria-hidden="true" />
                <a
                  href={place.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline truncate"
                >
                  {t("info.website")}
                </a>
              </div>
            )}
            {place.instagram && (
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 shrink-0 mt-0.5 text-content-muted" strokeWidth={1.5} aria-hidden="true" />
                <a
                  href={`https://instagram.com/${place.instagram.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  @{place.instagram.replace(/^@/, "")}
                </a>
              </div>
            )}
            {googleMapsUrl && (
              <div className="flex items-center gap-2">
                <Map className="w-4 h-4 shrink-0 mt-0.5 text-content-muted" strokeWidth={1.5} aria-hidden="true" />
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {t("info.viewOnMaps")}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Verification Info */}
        <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-content">{t("verification.title")}</h2>
          </div>
          <div className="px-5 py-4">
            {place.latestVerification ? (
              <div className="divide-y divide-border">
                <div className="flex items-center gap-3 py-2.5">
                  <span className="text-xs font-medium text-content-muted w-28 shrink-0">
                    {t("verification.lastVerified")}
                  </span>
                  <span className="flex flex-wrap items-center gap-2 text-sm text-content">
                    {place.latestVerification.verifiedAt}
                    {/* 신선도 경고다. 동반 불가 판정으로 읽히지 않도록 danger가 아닌 amber를 쓰고
                        확인일 옆에 붙인다 (DESIGN.md §7 Stale verification). */}
                    {showRecheckBadge && (
                      <Badge
                        variant="outline"
                        className="border-transparent bg-warning-soft text-warning"
                      >
                        <History className="shrink-0" aria-hidden="true" />
                        {tCard("staleBadge")}
                      </Badge>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-3 py-2.5">
                  <span className="text-xs font-medium text-content-muted w-28 shrink-0">
                    {t("verification.method")}
                  </span>
                  <span className="text-sm text-content">
                    {place.latestVerification.method}
                  </span>
                </div>
                {place.latestVerification.note && (
                  <div className="flex items-start gap-3 py-2.5">
                    <span className="text-xs font-medium text-content-muted w-28 shrink-0">
                      {t("verification.note")}
                    </span>
                    <span className="text-sm text-content">
                      {place.latestVerification.note}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-content-muted py-2">{t("verification.notVerified")}</p>
            )}
          </div>
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}

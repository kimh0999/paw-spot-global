import Image from "next/image";
import { notFound } from "next/navigation";

import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import BeforeYouGoCard from "@/components/places/BeforeYouGoCard";
import KoreanInquiryBox from "@/components/places/KoreanInquiryBox";
import { Link } from "@/i18n/navigation";
import { displayPlaceName, isSupportedLocale } from "@/lib/i18n/locale";
import { getPlaceById } from "@/lib/places/queries";
import type { PlaceListItem } from "@/types/place";

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

interface Props {
  params: { locale: string; id: string };
}

export default async function PlaceDetailPage({ params }: Props) {
  const { locale, id } = params;
  const safeLocale = isSupportedLocale(locale) ? locale : "en";

  const place = await getPlaceById(id);
  if (!place) notFound();

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

  const googleMapsUrl =
    place.location != null
      ? `https://www.google.com/maps/search/?api=1&query=${place.location.lat},${place.location.lng}`
      : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Back */}
        <Link
          href="/places"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          ← {t("back")}
        </Link>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {place.thumbnailUrl ? (
            <div className="relative w-full h-52 bg-gray-100">
              <Image
                src={place.thumbnailUrl}
                alt={placeName}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          ) : (
            <div
              className={`w-full h-52 bg-gradient-to-br ${thumbnailBg[place.category]} flex items-center justify-center`}
            >
              <span
                className="text-7xl"
                role="img"
                aria-label={categoryLabel}
              >
                {categoryIcon[place.category]}
              </span>
            </div>
          )}
          <div className="px-5 py-4 space-y-2">
            <Badge variant="secondary" className="text-xs">
              {categoryLabel}
            </Badge>
            <h1 className="text-xl font-bold text-gray-900 leading-snug">{placeName}</h1>
            {placeNameSecondary && (
              <p className="text-sm text-gray-400">{placeNameSecondary}</p>
            )}
            <div className="flex items-start gap-2 pt-1">
              <span className="shrink-0 text-base" aria-hidden="true">📍</span>
              <p className="text-sm text-gray-600 leading-relaxed">{place.address}</p>
            </div>
            {place.latestVerification && (
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-base" aria-hidden="true">✅</span>
                <p className="text-sm text-gray-500">
                  {tCard("verifiedAt")} {place.latestVerification.verifiedAt}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Before You Go (most prominent) */}
        <BeforeYouGoCard condition={place.condition} locale={safeLocale} />

        {/* Disclaimer */}
        <p className="text-xs text-gray-400 text-center px-2">{t("disclaimer")}</p>

        {/* Place Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-700">{t("info.title")}</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            {place.phone && (
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-base" aria-hidden="true">📞</span>
                <a
                  href={`tel:${place.phone}`}
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {place.phone}
                </a>
              </div>
            )}
            {place.website && (
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-base" aria-hidden="true">🌐</span>
                <a
                  href={place.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline truncate"
                >
                  {t("info.website")}
                </a>
              </div>
            )}
            {place.instagram && (
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-base" aria-hidden="true">📷</span>
                <a
                  href={`https://instagram.com/${place.instagram.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  @{place.instagram.replace(/^@/, "")}
                </a>
              </div>
            )}
            {googleMapsUrl && (
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-base" aria-hidden="true">🗺️</span>
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  {t("info.viewOnMaps")}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Verification Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-700">{t("verification.title")}</h2>
          </div>
          <div className="px-5 py-4">
            {place.latestVerification ? (
              <div className="divide-y divide-gray-50">
                <div className="flex items-center gap-3 py-2.5">
                  <span className="text-xs font-medium text-gray-400 w-28 shrink-0">
                    {t("verification.lastVerified")}
                  </span>
                  <span className="text-sm text-gray-700">
                    {place.latestVerification.verifiedAt}
                  </span>
                </div>
                <div className="flex items-center gap-3 py-2.5">
                  <span className="text-xs font-medium text-gray-400 w-28 shrink-0">
                    {t("verification.method")}
                  </span>
                  <span className="text-sm text-gray-700">
                    {place.latestVerification.method}
                  </span>
                </div>
                {place.latestVerification.note && (
                  <div className="flex items-start gap-3 py-2.5">
                    <span className="text-xs font-medium text-gray-400 w-28 shrink-0">
                      {t("verification.note")}
                    </span>
                    <span className="text-sm text-gray-700">
                      {place.latestVerification.note}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 py-2">{t("verification.notVerified")}</p>
            )}
          </div>
        </div>

        {/* Korean Inquiry Box — EN locale only */}
        {safeLocale === "en" && <KoreanInquiryBox />}

        <div className="h-4" />
      </div>
    </div>
  );
}

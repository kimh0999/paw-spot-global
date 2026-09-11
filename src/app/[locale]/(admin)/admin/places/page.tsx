import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { displayPlaceName, isSupportedLocale } from "@/lib/i18n/locale";
import { getAdminPlaces, mapCategory } from "@/lib/places/queries";
import type { AdminPlaceRow } from "@/lib/places/queries";
import { MapPin } from "lucide-react";

interface Props {
  params: Promise<{ locale: string }>;
}

const VISIBILITY_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  VISIBLE: "default",
  DRAFT: "secondary",
  HIDDEN: "destructive",
};

export default async function AdminPlacesPage({ params: paramsPromise }: Props) {
  // Next 15부터 params/searchParams는 Promise다. 기존 참조를 그대로 두기 위해 풀어서 같은 이름에 담는다.
  const params = await paramsPromise;
  const safeLocale = isSupportedLocale(params.locale) ? params.locale : "en";
  const [t, tCard] = await Promise.all([
    getTranslations({ locale: safeLocale, namespace: "admin.places" }),
    getTranslations({ locale: safeLocale, namespace: "places.card" }),
  ]);

  const places = await getAdminPlaces();

  const stats = {
    total: places.length,
    visible: places.filter((p) => p.visibility === "VISIBLE").length,
    draft: places.filter((p) => p.visibility === "DRAFT").length,
    hidden: places.filter((p) => p.visibility === "HIDDEN").length,
    missingCondition: places.filter((p) => !p.condition).length,
    notVerified: places.filter((p) => !p.latestVerification).length,
  };

  const indoorLabel: Record<string, string> = {
    ALLOWED: t("indoor.ALLOWED"),
    OUTDOOR_ONLY: t("indoor.OUTDOOR_ONLY"),
    PARTIAL_AREA: t("indoor.PARTIAL_AREA"),
    NOT_ALLOWED: t("indoor.NOT_ALLOWED"),
    UNKNOWN: t("checkRequired"),
  };
  const carrierLabel: Record<string, string> = {
    NOT_REQUIRED: t("carrier.NOT_REQUIRED"),
    REQUIRED_INDOOR: t("carrier.REQUIRED_INDOOR"),
    REQUIRED_ALWAYS: t("carrier.REQUIRED_ALWAYS"),
    UNKNOWN: t("checkRequired"),
  };
  const dogSizeLabel: Record<string, string> = {
    SMALL: t("dogSize.SMALL"),
    MEDIUM: t("dogSize.MEDIUM"),
    LARGE: t("dogSize.LARGE"),
    UNKNOWN: t("checkRequired"),
  };
  const visibilityLabel: Record<string, string> = {
    VISIBLE: t("visibility.VISIBLE"),
    DRAFT: t("visibility.DRAFT"),
    HIDDEN: t("visibility.HIDDEN"),
  };
  const categoryLabel: Record<string, string> = {
    cafe: tCard("category.cafe"),
    restaurant: tCard("category.restaurant"),
    travel: tCard("category.travel"),
    etc: "ETC",
  };

  function conditionSummary(condition: AdminPlaceRow["condition"]) {
    if (!condition) return null;
    return [
      { key: t("indoor.label"), val: indoorLabel[condition.indoor] ?? t("checkRequired") },
      { key: t("carrier.label"), val: carrierLabel[condition.carrierStrollerPolicy] ?? t("checkRequired") },
      { key: t("dogSize.label"), val: dogSizeLabel[condition.maxDogSize] ?? t("checkRequired") },
    ];
  }

  const statItems = [
    { label: t("total"), value: stats.total },
    { label: t("visible"), value: stats.visible },
    { label: t("draft"), value: stats.draft },
    { label: t("hidden"), value: stats.hidden },
    { label: t("missingCondition"), value: stats.missingCondition },
    { label: t("notVerified"), value: stats.notVerified },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-content">{t("title")}</h1>
          <p className="mt-1 text-sm text-content-secondary">{t("description")}</p>
        </div>
        <Button asChild>
          <Link href="/admin/places/new">{t("addPlace")}</Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statItems.map((item) => (
          <div key={item.label} className="rounded-xl border border-border bg-surface px-4 py-3 shadow-sm">
            <p className="text-xs text-content-secondary">{item.label}</p>
            <p className="mt-1 text-2xl font-bold text-content">{item.value}</p>
          </div>
        ))}
      </div>

      {/* List */}
      {places.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface px-6 py-16 text-center shadow-sm">
          <p className="text-sm text-content-muted">{t("noPlaces")}</p>
          <Button asChild className="mt-4">
            <Link href="/admin/places/new">{t("addPlace")}</Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface-subtle/60">
                <tr>
                  <th className="w-16 px-4 py-3" />
                  <th className="px-4 py-3 text-left font-medium text-content-secondary">{t("placeName")}</th>
                  <th className="px-4 py-3 text-left font-medium text-content-secondary">{t("category")}</th>
                  <th className="px-4 py-3 text-left font-medium text-content-secondary">{t("address")}</th>
                  <th className="px-4 py-3 text-left font-medium text-content-secondary">{t("status")}</th>
                  <th className="px-4 py-3 text-left font-medium text-content-secondary">{t("conditionSummary")}</th>
                  <th className="px-4 py-3 text-left font-medium text-content-secondary">{t("latestVerification")}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {places.map((place) => {
                  const { primary: name, secondary } = displayPlaceName(place, safeLocale);
                  const catKey = mapCategory(place.category);
                  const summary = conditionSummary(place.condition);
                  const badgeVariant = VISIBILITY_BADGE[place.visibility] ?? "outline";
                  return (
                    <tr key={place.id} className="hover:bg-surface-subtle/50 transition-colors">
                      <td className="px-4 py-3">
                        {place.thumbnailUrl ? (
                          <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-surface-subtle">
                            <Image src={place.thumbnailUrl} alt={name} fill unoptimized className="object-cover" />
                          </div>
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-subtle">
                            <MapPin className="w-5 h-5 text-content-muted" strokeWidth={1.5} aria-hidden="true" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="line-clamp-1 font-medium text-content">{name}</p>
                        {secondary && <p className="line-clamp-1 text-xs text-content-muted">{secondary}</p>}
                      </td>
                      <td className="px-4 py-3 text-content-secondary">{categoryLabel[catKey] ?? catKey}</td>
                      <td className="max-w-xs px-4 py-3 text-content-secondary">
                        <span className="line-clamp-2">{place.address}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={badgeVariant}>{visibilityLabel[place.visibility] ?? place.visibility}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {summary ? (
                          <div className="space-y-0.5 text-xs text-content-secondary">
                            {summary.map((row) => (
                              <p key={row.key}>
                                <span className="text-content-muted">{row.key}: </span>
                                {row.val}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-content-muted">{t("conditionMissing")}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-content-secondary">
                        {place.latestVerification?.verifiedAt ?? (
                          <span className="text-content-muted">{t("notVerified")}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="outline" size="sm" asChild>
                          <Link
                            href={`/admin/places/${place.id}/edit`}
                            aria-label={`${t("edit")} ${name}`}
                          >
                            {t("edit")}
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {places.map((place) => {
              const { primary: name } = displayPlaceName(place, safeLocale);
              const catKey = mapCategory(place.category);
              const summary = conditionSummary(place.condition);
              const badgeVariant = VISIBILITY_BADGE[place.visibility] ?? "outline";
              return (
                <div key={place.id} className="rounded-xl border border-border bg-surface p-4 shadow-sm space-y-3">
                  <div className="flex items-start gap-3">
                    {place.thumbnailUrl ? (
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-subtle">
                        <Image src={place.thumbnailUrl} alt={name} fill unoptimized className="object-cover" />
                      </div>
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-surface-subtle">
                        <MapPin className="w-5 h-5 text-content-muted" strokeWidth={1.5} aria-hidden="true" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="text-xs">{categoryLabel[catKey] ?? catKey}</Badge>
                        <Badge variant={badgeVariant} className="text-xs">{visibilityLabel[place.visibility] ?? place.visibility}</Badge>
                      </div>
                      <p className="mt-1 line-clamp-1 font-medium text-content">{name}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-content-secondary">{place.address}</p>
                    </div>
                  </div>
                  {summary ? (
                    <div className="space-y-1 border-t border-border pt-3 text-xs text-content-secondary">
                      {summary.map((row) => (
                        <p key={row.key}>
                          <span className="text-content-muted">{row.key}: </span>
                          {row.val}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="border-t border-border pt-3 text-xs text-content-muted">{t("conditionMissing")}</p>
                  )}
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <p className="text-xs text-content-muted">
                      {place.latestVerification
                        ? `${t("latestVerification")}: ${place.latestVerification.verifiedAt}`
                        : t("notVerified")}
                    </p>
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        href={`/admin/places/${place.id}/edit`}
                        aria-label={`${t("edit")} ${name}`}
                      >
                        {t("edit")}
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}

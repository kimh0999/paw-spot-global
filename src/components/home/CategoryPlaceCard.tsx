"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
  Check,
  CircleAlert,
  CircleHelp,
  CircleSlash,
  Coffee,
  Compass,
  MapPin,
  Utensils,
  type LucideIcon,
} from "lucide-react";

import ConditionBadge from "@/components/places/ConditionBadge";
import FavoriteButton from "@/components/places/FavoriteButton";
import { Link } from "@/i18n/navigation";
import { displayPlaceName, isSupportedLocale } from "@/lib/i18n/locale";
import { needsRecheck } from "@/lib/places/display";
import {
  getPlaceConditionBreakdown,
  getVisitStatus,
  type VisitStatus,
} from "@/lib/places/eligibility";
import { cn } from "@/lib/utils";
import type { PlaceListItem } from "@/types/place";

// 카드는 비교용이므로 확실히 허용된 조건 두 개까지만 보여준다.
const MAX_ALLOWANCE_BADGES = 2;

interface CategoryPlaceCardProps {
  place: PlaceListItem;
  referenceDate: Date;
  isFavorite?: boolean;
}

const categoryIcons: Record<PlaceListItem["category"], LucideIcon> = {
  cafe: Coffee,
  restaurant: Utensils,
  travel: Compass,
  etc: MapPin,
};

// 상태는 색상만으로 구분하지 않고 아이콘·문장을 함께 쓴다 (DESIGN.md §4, §11).
const statusIcons: Record<VisitStatus, LucideIcon> = {
  available: Check,
  conditional: CircleAlert,
  confirm: CircleHelp,
  notAllowed: CircleSlash,
};

const statusStyles: Record<VisitStatus, string> = {
  available: "bg-success-soft text-success",
  conditional: "bg-warning-soft text-warning",
  confirm: "bg-unknown-soft text-unknown",
  notAllowed: "bg-danger-soft text-danger",
};

export default function CategoryPlaceCard({
  place,
  referenceDate,
  isFavorite = false,
}: CategoryPlaceCardProps) {
  const t = useTranslations("places");
  const rawLocale = useLocale();
  const locale = isSupportedLocale(rawLocale) ? rawLocale : "en";

  const { primary: placeName } = displayPlaceName(place, locale);
  const categoryLabel = t(`card.category.${place.category}`);
  const CategoryIcon = categoryIcons[place.category];

  // 판정은 공용 helper를 그대로 쓴다. 카드에서 조건을 다시 해석하지 않는다.
  const status = getVisitStatus(place, "all");
  const StatusIcon = statusIcons[status];
  const { allowances } = getPlaceConditionBreakdown(place);
  const visibleAllowances = allowances.slice(0, MAX_ALLOWANCE_BADGES);

  const isStale = needsRecheck(place.latestVerifiedAt, referenceDate);
  const staleText = isStale ? t("card.staleBadge") : null;
  const checkedText = place.latestVerifiedAt
    ? [t("preview.lastChecked"), place.latestVerifiedAt, staleText]
        .filter((part): part is string => part != null)
        .join(" · ")
    : t("card.notChecked");

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-border-strong">
      {/* 카드 전체가 상세로 가는 링크다. 즐겨찾기 버튼은 이 오버레이 뒤에 두어 클릭이 겹치지 않게 한다. */}
      <Link
        href={`/places/${place.id}`}
        className="absolute inset-0 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <span className="sr-only">{t("card.openDetails", { name: placeName })}</span>
      </Link>

      {/* 모든 카드가 같은 비율을 쓴다. 이미지가 없으면 카테고리 아이콘으로 대체한다. */}
      <div className="relative aspect-[4/3] w-full bg-surface-subtle">
        {place.thumbnailUrl ? (
          <Image
            src={place.thumbnailUrl}
            alt={placeName}
            fill
            unoptimized
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <CategoryIcon
              className="h-6 w-6 text-content-muted"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </div>
        )}
      </div>

      <div className="p-4">
        <p
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
            statusStyles[status],
          )}
        >
          <StatusIcon size={12} strokeWidth={2} className="shrink-0" aria-hidden="true" />
          {t(`preview.status.${status}.title`)}
        </p>

        <h3 className="mt-2 line-clamp-2 text-base font-bold leading-snug text-content">
          {placeName}
        </h3>
        <p className="mt-1 truncate text-sm text-content-secondary">
          {categoryLabel} · {place.address}
        </p>

        {visibleAllowances.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {visibleAllowances.map((key) => (
              <li key={key}>
                <ConditionBadge label={t(`preview.allowances.${key}`)} status="good" />
              </li>
            ))}
          </ul>
        )}

        <p
          className={cn(
            "mt-3 truncate text-xs",
            isStale ? "text-warning" : "text-content-muted",
          )}
        >
          {checkedText}
        </p>
      </div>

      {/* 링크 오버레이보다 뒤에 배치해 위로 올라오게 한다 — 즐겨찾기 클릭이 상세 이동으로 이어지지 않는다. */}
      <div className="absolute right-3 top-3">
        <FavoriteButton
          placeId={place.id}
          initialFavorite={isFavorite}
          className="h-11 w-11 rounded-full border-border bg-surface"
        />
      </div>
    </article>
  );
}

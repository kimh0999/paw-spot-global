"use client";

import { useTranslations, useLocale } from "next-intl";

import { getVisitEligibility } from "@/lib/places/eligibility";
import { formatDistance } from "@/lib/geo/distance";
import { displayPlaceName, isSupportedLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { DogMatchResult } from "@/lib/dogs/matching";
import type { DogSizeFilter, PlaceListItem } from "@/types/place";
import DogMatchBadge from "./DogMatchBadge";
import EligibilityBanner from "./EligibilityBanner";
import PlaceConditionSummary from "./PlaceConditionSummary";

interface PlaceCardProps {
  place: PlaceListItem;
  referenceDate: Date;
  onClick: () => void;
  /** 카드 전체 버튼이 무엇을 하는지. 접근 가능한 이름에 그대로 반영한다. */
  action: "select" | "openDetails";
  isSelected?: boolean;
  /** 등록된 반려견 크기. 있으면 방문 가능 여부를 카드 위에 단언한다. */
  dogSize?: DogSizeFilter;
  /** URL에서 고른 반려견과 대조한 결과. 있으면 크기 단독 판정 대신 이 배지를 쓴다. */
  dogMatch?: DogMatchResult & { dogName: string | null };
}

export default function PlaceCard({
  place,
  referenceDate,
  onClick,
  action,
  isSelected = false,
  dogSize = "all",
  dogMatch,
}: PlaceCardProps) {
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
  const actionLabel = t(`card.${action}`, { name: placeName });
  const distanceText =
    place.distanceMeters != null
      ? formatDistance(place.distanceMeters, locale)
      : null;
  const eligibility = getVisitEligibility(place, dogSize);

  return (
    <div
      className={cn(
        "relative rounded-2xl border p-3 transition-colors",
        isSelected
          ? "border-primary bg-primary-soft"
          : "border-border bg-surface hover:border-border-strong hover:bg-surface-subtle",
      )}
    >
      {/* 카드 전체가 선택 대상이다. 중첩 button/link를 만들지 않도록 투명 버튼을 겹쳐 둔다. */}
      <button
        type="button"
        onClick={onClick}
        aria-current={isSelected ? "true" : undefined}
        className="absolute inset-0 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <span className="sr-only">{actionLabel}</span>
      </button>

      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 break-words text-base font-semibold leading-snug text-content">
          {placeName}
        </h3>
        {distanceText && (
          <span className="shrink-0 text-sm font-semibold text-content">
            {distanceText}
          </span>
        )}
      </div>

      <p className="mt-0.5 truncate text-sm text-content-secondary">
        {categoryLabel} · {place.address}
      </p>

      {dogMatch ? (
        <DogMatchBadge
          status={dogMatch.status}
          reason={dogMatch.reason}
          dogName={dogMatch.dogName}
          className="mt-2"
        />
      ) : (
        eligibility && <EligibilityBanner eligibility={eligibility} className="mt-2" />
      )}

      {/* 조건 줄 수가 달라도 카드 높이가 흔들리지 않도록 최소 높이를 준다 */}
      <PlaceConditionSummary
        place={place}
        referenceDate={referenceDate}
        className="mt-2 min-h-14"
      />
    </div>
  );
}

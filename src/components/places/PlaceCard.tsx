"use client";

import { useTranslations, useLocale } from "next-intl";

import PlaceThumb from "@/components/places/PlaceThumb";
import VisitVerdict from "@/components/places/VisitVerdict";
import { getVisitEligibility, getVisitStatus } from "@/lib/places/eligibility";
import { formatDistance } from "@/lib/geo/distance";
import { displayPlaceName, isSupportedLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { DogMatchResult } from "@/lib/dogs/matching";
import type { DogSizeFilter, PlaceListItem } from "@/types/place";
import DogMatchBadge from "./DogMatchBadge";
import EligibilityBanner from "./EligibilityBanner";
import PlaceConditionSummary from "./PlaceConditionSummary";

/**
 * 카드가 어디에 놓이는지. 모양과 카드 전체 버튼의 뜻이 함께 정해진다.
 * - `list`: 구분선으로 나뉜 탐색 목록의 행. 누르면 그 장소를 **선택**한다.
 * - `saved`: 즐겨찾기 그리드에 홀로 서는 카드. 누르면 **상세로 이동**한다.
 */
type PlaceCardVariant = "list" | "saved";

interface PlaceCardProps {
  place: PlaceListItem;
  referenceDate: Date;
  onClick: () => void;
  variant: PlaceCardVariant;
  isSelected?: boolean;
  /**
   * 크기 기준 방문 판정에 쓰는 반려견. 이름을 함께 받는 이유는 여러 마리를 등록한
   * 사용자에게 **누구 기준인지** 밝히지 않으면 사실을 말해도 오해가 되기 때문이다.
   */
  dog?: { size: DogSizeFilter; name: string | null };
  /** URL에서 고른 반려견과 대조한 결과. 있으면 크기 단독 판정 대신 이 배지를 쓴다. */
  dogMatch?: DogMatchResult & { dogName: string | null };
}

export default function PlaceCard({
  place,
  referenceDate,
  onClick,
  variant,
  isSelected = false,
  dog,
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
  const isSaved = variant === "saved";
  const actionLabel = t(isSaved ? "card.openDetails" : "card.select", {
    name: placeName,
  });
  const distanceText =
    place.distanceMeters != null
      ? formatDistance(place.distanceMeters, locale)
      : null;

  // 판정은 공용 helper만 쓴다. 카드에서 조건을 다시 해석하지 않는다.
  const dogSize = dog?.size ?? "all";
  const eligibility = getVisitEligibility(place, dogSize);
  const status = getVisitStatus(place, dogSize);

  return (
    <div
      className={cn(
        "relative transition-colors",
        isSaved
          ? "h-full rounded-card border border-border bg-surface p-4 hover:border-border-strong"
          : // 선택은 배경과 왼쪽 레일로 표시한다. 행을 테두리로 두르면 구분선과 겹쳐 두 겹이 된다.
            "border-l-2 px-4 py-3.5",
        !isSaved &&
          (isSelected
            ? "border-l-primary bg-primary-soft"
            : "border-l-transparent bg-surface hover:bg-surface-subtle"),
        isSaved && isSelected && "border-primary bg-primary-soft",
      )}
    >
      {/* 카드 전체가 하나의 조작 대상이다. 중첩 button/link를 만들지 않도록 투명 버튼을 겹쳐 둔다. */}
      <button
        type="button"
        onClick={onClick}
        aria-current={isSelected ? "true" : undefined}
        className={cn(
          "absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          isSaved && "rounded-card",
        )}
      >
        <span className="sr-only">{actionLabel}</span>
      </button>

      <div className="flex gap-3">
        <PlaceThumb
          category={place.category}
          src={place.thumbnailUrl}
          alt={placeName}
          variant="crest"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 text-base font-bold leading-snug text-content">
              {placeName}
            </h3>
            {distanceText && (
              <span className="shrink-0 text-sm font-semibold tabular-nums text-content">
                {distanceText}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-content-secondary">
            {categoryLabel} · {place.address}
          </p>
        </div>
      </div>

      {/*
        판정 한 줄. 반려견이 걸려 있으면 그 판정이 앞선다 — 사용자가 알고 싶은 것은
        "이 장소가 어떤가"보다 "우리 아이가 갈 수 있는가"다.
      */}
      {dogMatch ? (
        <DogMatchBadge
          status={dogMatch.status}
          reason={dogMatch.reason}
          dogName={dogMatch.dogName}
          className="mt-3"
        />
      ) : eligibility ? (
        <EligibilityBanner
          eligibility={eligibility}
          dogName={dog?.name ?? null}
          className="mt-3"
        />
      ) : (
        <VisitVerdict status={status} className="mt-3" />
      )}

      {/*
        저장한 목록은 조건 전체를 보여준다.

        방문 가능 판정은 **입장 조건**(동반 여부·이동장·크기)만 본다. 목줄·입마개처럼
        지켜야 할 조건은 판정에 들어가지 않으므로, 판정만 보이고 그 조건들이 카드에서
        빠지면 `방문 가능`이 제한이 없다는 뜻으로 읽힌다.
        비교가 목적인 탐색 목록에서는 반대로 핵심 3개만 두어 카드끼리 같은 자리를 견준다.
      */}
      <PlaceConditionSummary
        place={place}
        referenceDate={referenceDate}
        variant={isSaved ? "detailed" : "compact"}
        className="mt-2.5"
      />
    </div>
  );
}

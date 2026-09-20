"use client";

import { useTranslations, useLocale } from "next-intl";

import CategoryIcon from "@/components/places/CategoryIcon";
import PlaceThumb from "@/components/places/PlaceThumb";
import VisitVerdict from "@/components/places/VisitVerdict";
import { getVisitEligibility, getVisitStatus } from "@/lib/places/eligibility";
import { formatDistance } from "@/lib/geo/distance";
import { displayPlaceName, isSupportedLocale } from "@/lib/i18n/locale";
import { hasUsablePhoto } from "@/lib/places/photo";
import { cn } from "@/lib/utils";
import type { DogMatchResult } from "@/lib/dogs/matching";
import type { DogSizeFilter, PlaceListItem } from "@/types/place";
import DogMatchBadge from "./DogMatchBadge";
import EligibilityBanner from "./EligibilityBanner";
import PlaceConditionSummary from "./PlaceConditionSummary";

/**
 * 카드가 어디에 놓이는지. 모양과 카드 전체 버튼의 뜻이 함께 정해진다.
 * - `list`: 지도 옆 탐색 목록의 행. 여러 장소의 조건을 **견주는** 것이 목적이라
 *   사진 자리를 두지 않고 폭 전부를 이름과 조건에 준다. 누르면 그 장소를 **선택**한다.
 * - `saved`: 즐겨찾기 그리드의 가로형 카드. 저장해 둔 곳을 **알아보는** 것이 목적이라
 *   **사진이 있으면** 그 자리를 둔다. 누르면 **상세로 이동**한다.
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

  /** 이름 → 위치·업종 → 판정 → 조건 → 확인 기록. 어느 문맥에서도 이 순서를 지킨다. */
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        {/*
          장소명이 첫 기준점이다. 그리드 카드는 **알아보는** 자리라 한 단 크게 두고,
          여러 행을 견주는 목록은 밀도가 목적이라 기본 크기를 유지한다.
        */}
        <h3
          className={cn(
            "min-w-0 font-bold leading-snug tracking-tight text-content",
            isSaved ? "text-lg" : "text-base",
          )}
        >
          {placeName}
        </h3>
        {distanceText && (
          <span className="shrink-0 text-sm font-semibold tabular-nums text-content">
            {distanceText}
          </span>
        )}
      </div>
      <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-content-secondary">
        <CategoryIcon category={place.category} />
        <span className="truncate">
          {categoryLabel} · {place.address}
        </span>
      </p>

      {/*
        판정 한 줄. 반려견이 걸려 있으면 그 판정이 앞선다 — 사용자가 알고 싶은 것은
        "이 장소가 어떤가"보다 "우리 아이가 갈 수 있는가"다.
      */}
      {dogMatch ? (
        <DogMatchBadge
          status={dogMatch.status}
          reason={dogMatch.reason}
          dogName={dogMatch.dogName}
          className="mt-2"
        />
      ) : eligibility ? (
        <EligibilityBanner
          eligibility={eligibility}
          dogName={dog?.name ?? null}
          className="mt-2"
        />
      ) : (
        <VisitVerdict status={status} className="mt-1.5" />
      )}

      {/*
        저장한 목록은 조건 전체를 보여준다. 방문 가능 판정은 **입장 조건**(동반 여부·
        이동장·크기)만 보므로, 목줄·입마개가 카드에서 빠지면 `방문 가능`이 제한이 없다는
        뜻으로 읽힌다. 견주는 것이 목적인 탐색 목록에서는 핵심 3개만 두어 같은 자리를 견준다.
      */}
      <PlaceConditionSummary
        place={place}
        referenceDate={referenceDate}
        variant={isSaved ? "detailed" : "compact"}
        verificationDivider={isSaved}
        className={isSaved ? "mt-3" : "mt-1.5"}
      />
    </>
  );

  if (isSaved) {
    return (
      <div className="relative flex h-full overflow-hidden rounded-card border border-border bg-surface transition-colors hover:border-border-strong">
        <button
          type="button"
          onClick={onClick}
          className="absolute inset-0 rounded-card outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <span className="sr-only">{actionLabel}</span>
        </button>
        {/* 사진이 있을 때만 자리를 만든다. 없으면 폭 전부를 이름과 조건이 쓴다(§6 Place Thumb). */}
        {hasUsablePhoto(place.thumbnailUrl) && (
          <PlaceThumb
            category={place.category}
            src={place.thumbnailUrl}
            alt={placeName}
            attribution={place.imageAttribution}
            className="w-28 shrink-0 self-stretch sm:w-32"
          />
        )}
        <div className="min-w-0 flex-1 p-4">{body}</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        // 선택은 배경과 왼쪽 레일로 표시한다. 행을 테두리로 두르면 구분선과 겹쳐 두 겹이 된다.
        "relative border-l-2 px-4 py-3 transition-colors",
        isSelected
          ? "border-l-primary bg-primary-soft"
          : "border-l-transparent bg-surface hover:bg-surface-subtle",
      )}
    >
      {/* 행 전체가 하나의 조작 대상이다. 중첩 button/link를 만들지 않도록 투명 버튼을 겹쳐 둔다. */}
      <button
        type="button"
        onClick={onClick}
        aria-current={isSelected ? "true" : undefined}
        className="absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span className="sr-only">{actionLabel}</span>
      </button>
      {body}
    </div>
  );
}

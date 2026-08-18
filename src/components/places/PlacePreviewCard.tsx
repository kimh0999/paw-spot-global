"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Check,
  CircleAlert,
  CircleHelp,
  CircleSlash,
  Coffee,
  Compass,
  History,
  Info,
  MapPin,
  Navigation,
  Utensils,
  X,
  type LucideIcon,
} from "lucide-react";

import ConditionBadge from "@/components/places/ConditionBadge";
import FavoriteButton from "@/components/places/FavoriteButton";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { formatDistance } from "@/lib/geo/distance";
import { displayPlaceName, isSupportedLocale } from "@/lib/i18n/locale";
import {
  STALE_VERIFICATION_WEEKS,
  verificationMethodKey,
  weeksSinceVerified,
} from "@/lib/places/display";
import {
  getPlaceConditionBreakdown,
  getVisitEligibility,
  getVisitStatus,
  type VisitStatus,
} from "@/lib/places/eligibility";
import { cn } from "@/lib/utils";
import type { DogSizeFilter, PlaceListItem } from "@/types/place";

interface PlacePreviewCardProps {
  place: PlaceListItem;
  referenceDate: Date;
  onClose: () => void;
  userLocation?: { lat: number; lng: number } | null;
  isFavorite?: boolean;
  /** 등록된 반려견 크기. 있으면 방문 가능 여부 판정에 함께 반영한다. */
  dogSize?: DogSizeFilter;
}

// 상태는 색상만으로 구분하지 않고 아이콘·문장을 함께 쓴다 (DESIGN.md §4, §11).
const statusIcons: Record<VisitStatus, LucideIcon> = {
  available: Check,
  conditional: CircleAlert,
  confirm: CircleHelp,
  notAllowed: CircleSlash,
};

const statusColors: Record<VisitStatus, string> = {
  available: "text-success",
  conditional: "text-warning",
  confirm: "text-unknown",
  notAllowed: "text-danger",
};

const sectionTitleClass =
  "text-xs font-semibold uppercase tracking-wide text-content-muted";

function CategoryIcon({ category }: { category: PlaceListItem["category"] }) {
  const props = { size: 18, "aria-hidden": true as const };
  switch (category) {
    case "cafe": return <Coffee {...props} />;
    case "restaurant": return <Utensils {...props} />;
    case "travel": return <Compass {...props} />;
    default: return <MapPin {...props} />;
  }
}

/**
 * 제한 조건과 섞이지 않는 중립 안내 영역.
 * 기본은 세 줄까지만 보여주고, 실제로 잘렸을 때만 더보기/접기를 노출한다.
 */
function AdditionalInfo({ text }: { text: string }) {
  const t = useTranslations("places.preview");
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);

  // 클램프된 높이와 실제 높이를 비교해야 하므로 렌더 후 DOM을 측정한다.
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    setIsTruncated(el.scrollHeight > el.clientHeight + 1);
  }, [text]);

  return (
    <section>
      <h3 className={sectionTitleClass}>{t("additionalInfoTitle")}</h3>
      <div className="mt-2 flex items-start gap-2">
        <Info
          size={16}
          strokeWidth={2}
          className="mt-0.5 shrink-0 text-content-muted"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p
            ref={textRef}
            className={cn(
              "whitespace-pre-line break-words text-sm leading-relaxed text-content-secondary",
              !isExpanded && "line-clamp-3",
            )}
          >
            {text}
          </p>
          {isTruncated && (
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              aria-expanded={isExpanded}
              className="mt-1 rounded text-sm font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isExpanded ? t("less") : t("more")}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export default function PlacePreviewCard({
  place,
  referenceDate,
  onClose,
  userLocation,
  isFavorite = false,
  dogSize = "all",
}: PlacePreviewCardProps) {
  const t = useTranslations("places");
  const rawLocale = useLocale();
  const locale = isSupportedLocale(rawLocale) ? rawLocale : "en";

  // 선택이 바뀌면 제목으로 포커스를 옮겨 스크린리더가 변경을 읽고, 키보드로 상세 보기까지 이어지게 한다.
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

  const status = getVisitStatus(place, dogSize);
  const StatusIcon = statusIcons[status];
  const { allowances, conditions } = getPlaceConditionBreakdown(place);

  // 반려견 프로필이 있으면 설명 줄을 그 판정으로 바꾼다.
  // "방문 불가"의 사유(크기 제한인지 동반 불가인지)가 설명에서 빠지지 않게 한다.
  const eligibility = getVisitEligibility(place, dogSize);
  const statusDescription = eligibility
    ? t(`card.eligibility.${eligibility.messageKey}`)
    : t(`preview.status.${status}.description`);

  // 확인일은 기존 유틸리티와 재확인 정책(8주)을 그대로 재사용한다.
  const weeksStale = weeksSinceVerified(place.latestVerifiedAt, referenceDate);
  const staleText =
    weeksStale != null && weeksStale >= STALE_VERIFICATION_WEEKS
      ? t("card.staleBadge", { weeks: weeksStale })
      : null;
  const methodKey = verificationMethodKey(place.verificationMethod);
  const checkedParts = place.latestVerifiedAt
    ? [
        t("preview.lastChecked"),
        place.latestVerifiedAt,
        methodKey ? t(`card.verificationPath.${methodKey}`) : null,
        staleText,
      ].filter((part): part is string => part != null)
    : [t("card.notChecked")];

  const directionsUrl = place.location
    ? `https://www.google.com/maps/dir/?api=1&destination=${place.location.lat},${place.location.lng}` +
      (userLocation ? `&origin=${userLocation.lat},${userLocation.lng}` : "")
    : null;
  // 한 영역의 primary는 하나다 (DESIGN.md §3.5). 길찾기를 쓸 수 없으면 상세 정보가 그 자리를 받는다.
  const detailsVariant = directionsUrl ? "outline" : "default";

  const hasBodySections =
    allowances.length > 0 || conditions.length > 0 || place.caution != null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      {/* 데스크톱에서는 헤더가 상단 구분선에 붙지 않도록 컨테이너 padding으로만 띄운다.
          모바일 Bottom Sheet는 높이가 빠듯하므로 기존 여백을 유지한다. */}
      <div className="flex shrink-0 items-start gap-2.5 border-b border-border px-4 pb-3 pt-3 lg:pb-5 lg:pt-7">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <CategoryIcon category={place.category} />
        </span>

        <div className="min-w-0 flex-1">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="break-words rounded text-lg font-bold leading-snug text-content outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {placeName}
          </h2>
          <p className="mt-0.5 text-sm text-content-secondary">
            {categoryLabel}
            {distanceText && (
              <>
                <span aria-hidden="true"> · </span>
                <span className="font-medium text-content">{distanceText}</span>
              </>
            )}
          </p>
          <p className="mt-1 flex items-start gap-1 text-sm text-content-secondary">
            <MapPin size={14} className="mt-0.5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
            <span className="break-words">{place.address}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={t("preview.close")}
          className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-content-secondary outline-none transition-colors hover:bg-surface-subtle hover:text-content focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* 방문 가능 상태 — 장소명보다 강조되지 않도록 박스 없이 한 줄로 단언한다 */}
        <div className="border-b border-border px-4 py-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-content">
            <StatusIcon
              size={16}
              strokeWidth={2}
              className={cn("shrink-0", statusColors[status])}
              aria-hidden="true"
            />
            {t(`preview.status.${status}.title`)}
          </p>
          <p className="mt-1 text-sm text-content-secondary">{statusDescription}</p>
          <p
            className={cn(
              "mt-1.5 flex items-center gap-1 text-xs",
              staleText ? "text-warning" : "text-content-muted",
            )}
          >
            {staleText && <History size={12} className="shrink-0" aria-hidden="true" />}
            {checkedParts.join(" · ")}
          </p>
        </div>

        {hasBodySections && (
          <div className="space-y-5 px-4 py-4">
            {allowances.length > 0 && (
              <section>
                <h3 className={sectionTitleClass}>{t("preview.allowancesTitle")}</h3>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {allowances.map((key) => (
                    <li key={key}>
                      <ConditionBadge label={t(`preview.allowances.${key}`)} status="good" />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {conditions.length > 0 && (
              <section>
                <h3 className={sectionTitleClass}>{t("preview.conditionsTitle")}</h3>
                <ul className="mt-2 space-y-1.5">
                  {conditions.map((key) => (
                    <li key={key} className="flex items-start gap-2 text-sm text-content">
                      <CircleAlert
                        size={16}
                        strokeWidth={2}
                        className="mt-0.5 shrink-0 text-warning"
                        aria-hidden="true"
                      />
                      <span className="break-words">{t(`preview.conditions.${key}`)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {place.caution && <AdditionalInfo key={place.id} text={place.caution} />}
          </div>
        )}
      </div>

      {/* 본문이 스크롤되어도 액션은 항상 같은 자리에 남는다 */}
      <div className="flex shrink-0 items-center gap-2 border-t border-border px-4 pb-4 pt-3">
        <FavoriteButton
          key={place.id}
          placeId={place.id}
          initialFavorite={isFavorite}
          className="h-11 w-11 shrink-0"
        />
        {directionsUrl && (
          <Button asChild className="h-11 flex-1">
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
              <Navigation size={16} aria-hidden="true" />
              {t("preview.directions")}
            </a>
          </Button>
        )}
        <Button asChild variant={detailsVariant} className="h-11 flex-1">
          <Link href={`/places/${place.id}`}>{t("preview.viewDetails")}</Link>
        </Button>
      </div>
    </div>
  );
}

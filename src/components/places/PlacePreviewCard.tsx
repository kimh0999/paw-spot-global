"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  Check,
  CircleAlert,
  History,
  Info,
  MapPin,
  Navigation,
  type LucideIcon,
} from "lucide-react";

import FavoriteButton from "@/components/places/FavoriteButton";
import PlaceThumb from "@/components/places/PlaceThumb";
import VisitVerdict from "@/components/places/VisitVerdict";
import { Link } from "@/i18n/navigation";
import { formatDistance } from "@/lib/geo/distance";
import { displayPlaceName, isSupportedLocale } from "@/lib/i18n/locale";
import { needsRecheck, verificationMethodKey } from "@/lib/places/display";
import { displayableAreaRecords, resolveDogAccess } from "@/lib/places/dog-access";
import {
  getPlaceConditionBreakdown,
  getVisitEligibility,
  getVisitStatus,
} from "@/lib/places/eligibility";
import { toSpaceLines } from "@/lib/places/policy-display";
import { buildSpaceSentence } from "@/lib/places/policy-sentences";
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
  /** 그 판정의 기준이 된 반려견 이름. 판정 범위를 문장에 밝히는 데 쓴다. */
  dogName?: string | null;
}

const sectionTitleClass = "text-xs font-bold uppercase tracking-wide text-content-muted";

/** 조건 한 줄. 허용과 제한이 같은 형식으로 읽혀야 둘을 나란히 비교할 수 있다. */
function ConditionLine({
  icon: Icon,
  tone,
  children,
}: {
  icon: LucideIcon;
  tone: "good" | "warning";
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-2 text-sm text-content">
      <Icon
        size={16}
        strokeWidth={2}
        className={cn(
          "mt-0.5 shrink-0",
          tone === "good" ? "text-success" : "text-warning",
        )}
        aria-hidden="true"
      />
      <span className="min-w-0">{children}</span>
    </li>
  );
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
              "whitespace-pre-line break-words text-sm text-content-secondary",
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
              className="-mb-2 mt-0.5 inline-flex h-11 items-center rounded text-sm font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
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
  dogName = null,
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
  const { allowances, conditions } = getPlaceConditionBreakdown(place);

  // 구역 단위로 확인된 출입 기록. 구역과 적용 대상을 그대로 보여준다 —
  // 테라스를 전체 야외로, 특정 크기를 전체 반려견으로 넓히지 않는다.
  // 문장은 상세와 같은 함수·문구를 쓴다.
  const areaLines = toSpaceLines(
    displayableAreaRecords(resolveDogAccess(place.indoor, place.policyDetails)),
  ).map((line) =>
    buildSpaceSentence(line, (key, values) => t(`detail.policyDetails.${key}`, values)),
  );

  // 반려견 프로필이 있으면 설명 줄을 그 판정으로 바꾼다.
  // "방문 불가"의 사유(크기 제한인지 동반 불가인지)가 설명에서 빠지지 않게 한다.
  const eligibility = getVisitEligibility(place, dogSize);
  const statusDescription = eligibility
    ? [
        t(`card.eligibility.${eligibility.messageKey}`),
        // 누구를 기준으로 한 판정인지 문장 안에서 밝힌다.
        dogName ? t("card.eligibility.scope", { name: dogName }) : null,
      ]
        .filter((part): part is string => part != null)
        .join(" · ")
    : t(`preview.status.${status}.description`);

  // 재확인 판정은 공용 helper 하나만 쓴다. 화면마다 다른 경계를 두지 않는다(D-02).
  const staleText = needsRecheck(place.latestVerifiedAt, referenceDate)
    ? t("card.staleBadge")
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

  const hasConditionList =
    allowances.length > 0 || conditions.length > 0 || areaLines.length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="shrink-0 border-b border-border px-4 pb-4 pt-3">
        {/* 되돌아가는 길과 저장은 항상 같은 자리에 둔다. 모바일에서는 시트의 이전 단계로,
            데스크톱에서는 목록으로 돌아간다 — 어느 쪽이든 "목록으로"가 맞는 말이다. */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="-ml-2 flex h-11 items-center gap-1 rounded-md px-2 text-sm font-semibold text-content-secondary outline-none transition-colors hover:bg-surface-subtle hover:text-content focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
            {t("preview.backToList")}
          </button>
          <FavoriteButton
            key={place.id}
            placeId={place.id}
            initialFavorite={isFavorite}
            className="-mr-1 h-11 w-11 shrink-0"
          />
        </div>

        <div className="mt-1 flex items-start gap-3">
          <PlaceThumb
            category={place.category}
            src={place.thumbnailUrl}
            alt={placeName}
            variant="crest"
          />
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
                  <span className="font-semibold tabular-nums text-content">
                    {distanceText}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <p className="mt-2 flex items-start gap-1.5 text-sm text-content-secondary">
          <MapPin size={14} className="mt-1 shrink-0" strokeWidth={2} aria-hidden="true" />
          <span className="break-words">{place.address}</span>
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <VisitVerdict status={status} tone="block" description={statusDescription} />

        <p
          className={cn(
            "mt-2 flex items-center gap-1 text-xs",
            staleText ? "text-warning" : "text-content-muted",
          )}
        >
          {staleText && <History size={12} className="shrink-0" aria-hidden="true" />}
          {checkedParts.join(" · ")}
        </p>

        {hasConditionList && (
          <div className="mt-5 space-y-4">
            {allowances.length > 0 && (
              <section>
                <h3 className={sectionTitleClass}>{t("preview.allowancesTitle")}</h3>
                <ul className="mt-2 space-y-1.5">
                  {allowances.map((key) => (
                    <ConditionLine key={key} icon={Check} tone="good">
                      {t(`preview.allowances.${key}`)}
                    </ConditionLine>
                  ))}
                </ul>
              </section>
            )}

            {(conditions.length > 0 || areaLines.length > 0) && (
              <section>
                <h3 className={sectionTitleClass}>{t("preview.conditionsTitle")}</h3>
                <ul className="mt-2 space-y-1.5">
                  {conditions.map((key) => (
                    <ConditionLine key={key} icon={CircleAlert} tone="warning">
                      {t(`preview.conditions.${key}`)}
                    </ConditionLine>
                  ))}
                  {areaLines.map((line) => (
                    <ConditionLine key={line} icon={CircleAlert} tone="warning">
                      {line}
                    </ConditionLine>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        {place.caution && (
          <div className="mt-5">
            <AdditionalInfo key={place.id} text={place.caution} />
          </div>
        )}
      </div>

      {/* 본문이 스크롤되어도 액션은 항상 같은 자리에 남는다.
          미리보기의 목적은 상세로 이어주는 것이므로 `상세 보기`가 primary다
          (기획서 v3 §6-3 · DESIGN.md §6). 길찾기는 secondary로 두고, 위치가 없으면
          버튼 자체를 만들지 않는다 — 눌러도 갈 곳이 없는 버튼을 남기지 않는다. */}
      <div className="flex shrink-0 items-center gap-2 border-t border-border px-4 pb-4 pt-3">
        {directionsUrl && (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border-control bg-surface px-3 text-sm font-semibold text-content outline-none transition-colors hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Navigation size={16} strokeWidth={2} aria-hidden="true" />
            {t("preview.directions")}
          </a>
        )}
        {/* 상세에서도 거리를 보여주려면 위치가 필요하다. 목록이 이미 알고 있는 값을
            그대로 실어 보낸다. 위치가 없으면 붙이지 않고, 상세는 거리를 생략한다. */}
        <Link
          href={
            userLocation
              ? `/places/${place.id}?lat=${userLocation.lat}&lng=${userLocation.lng}`
              : `/places/${place.id}`
          }
          className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground outline-none transition-colors hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {t("preview.viewDetails")}
        </Link>
      </div>
    </div>
  );
}

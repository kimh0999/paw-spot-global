"use client";

import { useTranslations } from "next-intl";
import { Check, CircleAlert, CircleSlash, History, Info, type LucideIcon } from "lucide-react";

import {
  STALE_VERIFICATION_WEEKS,
  verificationMethodKey,
  weeksSinceVerified,
} from "@/lib/places/display";
import { cn } from "@/lib/utils";
import type { ConditionStatus, PlaceListItem } from "@/types/place";

// 카드에서는 핵심 동반 조건만 노출한다: 실내 동반 / 이동장·유모차 / 허용 크기
const COMPACT_CONDITIONS = 3;

interface PlaceConditionSummaryProps {
  place: PlaceListItem;
  referenceDate: Date;
  className?: string;
  /** compact는 카드용 인라인 요약, detailed는 미리보기용 전체 조건 목록이다. */
  variant?: "compact" | "detailed";
}

type CoreCondition = { label: string; status: ConditionStatus };

// 상태는 색상만으로 구분하지 않고 아이콘을 함께 사용한다 (DESIGN.md §4)
const statusIcons: Record<ConditionStatus, LucideIcon> = {
  good: Check,
  warning: CircleAlert,
  bad: CircleSlash,
  neutral: Info,
};

const statusColors: Record<ConditionStatus, string> = {
  good: "text-success",
  warning: "text-warning",
  bad: "text-danger",
  neutral: "text-content-muted",
};

export default function PlaceConditionSummary({
  place,
  referenceDate,
  className,
  variant = "compact",
}: PlaceConditionSummaryProps) {
  const t = useTranslations("places.card");

  const weeksStale = weeksSinceVerified(place.latestVerifiedAt, referenceDate);
  const isStale = weeksStale != null && weeksStale >= STALE_VERIFICATION_WEEKS;

  const conditions: CoreCondition[] = [];

  switch (place.indoor) {
    case "allowed":
      conditions.push({ label: t("indoor.allowed"), status: "good" });
      break;
    case "outdoor_only":
      conditions.push({ label: t("indoor.outdoorOnly"), status: "warning" });
      break;
    case "partial_area":
      conditions.push({ label: t("indoor.partialArea"), status: "warning" });
      break;
    case "not_allowed":
      conditions.push({ label: t("indoor.notAllowed"), status: "bad" });
      break;
    default:
      conditions.push({ label: t("indoor.unknown"), status: "neutral" });
  }

  switch (place.carrierStrollerPolicy) {
    case "not_required":
      conditions.push({ label: t("carrierStroller.notRequired"), status: "good" });
      break;
    case "required_indoor":
      conditions.push({ label: t("carrierStroller.requiredIndoor"), status: "warning" });
      break;
    case "required_always":
      conditions.push({ label: t("carrierStroller.requiredAlways"), status: "bad" });
      break;
    default:
      conditions.push({ label: t("carrierStroller.unknown"), status: "neutral" });
  }

  if (place.maxDogSize === "small") {
    conditions.push({ label: t("maxDogSize.small"), status: "neutral" });
  } else if (place.maxDogSize === "medium") {
    conditions.push({ label: t("maxDogSize.medium"), status: "neutral" });
  } else if (place.maxDogSize === "large") {
    conditions.push({ label: t("maxDogSize.large"), status: "neutral" });
  }

  // 목줄·입마개는 카드에서는 생략하고 미리보기에서만 노출한다.
  if (place.leash === "required") {
    conditions.push({ label: t("leash.required"), status: "warning" });
  } else if (place.leash === "not_required") {
    conditions.push({ label: t("leash.notRequired"), status: "good" });
  } else if (place.leash === "partial_area") {
    conditions.push({ label: t("leash.partialArea"), status: "warning" });
  }

  if (place.muzzle === "required") {
    conditions.push({ label: t("muzzle.required"), status: "bad" });
  } else if (place.muzzle === "not_required") {
    conditions.push({ label: t("muzzle.notRequired"), status: "good" });
  } else if (place.muzzle === "conditional") {
    conditions.push({ label: t("muzzle.conditional"), status: "warning" });
  }

  function getCheckedText() {
    if (!place.latestVerifiedAt) return t("notChecked");
    const checked = t("lastChecked", { date: place.latestVerifiedAt });
    if (isStale) return `${checked} · ${t("staleBadge", { weeks: weeksStale })}`;
    return checked;
  }

  const isDetailed = variant === "detailed";
  const methodKey = isDetailed ? verificationMethodKey(place.verificationMethod) : null;
  const visibleConditions = isDetailed
    ? conditions
    : conditions.slice(0, COMPACT_CONDITIONS);

  return (
    <div className={cn(isDetailed ? "space-y-2.5" : "space-y-1.5", className)}>
      <ul
        className={cn(
          isDetailed
            ? "space-y-1.5"
            : "flex flex-wrap items-center gap-x-3 gap-y-1",
        )}
      >
        {visibleConditions.map(({ label, status }) => {
          const Icon = statusIcons[status];
          return (
            <li key={label} className="flex items-center gap-1.5 text-sm text-content">
              <Icon
                size={16}
                strokeWidth={2}
                className={cn("shrink-0", statusColors[status])}
                aria-hidden="true"
              />
              <span>{label}</span>
            </li>
          );
        })}
      </ul>

      <p
        className={cn(
          "flex items-center gap-1 text-xs",
          isStale ? "text-warning" : "text-content-muted",
        )}
      >
        {isStale && <History size={12} className="shrink-0" aria-hidden="true" />}
        {getCheckedText()}
        {methodKey && <span>· {t(`verificationPath.${methodKey}`)}</span>}
      </p>
    </div>
  );
}

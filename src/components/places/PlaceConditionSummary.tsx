"use client";

import { useTranslations } from "next-intl";
import { History } from "lucide-react";

import ConditionStatusIcon from "@/components/places/ConditionStatusIcon";
import {
  displayableAreaRecords,
  resolveDogAccess,
  type DogAccessKey,
} from "@/lib/places/dog-access";
import { needsRecheck, verificationMethodKey } from "@/lib/places/display";
import { toSpaceLines } from "@/lib/places/policy-display";
import { buildSpaceSentence, type Translate } from "@/lib/places/policy-sentences";
import { cn } from "@/lib/utils";
import type { ConditionStatus, PlaceListItem } from "@/types/place";

/**
 * 카드에서는 핵심 동반 조건 세 가지만 노출한다: 동반 가능 여부 / 이동장·유모차 / 허용 크기.
 *
 * **항목 수이지 줄 수가 아니다.** 한 항목이 여러 줄로 늘어날 수 있고,
 * 동반 가능 여부 항목은 구역 기록을 함께 담아 여러 줄이 되기도 한다(DESIGN.md §6).
 */
const COMPACT_CONDITION_GROUPS = 3;

interface PlaceConditionSummaryProps {
  place: PlaceListItem;
  referenceDate: Date;
  className?: string;
  /** compact는 카드용 핵심 조건 3개, detailed는 미리보기용 전체 조건 목록이다. */
  variant?: "compact" | "detailed";
  /** 확인일 줄을 이 컴포넌트가 그릴지. 화면이 확인 정보를 따로 두면 끈다. */
  showVerification?: boolean;
  /**
   * 확인일 앞에 가는 선을 둘지. 그리드 카드는 조건과 확인 기록이 같은 상자 안에
   * 붙어 있어 선 하나로 **읽는 순서**를 나눈다. 위아래가 구분선으로 이미 나뉜
   * 목록 행에서는 선이 한 겹 더 생기므로 쓰지 않는다.
   */
  verificationDivider?: boolean;
}

type CoreCondition = { label: string; status: ConditionStatus };

export default function PlaceConditionSummary({
  place,
  referenceDate,
  className,
  variant = "compact",
  showVerification = true,
  verificationDivider = false,
}: PlaceConditionSummaryProps) {
  const t = useTranslations("places.card");
  // 구역 문장은 상세와 같은 문구를 쓴다. 같은 사실을 화면마다 다르게 옮겨 적지 않는다.
  const tp = useTranslations("places.detail.policyDetails");
  const translateSpace: Translate = (key, values) => tp(key, values);

  const isStale = needsRecheck(place.latestVerifiedAt, referenceDate);

  const isDetailed = variant === "detailed";

  /** 조건 항목 묶음. 한 묶음이 여러 줄이 될 수 있다. */
  const groups: CoreCondition[][] = [];

  // --- 동반 가능 여부 ---
  const access = resolveDogAccess(place.indoor, place.policyDetails);
  const accessLine: Record<DogAccessKey, CoreCondition> = {
    allowed: { label: t("indoor.allowed"), status: "good" },
    outdoorOnly: { label: t("indoor.outdoorOnly"), status: "warning" },
    partialArea: { label: t("indoor.partialArea"), status: "warning" },
    notAllowed: { label: t("indoor.notAllowed"), status: "bad" },
    indoorBlockedOutdoorUnconfirmed: {
      label: t("indoor.indoorBlockedOutdoorUnconfirmed"),
      status: "warning",
    },
    conflict: { label: t("indoor.conflict"), status: "neutral" },
    unknown: { label: t("indoor.unknown"), status: "neutral" },
  };

  /**
   * 요약 한 줄로 동반 가능 여부가 정해지지 않는 경우에만 구역 기록을 함께 보여준다.
   * 구역·적용 대상을 그대로 옮기므로 테라스를 전체 야외로, 대형견 제한을 전체 제한으로 넓히지 않는다.
   */
  const showsAreaRecords =
    isDetailed || access.key === "unknown" || access.key === "partialArea" || access.key === "conflict";

  const accessGroup: CoreCondition[] = [accessLine[access.key]];
  if (showsAreaRecords) {
    for (const line of toSpaceLines(displayableAreaRecords(access))) {
      accessGroup.push({
        label: buildSpaceSentence(line, translateSpace),
        status: line.access === "NOT_ALLOWED" ? "bad" : "good",
      });
    }
  }
  groups.push(accessGroup);

  // --- 이동장·유모차 ---
  switch (place.carrierStrollerPolicy) {
    case "not_required":
      groups.push([{ label: t("carrierStroller.notRequired"), status: "good" }]);
      break;
    case "required_indoor":
      groups.push([{ label: t("carrierStroller.requiredIndoor"), status: "warning" }]);
      break;
    case "required_always":
      groups.push([{ label: t("carrierStroller.requiredAlways"), status: "bad" }]);
      break;
    default:
      groups.push([{ label: t("carrierStroller.unknown"), status: "neutral" }]);
  }

  // --- 허용 크기 ---
  // 미확인일 때도 항목을 비우지 않는다. 비우면 목줄이 세 번째 자리로 올라와 표시 순서가 흔들린다.
  if (place.maxDogSize === "small") {
    groups.push([{ label: t("maxDogSize.small"), status: "neutral" }]);
  } else if (place.maxDogSize === "medium") {
    groups.push([{ label: t("maxDogSize.medium"), status: "neutral" }]);
  } else if (place.maxDogSize === "large") {
    groups.push([{ label: t("maxDogSize.large"), status: "neutral" }]);
  } else {
    groups.push([{ label: t("maxDogSize.unknown"), status: "neutral" }]);
  }

  // 목줄·입마개는 카드에서는 생략하고 미리보기에서만 노출한다.
  if (place.leash === "required") {
    groups.push([{ label: t("leash.required"), status: "warning" }]);
  } else if (place.leash === "not_required") {
    groups.push([{ label: t("leash.notRequired"), status: "good" }]);
  } else if (place.leash === "partial_area") {
    groups.push([{ label: t("leash.partialArea"), status: "warning" }]);
  }

  if (place.muzzle === "required") {
    groups.push([{ label: t("muzzle.required"), status: "bad" }]);
  } else if (place.muzzle === "not_required") {
    groups.push([{ label: t("muzzle.notRequired"), status: "good" }]);
  } else if (place.muzzle === "conditional") {
    groups.push([{ label: t("muzzle.conditional"), status: "warning" }]);
  }

  function getCheckedText() {
    if (!place.latestVerifiedAt) return t("notChecked");
    const checked = t("lastChecked", { date: place.latestVerifiedAt });
    if (isStale) return `${checked} · ${t("staleBadge")}`;
    return checked;
  }

  const methodKey = isDetailed ? verificationMethodKey(place.verificationMethod) : null;
  const visibleConditions = (
    isDetailed ? groups : groups.slice(0, COMPACT_CONDITION_GROUPS)
  ).flat();

  /**
   * 조건은 한 항목당 한 줄로 세로로 쌓는다. 가로로 흘리면 카드마다 줄바꿈 위치가 달라져
   * 같은 자리의 조건을 비교할 수 없다 — 비교가 이 목록의 목적이다 (DESIGN.md §6).
   */
  return (
    <div className={className}>
      <ul className={cn(isDetailed ? "space-y-1.5" : "space-y-0.5")}>
        {visibleConditions.map(({ label, status }) => (
          <li key={label} className="flex items-start gap-2 text-sm text-content">
            <ConditionStatusIcon status={status} className="mt-0.5" />
            <span className="min-w-0">{label}</span>
          </li>
        ))}
      </ul>

      {showVerification && (
        <p
          className={cn(
            "flex items-center gap-1 text-xs",
            verificationDivider
              ? "mt-3 border-t border-border pt-2.5"
              : isDetailed
                ? "mt-2"
                : "mt-1.5",
            isStale ? "text-warning" : "text-content-muted",
          )}
        >
          {isStale && <History size={12} className="shrink-0" aria-hidden="true" />}
          {getCheckedText()}
          {methodKey && <span>· {t(`verificationPath.${methodKey}`)}</span>}
        </p>
      )}
    </div>
  );
}

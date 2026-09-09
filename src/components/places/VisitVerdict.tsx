"use client";

import { useTranslations } from "next-intl";
import { Check, CircleAlert, CircleHelp, CircleSlash, type LucideIcon } from "lucide-react";

import type { VisitStatus } from "@/lib/places/eligibility";
import { cn } from "@/lib/utils";

/**
 * 장소 수준의 방문 판정 한 줄.
 *
 * 반려견 프로필이 함께 걸린 판정은 `EligibilityBanner`·`DogMatchBadge`가 맡는다.
 * 이 컴포넌트는 **누구를 기준으로 한 판정도 아님**을 지키고, 장소 조건만 요약한다.
 * 색은 상태를 보조할 뿐이라 아이콘과 문장을 항상 함께 낸다 (DESIGN.md §4·§11).
 */
const statusIcons: Record<VisitStatus, LucideIcon> = {
  available: Check,
  conditional: CircleAlert,
  confirm: CircleHelp,
  notAllowed: CircleSlash,
};

const statusText: Record<VisitStatus, string> = {
  available: "text-success",
  conditional: "text-warning",
  confirm: "text-unknown",
  notAllowed: "text-danger",
};

const statusBlock: Record<VisitStatus, string> = {
  available: "bg-success-soft text-success",
  conditional: "bg-warning-soft text-warning",
  confirm: "bg-unknown-soft text-unknown",
  notAllowed: "bg-danger-soft text-danger",
};

interface VisitVerdictProps {
  status: VisitStatus;
  /** line은 카드 안의 한 줄, block은 미리보기·상세의 판정 영역이다. */
  tone?: "line" | "block";
  /** block에서 판정 아래 붙는 설명. 반려견 판정이 있으면 그 문장으로 대체된다. */
  description?: string | null;
  className?: string;
}

export default function VisitVerdict({
  status,
  tone = "line",
  description,
  className,
}: VisitVerdictProps) {
  const t = useTranslations("places.preview.status");
  const Icon = statusIcons[status];

  if (tone === "line") {
    return (
      <p
        className={cn(
          "flex items-center gap-1.5 text-sm font-semibold",
          statusText[status],
          className,
        )}
      >
        <Icon size={16} strokeWidth={2} className="shrink-0" aria-hidden="true" />
        {t(`${status}.title`)}
      </p>
    );
  }

  return (
    <div className={cn("rounded-panel px-3 py-2.5", statusBlock[status], className)}>
      <p className="flex items-center gap-1.5 text-sm font-bold">
        <Icon size={16} strokeWidth={2} className="shrink-0" aria-hidden="true" />
        {t(`${status}.title`)}
      </p>
      {description && (
        <p className="mt-1 text-sm text-content-secondary">{description}</p>
      )}
    </div>
  );
}

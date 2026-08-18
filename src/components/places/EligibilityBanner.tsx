"use client";

import { useTranslations } from "next-intl";
import { Check, CircleAlert, CircleSlash, type LucideIcon } from "lucide-react";

import type { VisitEligibility, VisitEligibilityStatus } from "@/lib/places/eligibility";
import { cn } from "@/lib/utils";

interface EligibilityBannerProps {
  eligibility: VisitEligibility;
  className?: string;
}

// 색상만으로 상태를 전달하지 않는다 (DESIGN.md §11). 아이콘과 문장을 항상 함께 쓴다.
const statusStyles: Record<VisitEligibilityStatus, string> = {
  allowed: "bg-success-soft text-success",
  blocked: "bg-danger-soft text-danger",
  unknown: "bg-unknown-soft text-unknown",
};

const statusIcons: Record<VisitEligibilityStatus, LucideIcon> = {
  allowed: Check,
  blocked: CircleSlash,
  unknown: CircleAlert,
};

export default function EligibilityBanner({
  eligibility,
  className,
}: EligibilityBannerProps) {
  const t = useTranslations("places.card.eligibility");
  const Icon = statusIcons[eligibility.status];

  return (
    <p
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold",
        statusStyles[eligibility.status],
        className,
      )}
    >
      <Icon size={16} strokeWidth={2} className="shrink-0" aria-hidden="true" />
      {t(eligibility.messageKey)}
    </p>
  );
}

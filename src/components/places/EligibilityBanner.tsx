"use client";

import { useTranslations } from "next-intl";
import { Check, CircleAlert, CircleSlash, type LucideIcon } from "lucide-react";

import type { VisitEligibility, VisitEligibilityStatus } from "@/lib/places/eligibility";
import { cn } from "@/lib/utils";

interface EligibilityBannerProps {
  eligibility: VisitEligibility;
  /**
   * 판정 기준이 된 반려견 이름. 여러 마리를 등록한 사용자에게 **누구 기준인지**
   * 밝히지 않으면 이 문장은 사실을 말해도 오해를 만든다.
   */
  dogName?: string | null;
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
  dogName = null,
  className,
}: EligibilityBannerProps) {
  const t = useTranslations("places.card.eligibility");
  const Icon = statusIcons[eligibility.status];

  return (
    <p
      className={cn(
        "flex flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-md px-2.5 py-1.5 text-sm font-bold",
        statusStyles[eligibility.status],
        className,
      )}
    >
      <Icon size={16} strokeWidth={2} className="shrink-0" aria-hidden="true" />
      {t(eligibility.messageKey)}
      {dogName && (
        <span className="font-medium opacity-90">· {t("scope", { name: dogName })}</span>
      )}
    </p>
  );
}

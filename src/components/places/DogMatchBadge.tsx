"use client";

import { useTranslations } from "next-intl";
import { Check, CircleAlert, CircleSlash, type LucideIcon } from "lucide-react";

import type { DogMatchReason, DogMatchStatus } from "@/lib/dogs/matching";
import { comitativeParticle } from "@/lib/i18n/korean-particle";
import { cn } from "@/lib/utils";

interface DogMatchBadgeProps {
  status: DogMatchStatus;
  /** 문구를 고르는 기준. 상태만으로는 동반 불가와 크기 제한을 구분할 수 없다. */
  reason: DogMatchReason | null;
  /** 한 마리만 대조했을 때의 이름. 여러 마리면 null. */
  dogName: string | null;
  className?: string;
}

// 색상만으로 상태를 전달하지 않는다 (DESIGN.md §11). 아이콘과 문장을 항상 함께 쓴다.
const statusStyles: Record<DogMatchStatus, string> = {
  MATCH: "bg-success-soft text-success",
  MISMATCH: "bg-danger-soft text-danger",
  CHECK_REQUIRED: "bg-unknown-soft text-unknown",
};

const statusIcons: Record<DogMatchStatus, LucideIcon> = {
  MATCH: Check,
  MISMATCH: CircleSlash,
  CHECK_REQUIRED: CircleAlert,
};

export default function DogMatchBadge({
  status,
  reason,
  dogName,
  className,
}: DogMatchBadgeProps) {
  const t = useTranslations("places.card.dogMatch");
  const Icon = statusIcons[status];

  const scope = dogName ? "single" : "multi";
  // MATCH일 때만 사유가 없다. 사유를 그대로 메시지 키로 쓴다.
  const messageKey = `${scope}.${reason ?? "MATCH"}`;
  const label = dogName
    ? t(messageKey, { name: dogName, particle: comitativeParticle(dogName) })
    : t(messageKey);

  return (
    <p
      className={cn(
        "flex items-start gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-bold",
        statusStyles[status],
        className,
      )}
    >
      <Icon size={16} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden="true" />
      {label}
    </p>
  );
}

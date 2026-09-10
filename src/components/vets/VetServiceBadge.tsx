import { Check, CircleAlert, CircleSlash, Info, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { VetServiceStatus } from "@/lib/vets/constants";

/**
 * 영어 응대·야간 진료 상태 한 줄.
 *
 * **조건부는 조건 문구를 반드시 함께 낸다**(계획서 §2-A). 조건 없이 `조건부 가능`만 두면
 * 사용자는 무엇이 조건인지 모른 채 가능으로 읽는다. 입력 단계에서도 zod가 같은 규칙을 건다.
 *
 * 색은 보조 수단이라 아이콘과 문장을 항상 함께 쓴다(DESIGN.md §11).
 * 미확인은 `불가`가 아니라 중립으로 그린다 — 확인하지 못한 것을 없는 것으로 만들지 않는다.
 */
const STATUS_ICON: Record<VetServiceStatus, LucideIcon> = {
  AVAILABLE: Check,
  CONDITIONAL: CircleAlert,
  UNAVAILABLE: CircleSlash,
  UNKNOWN: Info,
};

const STATUS_COLOR: Record<VetServiceStatus, string> = {
  AVAILABLE: "text-success",
  CONDITIONAL: "text-warning",
  UNAVAILABLE: "text-danger",
  UNKNOWN: "text-content-muted",
};

interface Props {
  label: string;
  status: VetServiceStatus;
  statusLabel: string;
  condition: string | null;
  className?: string;
}

export default function VetServiceBadge({
  label,
  status,
  statusLabel,
  condition,
  className,
}: Props) {
  const Icon = STATUS_ICON[status];
  const showsCondition = status === "CONDITIONAL" && Boolean(condition);

  return (
    <div className={cn("flex items-start gap-2 text-sm", className)}>
      <Icon
        size={16}
        strokeWidth={2}
        className={cn("mt-0.5 shrink-0", STATUS_COLOR[status])}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="text-content">
          <span className="text-content-secondary">{label}</span>
          <span aria-hidden="true"> · </span>
          <span className="font-semibold">{statusLabel}</span>
        </p>
        {showsCondition && (
          <p className="mt-0.5 text-xs text-content-secondary">{condition}</p>
        )}
      </div>
    </div>
  );
}

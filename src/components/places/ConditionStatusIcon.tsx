import { Check, CircleAlert, CircleSlash, Info, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ConditionStatus } from "@/types/place";

/**
 * 조건 상태를 나타내는 아이콘.
 *
 * 카드·미리보기·상세가 **같은 아이콘과 같은 색**을 쓰도록 한 곳에 둔다. 같은 사실이
 * 화면마다 다른 모양이면 사용자는 둘을 다른 정보로 읽는다 (DESIGN.md §4 Icons·§9).
 * 색은 보조 수단이라 옆에는 언제나 문장이 함께 온다.
 */
const STATUS_ICON: Record<ConditionStatus, LucideIcon> = {
  good: Check,
  warning: CircleAlert,
  bad: CircleSlash,
  neutral: Info,
};

const STATUS_COLOR: Record<ConditionStatus, string> = {
  good: "text-success",
  warning: "text-warning",
  bad: "text-danger",
  neutral: "text-content-muted",
};

export default function ConditionStatusIcon({
  status,
  className,
}: {
  status: ConditionStatus;
  className?: string;
}) {
  const Icon = STATUS_ICON[status];
  return (
    <Icon
      size={16}
      strokeWidth={2}
      className={cn("shrink-0", STATUS_COLOR[status], className)}
      aria-hidden="true"
    />
  );
}

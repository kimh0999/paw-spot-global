import type { ConditionStatus } from "@/types/place";

interface ConditionBadgeProps {
  label: string;
  status: ConditionStatus;
}

const chipStyle: Record<ConditionStatus, string> = {
  good: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  bad: "bg-danger-soft text-danger",
  neutral: "bg-unknown-soft text-unknown",
};

export default function ConditionBadge({ label, status }: ConditionBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${chipStyle[status]}`}
    >
      {label}
    </span>
  );
}

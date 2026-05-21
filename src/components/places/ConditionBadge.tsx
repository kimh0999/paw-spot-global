import type { ConditionStatus } from "@/types/place";

interface ConditionBadgeProps {
  label: string;
  status: ConditionStatus;
}

const chipStyle: Record<ConditionStatus, string> = {
  good: "bg-green-50 text-green-700 border-green-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  bad: "bg-red-50 text-red-600 border-red-200",
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

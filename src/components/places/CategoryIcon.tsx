import { Coffee, MapPin, Mountain, Utensils, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { PlaceListItem } from "@/types/place";

/**
 * 카테고리 표식.
 *
 * 사진이 없는 카드에서 **큰 무늬 자리를 대신하는 최소 표식**이다. 카테고리 이름은
 * 바로 옆에 글자로 함께 오므로 이 아이콘이 뜻을 혼자 나르지 않는다(DESIGN.md §6).
 * 화면의 다른 아이콘과 같은 선 굵기를 쓴다 — 일러스트 계열의 손그림 모티프를 여기
 * 끌어오면 UI 안에 두 벌의 선 언어가 생긴다.
 */
const CATEGORY_ICON: Record<PlaceListItem["category"], LucideIcon> = {
  cafe: Coffee,
  restaurant: Utensils,
  travel: Mountain,
  etc: MapPin,
};

export default function CategoryIcon({
  category,
  className,
}: {
  category: PlaceListItem["category"];
  className?: string;
}) {
  const Icon = CATEGORY_ICON[category];
  return (
    <Icon
      size={14}
      strokeWidth={2}
      className={cn("shrink-0 text-content-muted", className)}
      aria-hidden="true"
    />
  );
}

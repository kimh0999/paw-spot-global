"use server";

import { getCategoryPlaces } from "@/lib/places/queries";
import type { CategoryFilterValue, CategoryPlacesResult } from "@/types/place";

// 클라이언트에서 넘어온 값이므로 허용된 카테고리만 통과시킨다.
function parseCategoryFilter(value: string): CategoryFilterValue {
  if (value === "cafe" || value === "restaurant" || value === "travel") return value;
  return "all";
}

/** 홈 카테고리 탭을 바꿀 때 선택한 카테고리 카드만 서버에서 조회한다. */
export async function fetchCategoryPlaces(
  category: string,
): Promise<CategoryPlacesResult> {
  return getCategoryPlaces(parseCategoryFilter(category));
}

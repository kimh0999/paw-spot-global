"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Tabs } from "radix-ui";
import { ArrowRight } from "lucide-react";

import CategoryPlaceCard from "@/components/home/CategoryPlaceCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { fetchCategoryPlaces } from "@/lib/places/actions";
import { HOME_CATEGORY_PLACE_LIMIT } from "@/lib/places/constants";
import type { CategoryFilterValue, CategoryPlacesResult } from "@/types/place";

// MVP 탭 구성. 숙소·기타 카테고리는 포함하지 않는다.
const CATEGORY_TABS = ["all", "restaurant", "cafe", "travel"] as const satisfies readonly CategoryFilterValue[];

interface CategoryPlaceTabsProps {
  /** 서버에서 미리 조회한 `전체` 탭 결과 */
  initialResult: CategoryPlacesResult;
  favoritePlaceIds: string[];
  referenceDate: Date;
}

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-5 w-28 rounded-full" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-1.5 pt-1">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default function CategoryPlaceTabs({
  initialResult,
  favoritePlaceIds,
  referenceDate,
}: CategoryPlaceTabsProps) {
  const t = useTranslations("home.categories");

  const [category, setCategory] = useState<CategoryFilterValue>("all");
  // 이미 받아온 카테고리는 다시 조회하지 않는다.
  const [resultsByCategory, setResultsByCategory] = useState<
    Partial<Record<CategoryFilterValue, CategoryPlacesResult>>
  >({ all: initialResult });
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // 탭을 빠르게 바꿨을 때 늦게 도착한 응답이 현재 탭 상태를 덮지 않도록 마지막 요청을 기억한다.
  const latestRequest = useRef<CategoryFilterValue>("all");

  async function loadCategory(next: CategoryFilterValue) {
    setCategory(next);
    setHasError(false);
    latestRequest.current = next;
    if (resultsByCategory[next]) return;

    setIsLoading(true);
    try {
      const result = await fetchCategoryPlaces(next);
      setResultsByCategory((prev) => ({ ...prev, [next]: result }));
    } catch {
      if (latestRequest.current === next) setHasError(true);
    } finally {
      if (latestRequest.current === next) setIsLoading(false);
    }
  }

  const result = resultsByCategory[category];
  const places = result?.places ?? [];
  const favoriteIds = new Set(favoritePlaceIds);
  const viewAllHref = category === "all" ? "/places" : `/places?category=${category}`;
  // 탭 전환 중에도 그리드 높이가 크게 흔들리지 않도록 직전 카드 수만큼 skeleton을 깐다.
  const skeletonCount = places.length > 0 ? places.length : HOME_CATEGORY_PLACE_LIMIT;

  function renderContent() {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: skeletonCount }, (_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      );
    }

    if (hasError) {
      return (
        <div className="rounded-2xl border border-border bg-surface-subtle px-6 py-12 text-center">
          <p className="text-sm text-content-secondary">{t("error")}</p>
          <Button
            variant="outline"
            onClick={() => loadCategory(category)}
            className="mt-4 h-11 px-6"
          >
            {t("retry")}
          </Button>
        </div>
      );
    }

    if (places.length === 0) {
      return (
        <div className="rounded-2xl border border-border bg-surface-subtle px-6 py-12 text-center">
          <p className="text-sm text-content-secondary">{t("empty")}</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {places.map((place) => (
          <CategoryPlaceCard
            key={place.id}
            place={place}
            referenceDate={referenceDate}
            isFavorite={favoriteIds.has(place.id)}
          />
        ))}
      </div>
    );
  }

  return (
    <Tabs.Root
      value={category}
      onValueChange={(value) => {
        const next = CATEGORY_TABS.find((tab) => tab === value);
        if (next) loadCategory(next);
      }}
    >
      {/* 모바일에서는 줄바꿈 대신 가로 스크롤한다. 좌우 여백을 유지해 첫·마지막 탭이 잘리지 않는다. */}
      <div className="-mx-4 mt-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Tabs.List className="flex w-max gap-2">
          {CATEGORY_TABS.map((tab) => (
            <Tabs.Trigger
              key={tab}
              value={tab}
              className="h-11 rounded-full bg-surface-subtle px-4 text-sm font-medium text-content outline-none transition-colors hover:bg-border focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {t(`tabs.${tab}`)}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </div>

      <Tabs.Content value={category} className="outline-none">
        <div className="mb-4 mt-8 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-content">
            {t("recommended", { count: result?.totalCount ?? 0 })}
          </p>
          <Link
            href={viewAllHref}
            className="flex shrink-0 items-center gap-1 rounded text-sm font-semibold text-primary outline-none hover:text-primary-hover focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("viewAll")}
            <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>

        {renderContent()}
      </Tabs.Content>
    </Tabs.Root>
  );
}

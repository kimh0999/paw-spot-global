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

/**
 * 자리를 대신하는 요소와 같은 구조·크기·radius를 쓴다 (DESIGN.md §7 Initial loading).
 * 사진이 없는 카드가 기본형이라 사진 자리는 두지 않는다 — 두면 사진 없는 장소가
 * 도착할 때 띠 하나가 사라지며 카드가 흔들린다.
 */
function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface p-4">
      <Skeleton className="h-7 w-2/3 rounded-sm" />
      <Skeleton className="mt-1 h-4 w-3/4 rounded-sm" />
      <Skeleton className="mt-2.5 h-6 w-32 rounded-sm" />
      <div className="mt-3 space-y-1">
        <Skeleton className="h-5 w-2/3 rounded-sm" />
        <Skeleton className="h-5 w-1/2 rounded-sm" />
        <Skeleton className="h-5 w-3/5 rounded-sm" />
      </div>
      <Skeleton className="mt-6 h-4 w-40 rounded-sm" />
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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: skeletonCount }, (_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      );
    }

    if (hasError) {
      return (
        <div className="rounded-panel border border-border bg-surface px-6 py-12 text-center">
          <p className="text-sm text-content-secondary">{t("error")}</p>
          <Button
            variant="outline"
            onClick={() => loadCategory(category)}
            className="mt-4 h-11 border-border-control px-6 text-sm"
          >
            {t("retry")}
          </Button>
        </div>
      );
    }

    if (places.length === 0) {
      return (
        <div className="rounded-panel border border-dashed border-border-strong px-6 py-12 text-center">
          <p className="text-sm text-content-secondary">{t("empty")}</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
      {/*
        머리말 — 섹션 제목·확인된 장소 수·전체 보기를 한 덩어리로 읽는다. 셋이 탭과 카드
        사이에 층층이 쌓이면 검색에서 장소 결과까지 가는 길이 그만큼 길어진다(DESIGN.md §5 Home).

        개수는 고른 카테고리에 따라 바뀌는데 이 자리는 탭 패널 밖이라 패널 전환만으로는
        읽히지 않는다. 그래서 `aria-live`로 바뀐 값을 알린다.

        `전체 보기`는 제목이 아니라 **개수와 같은 줄**에 둔다. 제목 줄에 붙이면 영어처럼
        제목이 길어질 때 아래로 밀려 홀로 한 줄을 차지한다. 개수와 짝지으면 제목이 몇 줄이
        되든 머리말은 늘 `제목 / 개수 · 전체 보기` 두 줄이다.
      */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-content">{t("title")}</h2>
        <div className="mt-1 flex items-center justify-between gap-4">
          <p className="min-w-0 text-sm text-content-secondary" aria-live="polite">
            {t("verifiedCount", { count: result?.totalCount ?? 0 })}
          </p>
          <Link
            href={viewAllHref}
            className="-my-2 flex h-11 shrink-0 items-center gap-1 rounded-md text-sm font-semibold text-primary outline-none hover:text-primary-hover focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("viewAll")}
            <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* 모바일에서는 줄바꿈 대신 가로 스크롤한다. 좌우 여백을 유지해 첫·마지막 탭이 잘리지 않는다. */}
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Tabs.List className="flex w-max gap-2">
          {CATEGORY_TABS.map((tab) => (
            <Tabs.Trigger
              key={tab}
              value={tab}
              className="h-11 rounded-full border border-border-control bg-surface px-4 text-sm font-medium text-content outline-none transition-colors hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {t(`tabs.${tab}`)}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </div>

      <Tabs.Content value={category} className="mt-4 outline-none">
        {renderContent()}
      </Tabs.Content>
    </Tabs.Root>
  );
}

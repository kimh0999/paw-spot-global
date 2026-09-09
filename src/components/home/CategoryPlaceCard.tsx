"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import FavoriteButton from "@/components/places/FavoriteButton";
import PlaceConditionSummary from "@/components/places/PlaceConditionSummary";
import PlaceThumb from "@/components/places/PlaceThumb";
import VisitVerdict from "@/components/places/VisitVerdict";
import { Link } from "@/i18n/navigation";
import { displayPlaceName, isSupportedLocale } from "@/lib/i18n/locale";
import { getVisitStatus } from "@/lib/places/eligibility";
import type { PlaceListItem } from "@/types/place";

interface CategoryPlaceCardProps {
  place: PlaceListItem;
  referenceDate: Date;
  isFavorite?: boolean;
}

export default function CategoryPlaceCard({
  place,
  referenceDate,
  isFavorite = false,
}: CategoryPlaceCardProps) {
  const t = useTranslations("places");
  const rawLocale = useLocale();
  const locale = isSupportedLocale(rawLocale) ? rawLocale : "en";

  const { primary: placeName } = displayPlaceName(place, locale);
  const categoryLabel = t(`card.category.${place.category}`);
  // 판정은 공용 helper를 그대로 쓴다. 카드에서 조건을 다시 해석하지 않는다.
  const status = getVisitStatus(place, "all");
  // 등록된 주소가 실제 이미지가 아닐 수 있다. 불러오지 못하면 띠를 걷고 표식으로 되돌려
  // 카드가 빈 회색 면을 안은 채 다른 카드보다 길어지지 않게 한다.
  const [photoFailed, setPhotoFailed] = useState(false);
  const hasPhoto =
    place.thumbnailUrl != null && place.thumbnailUrl !== "" && !photoFailed;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface transition-colors hover:border-border-strong">
      {/* 카드 전체가 상세로 가는 링크다. 즐겨찾기 버튼은 이 오버레이 뒤에 두어 클릭이 겹치지 않게 한다. */}
      <Link
        href={`/places/${place.id}`}
        className="absolute inset-0 rounded-card outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <span className="sr-only">{t("card.openDetails", { name: placeName })}</span>
      </Link>

      {/* 사진이 있을 때만 미디어 띠를 만든다. 없는데 자리를 비워 두면 카드의 절반이
          빈 회색 면이 된다 — 대신 카테고리 표식을 이름 옆에 둔다. */}
      {hasPhoto && (
        <PlaceThumb
          category={place.category}
          src={place.thumbnailUrl}
          alt={placeName}
          variant="band"
          onLoadError={() => setPhotoFailed(true)}
        />
      )}

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-3">
          {!hasPhoto && (
            <PlaceThumb
              category={place.category}
              src={null}
              alt={placeName}
              variant="crest"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-content-secondary">
              {categoryLabel} · {place.address}
            </p>
            <h3 className="mt-0.5 text-base font-bold leading-snug text-content">
              {placeName}
            </h3>
          </div>
        </div>

        <VisitVerdict status={status} className="mt-3" />

        <PlaceConditionSummary
          place={place}
          referenceDate={referenceDate}
          className="mt-2.5"
        />
      </div>

      {/* 링크 오버레이보다 뒤에 배치해 위로 올라오게 한다 — 즐겨찾기 클릭이 상세 이동으로 이어지지 않는다. */}
      <div className="absolute right-3 top-3">
        <FavoriteButton
          placeId={place.id}
          initialFavorite={isFavorite}
          className="h-11 w-11 rounded-full border-border bg-surface"
        />
      </div>
    </article>
  );
}

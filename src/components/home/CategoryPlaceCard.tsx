"use client";

import { useLocale, useTranslations } from "next-intl";

import CategoryIcon from "@/components/places/CategoryIcon";
import FavoriteButton from "@/components/places/FavoriteButton";
import PlaceConditionSummary from "@/components/places/PlaceConditionSummary";
import PlaceThumb from "@/components/places/PlaceThumb";
import VisitVerdict from "@/components/places/VisitVerdict";
import { Link } from "@/i18n/navigation";
import { displayPlaceName, isSupportedLocale } from "@/lib/i18n/locale";
import { getVisitStatus } from "@/lib/places/eligibility";
import { hasUsablePhoto } from "@/lib/places/photo";
import type { PlaceListItem } from "@/types/place";

interface CategoryPlaceCardProps {
  place: PlaceListItem;
  referenceDate: Date;
  isFavorite?: boolean;
}

/**
 * 홈의 장소 카드.
 *
 * 가로형이다. 세로형 카드는 사진이 없으면 위쪽 절반이 비고, 3열 격자에서는 장소 수가
 * 3의 배수가 아닐 때 빈 칸이 남는다. 가로형 2열은 **개수와 무관하게** 줄이 차고,
 * 넓어진 폭 덕분에 조건 문장이 접히지 않는다.
 *
 * **사진이 없으면 사진 자리를 만들지 않는다.** 모든 장소에 같은 무늬 띠를 달면 카드의
 * 5분의 1이 장소를 구분하지 못하는 면적이 된다. 카테고리는 업종 이름 옆의 작은 표식이
 * 맡고, 카드의 완성도는 이름·판정·조건의 위계와 확인 기록을 나누는 가는 선이 만든다.
 *
 * 읽는 순서는 **장소명이 먼저다.** 업종·주소는 그 장소를 이미 알아본 다음에 필요한 정보다.
 */
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

  return (
    <article className="group relative flex h-full overflow-hidden rounded-card border border-border bg-surface transition-colors hover:border-border-strong">
      {/* 카드 전체가 상세로 가는 링크다. 즐겨찾기 버튼은 이 오버레이 뒤에 두어 클릭이 겹치지 않게 한다. */}
      <Link
        href={`/places/${place.id}`}
        className="absolute inset-0 rounded-card outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <span className="sr-only">{t("card.openDetails", { name: placeName })}</span>
      </Link>

      {/* 사진이 있을 때만 자리를 만든다. 없으면 폭 전부를 이름과 조건이 쓴다(§6 Place Thumb). */}
      {hasUsablePhoto(place.thumbnailUrl) && (
        <PlaceThumb
          category={place.category}
          src={place.thumbnailUrl}
          alt={placeName}
          attribution={place.imageAttribution}
          className="w-28 shrink-0 self-stretch sm:w-32"
        />
      )}

      <div className="min-w-0 flex-1 p-4">
        {/* 즐겨찾기 버튼은 카드 오른쪽 위에만 있다. 여백을 이름 묶음에만 주어 조건과 구분선이 폭 전부를 쓴다 */}
        <div className="pr-10">
          <h3 className="text-lg font-bold leading-snug tracking-tight text-content">
            {placeName}
          </h3>
          <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-content-secondary">
            <CategoryIcon category={place.category} />
            <span className="truncate">
              {categoryLabel} · {place.address}
            </span>
          </p>
        </div>

        <VisitVerdict status={status} className="mt-2.5" />

        <PlaceConditionSummary
          place={place}
          referenceDate={referenceDate}
          verificationDivider
          className="mt-3"
        />
      </div>

      {/* 링크 오버레이보다 뒤에 배치해 위로 올라오게 한다 — 즐겨찾기 클릭이 상세 이동으로 이어지지 않는다. */}
      <div className="absolute right-2 top-2">
        <FavoriteButton
          placeId={place.id}
          initialFavorite={isFavorite}
          className="h-11 w-11 rounded-full border-transparent bg-transparent hover:bg-surface-subtle"
        />
      </div>
    </article>
  );
}

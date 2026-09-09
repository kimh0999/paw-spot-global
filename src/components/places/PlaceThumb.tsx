"use client";

import { useState } from "react";
import Image from "next/image";
import { Coffee, Compass, MapPin, Utensils, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { PlaceListItem } from "@/types/place";

export const CATEGORY_ICONS: Record<PlaceListItem["category"], LucideIcon> = {
  cafe: Coffee,
  restaurant: Utensils,
  travel: Compass,
  etc: MapPin,
};

interface PlaceThumbProps {
  category: PlaceListItem["category"];
  /** 등록된 대표 이미지. 없거나 불러오지 못하면 카테고리 표식으로 대체한다. */
  src: string | null;
  /** 사진일 때의 대체 텍스트. 대체 표식에는 쓰지 않는다 — 그 표식은 장식이다. */
  alt: string;
  /** band는 카드 상단의 16:9 띠, crest는 목록·행에 붙는 정사각 표식이다. */
  variant: "band" | "crest";
  /**
   * 이미지를 끝내 불러오지 못했을 때 알린다.
   * 띠 자리를 잡을지 말지는 카드가 정하므로, 실패 사실을 카드에게 올려 준다.
   */
  onLoadError?: () => void;
  className?: string;
}

/**
 * 장소의 시각 식별자.
 *
 * 이 서비스에는 실제 장소 사진이 거의 없다. 그래서 사진을 **구조가 아니라 선택**으로 두고,
 * 없을 때는 빈 회색 자리 대신 카테고리 표식을 그린다. 표식은 사진인 척하지 않는다 —
 * 종이빛 면에 카테고리 아이콘 하나이며, 접근성 트리에서 제외한다.
 *
 * 이미지가 깨진 URL이면 `onError`로 같은 표식으로 되돌린다. 깨진 이미지 아이콘이나
 * alt 텍스트가 화면에 남지 않게 하기 위해서다.
 */
export default function PlaceThumb({
  category,
  src,
  alt,
  variant,
  onLoadError,
  className,
}: PlaceThumbProps) {
  const [failed, setFailed] = useState(false);
  const Icon = CATEGORY_ICONS[category];
  const showsPhoto = src != null && src !== "" && !failed;

  const shape =
    variant === "band"
      ? "aspect-[16/9] w-full rounded-t-card"
      : "h-12 w-12 shrink-0 rounded-panel";

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-surface-subtle",
        shape,
        className,
      )}
    >
      {showsPhoto ? (
        <Image
          src={src}
          alt={alt}
          fill
          unoptimized
          sizes={variant === "band" ? "(max-width: 1024px) 100vw, 400px" : "48px"}
          className="object-cover"
          onError={() => {
            setFailed(true);
            onLoadError?.();
          }}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center" aria-hidden="true">
          <Icon
            className={cn(
              "text-content-muted",
              variant === "band" ? "h-7 w-7" : "h-5 w-5",
            )}
            strokeWidth={1.5}
          />
        </span>
      )}
    </div>
  );
}

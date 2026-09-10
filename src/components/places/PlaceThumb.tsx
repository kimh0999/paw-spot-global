"use client";

import { useState } from "react";
import Image from "next/image";

import CategoryPattern from "@/components/brand/CategoryPattern";
import { hasUsablePhoto } from "@/lib/places/photo";
import { cn } from "@/lib/utils";
import type { PlaceListItem } from "@/types/place";

interface PlaceThumbProps {
  category: PlaceListItem["category"];
  /** 등록된 대표 이미지. `hasUsablePhoto`가 참일 때만 이 컴포넌트를 놓는다. */
  src: string | null;
  /** 사진의 대체 텍스트. 패턴에는 쓰지 않는다 — 그건 장식이다. */
  alt: string;
  className?: string;
}

/**
 * 장소 사진 자리.
 *
 * **사진이 있을 때만 놓는 자리다.** 사진이 없는 장소에 이 자리를 두면 모든 장소가
 * 같은 무늬 띠를 달게 되어, 장소를 구분하는 데 아무 도움이 안 되는 면적이 카드의
 * 5분의 1을 차지한다(DESIGN.md §6 Place Card). 사진이 없는 카드는 이 자리를
 * 만들지 않고 카테고리 표식만 쓴다.
 *
 * 자리를 만든 다음에는 **패턴이 먼저 있고 사진이 그 위에 얹힌다.** 요청이 오래 걸리든
 * 실패하든 빈 띠가 남지 않고, 사진은 실제로 그려진 뒤에 나타나므로 회색 사각형이
 * 깜빡이지 않는다. 실패해도 자리 크기는 그대로라 레이아웃이 뒤늦게 움직이지 않는다.
 */
export default function PlaceThumb({ category, src, alt, className }: PlaceThumbProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const showsPhoto = hasUsablePhoto(src) && !failed;

  return (
    <div className={cn("relative overflow-hidden bg-surface-subtle", className)}>
      <CategoryPattern category={category} className="absolute inset-0" />

      {showsPhoto && (
        <Image
          src={src}
          alt={alt}
          fill
          unoptimized
          sizes="(max-width: 640px) 100vw, 320px"
          className={cn(
            "object-cover transition-opacity duration-standard ease-standard motion-reduce:transition-none",
            loaded ? "opacity-100" : "opacity-0",
          )}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

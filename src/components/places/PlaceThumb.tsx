"use client";

import { useState } from "react";
import Image from "next/image";

import CategoryPattern from "@/components/brand/CategoryPattern";
import { cn } from "@/lib/utils";
import type { PlaceListItem } from "@/types/place";

/**
 * 명백한 예시 주소는 사진으로 치지 않는다.
 *
 * 시드·테스트 데이터에 `https://example.com`이 남아 있으면 요청이 응답도 실패도 하지 않고
 * 걸린 채로 남는다. 그러면 `onError`가 오지 않아 화면에는 빈 띠만 남는다.
 * 불러오기를 시도하기 전에 걸러 낸다.
 */
const PLACEHOLDER_HOSTS = new Set([
  "example.com",
  "www.example.com",
  "example.org",
  "example.net",
  "placeholder.com",
]);

function isUsablePhoto(src: string | null): src is string {
  if (!src) return false;
  try {
    const url = new URL(src, "http://localhost");
    return !PLACEHOLDER_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

interface PlaceThumbProps {
  category: PlaceListItem["category"];
  /** 등록된 대표 이미지. 없거나 불러오지 못하면 카테고리 패턴만 남는다. */
  src: string | null;
  /** 사진일 때의 대체 텍스트. 패턴에는 쓰지 않는다 — 그건 장식이다. */
  alt: string;
  /** 사진을 끝내 못 불러왔을 때 알린다. 자리를 유지할지는 카드가 정한다. */
  onLoadError?: () => void;
  className?: string;
}

/**
 * 장소의 시각 자리.
 *
 * **패턴이 먼저 있고 사진이 그 위에 얹힌다.** 요청이 오래 걸리든 실패하든 빈 띠가
 * 남지 않는다. 사진은 실제로 그려진 뒤에야 나타나므로 회색 사각형이 깜빡이지 않는다.
 */
export default function PlaceThumb({
  category,
  src,
  alt,
  onLoadError,
  className,
}: PlaceThumbProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const showsPhoto = isUsablePhoto(src) && !failed;

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
          onError={() => {
            setFailed(true);
            onLoadError?.();
          }}
        />
      )}
    </div>
  );
}

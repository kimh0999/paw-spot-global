"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";

import CategoryPattern from "@/components/brand/CategoryPattern";
import type { ImageAttributionDisplay } from "@/lib/places/image-attribution";
import { hasUsablePhoto } from "@/lib/places/photo";
import { cn } from "@/lib/utils";
import type { PlaceListItem } from "@/types/place";

/** 출처 문구 옆 외부 링크 표식. 본문과 같은 선 언어를 쓴다(DESIGN.md §6 Category Mark). */
const ICON_SIZE = 12;

interface PlaceThumbProps {
  category: PlaceListItem["category"];
  /** 등록된 대표 이미지. `hasUsablePhoto`가 참일 때만 이 컴포넌트를 놓는다. */
  src: string | null;
  /** 사진의 대체 텍스트. 패턴에는 쓰지 않는다 — 그건 장식이다. */
  alt: string;
  /**
   * 이미지에 붙는 출처(D-22). 조회가 이미 판정을 끝낸 값이라 여기서 다시 따지지 않는다 —
   * 근거가 없는 이미지는 `src`가 null로 내려와 이 컴포넌트가 놓이지도 않는다.
   */
  attribution?: ImageAttributionDisplay | null;
  /**
   * 출처를 어떻게 얹을지. 카드의 좁은 스트립(`overlay`)은 기관명만 얹고 전체 문구는
   * 링크의 접근 이름으로 나른다. 상세의 넓은 띠(`block`)는 문구를 그대로 읽힌다.
   */
  creditVariant?: "overlay" | "block";
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
 *
 * 출처가 붙는 이미지는 **카드와 상세가 이 컴포넌트 하나를 쓴다.** 두 화면이 각자
 * 출처를 그리면 한쪽만 빠뜨렸을 때 이용 조건을 지키지 못한 채 노출된다.
 */
export default function PlaceThumb({
  category,
  src,
  alt,
  attribution = null,
  creditVariant = "overlay",
  className,
}: PlaceThumbProps) {
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

      {/*
        사진이 실제로 그려졌을 때만 출처를 얹는다. 불러오지 못해 패턴만 남은 자리에
        출처가 떠 있으면 있지도 않은 사진의 출처를 말하는 것이 된다.
      */}
      {showsPhoto && loaded && attribution && (
        <PlaceImageCredit attribution={attribution} variant={creditVariant} />
      )}
    </div>
  );
}

/**
 * 이미지 출처 표시.
 *
 * 공공누리 네 유형은 모두 출처 표시를 요구하고, 온라인에서 링크를 걸 수 있으면
 * 링크를 제공해야 한다(https://www.kogl.or.kr/info/licenseType1.do).
 *
 * **확인된 값만 적는다.** 저작권자·작성연도·저작물명이 비어 있으면 그 자리를 비워 두고
 * 기관명으로 대신 채우지 않는다. 문구를 붙였다고 이용 조건을 충족했다고 보지 않으며,
 * 충족 여부 판단은 사람 검토(`PlaceImageAttribution.reviewedAt`)가 맡는다.
 *
 * 링크는 카드 전체를 덮는 오버레이의 **형제**로 놓인다 — `a` 안에 `a`가 생기지 않고,
 * 탭 순서에서도 사진 다음의 독립된 항목이 된다.
 */
function PlaceImageCredit({
  attribution,
  variant,
}: {
  attribution: ImageAttributionDisplay;
  variant: "overlay" | "block";
}) {
  const t = useTranslations("places.imageCredit");

  const parts: string[] = [];
  if (attribution.workTitle) parts.push(t("work", { title: attribution.workTitle }));
  parts.push(attribution.provider);
  if (attribution.createdYear != null) {
    parts.push(t("year", { year: String(attribution.createdYear) }));
  }
  if (attribution.copyrightHolder) {
    parts.push(t("author", { name: attribution.copyrightHolder }));
  }
  parts.push(t(`license.${attribution.licenseType}`));

  const full = `${t("label")}: ${parts.join(" · ")}`;

  if (variant === "block") {
    return (
      <div className="absolute inset-x-0 bottom-0 bg-overlay px-3 py-1.5">
        <p className="text-xs font-medium text-canvas">
          {full}{" "}
          <a
            href={attribution.sourceUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="relative z-10 inline-flex items-center gap-0.5 underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("sourceLink")}
            <ExternalLink size={ICON_SIZE} strokeWidth={2} aria-hidden="true" />
          </a>
        </p>
      </div>
    );
  }

  // 카드의 좁은 스트립. 기관명만 보이고 전체 문구는 링크의 접근 이름이 나른다.
  return (
    <a
      href={attribution.sourceUrl}
      target="_blank"
      rel="noopener noreferrer nofollow"
      aria-label={`${full} — ${t("sourceLink")}`}
      className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-0.5 bg-overlay px-1.5 py-1 text-xs font-medium text-canvas outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <span className="truncate">{attribution.provider}</span>
      <ExternalLink size={ICON_SIZE} strokeWidth={2} className="shrink-0" aria-hidden="true" />
    </a>
  );
}

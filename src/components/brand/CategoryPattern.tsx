"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";

import type { PlaceListItem } from "@/types/place";

type Category = PlaceListItem["category"];

/**
 * 사진이 없는 장소의 대체 표현.
 *
 * **매장 사진인 척하지 않는다.** 카테고리마다 다른 선 패턴 하나를 반복해 그리고,
 * 같은 카테고리의 장소는 **모두 같은 패턴**을 쓴다 — 장소를 구분하려고 가짜 외관이나
 * 근거 없는 분위기를 만들지 않기 위해서다. 구분은 이름·주소·조건이 한다.
 *
 * 패턴은 배경 위 낮은 대비의 선이라, 사진이 들어오면 자연스럽게 자리를 내준다.
 */
const MOTIF: Record<Category, { size: number; path: React.ReactNode }> = {
  // 컵과 김
  cafe: {
    size: 44,
    path: (
      <>
        <path d="M12 22 h14 a3 3 0 0 1 0 6 h-1" />
        <path d="M12 22 v7 a5 5 0 0 0 5 5 h4 a5 5 0 0 0 5 -5 v-7 z" />
        <path d="M16 15 q3 -3 0 -6 M21 15 q3 -3 0 -6" />
      </>
    ),
  },
  // 접시와 포크
  restaurant: {
    size: 44,
    path: (
      <>
        <circle cx="17" cy="22" r="9" />
        <circle cx="17" cy="22" r="4.5" />
        <path d="M32 12 v20 M29 12 v6 M35 12 v6" />
      </>
    ),
  },
  // 언덕과 길
  travel: {
    size: 48,
    path: (
      <>
        <path d="M4 32 q10 -14 20 -4 q9 9 20 -6" />
        <path d="M14 38 q10 -6 20 0" />
        <circle cx="36" cy="12" r="4" />
      </>
    ),
  },
  // 핀
  etc: {
    size: 44,
    path: (
      <>
        <path d="M22 10 a8 8 0 0 0 -8 8 c0 6 8 14 8 14 s8 -8 8 -14 a8 8 0 0 0 -8 -8 z" />
        <circle cx="22" cy="18" r="3" />
      </>
    ),
  },
};

interface CategoryPatternProps {
  category: Category;
  className?: string;
}

export default function CategoryPattern({ category, className }: CategoryPatternProps) {
  // 같은 카테고리 카드가 여러 장 있어도 pattern id가 겹치지 않게 한다.
  const patternId = useId();
  const motif = MOTIF[category];

  return (
    <svg
      role="presentation"
      aria-hidden="true"
      focusable="false"
      className={cn("h-full w-full", className)}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern
          id={patternId}
          width={motif.size}
          height={motif.size}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-12)"
        >
          <g
            className="fill-none stroke-content"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.16"
          >
            {motif.path}
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" className="fill-surface-subtle" />
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}

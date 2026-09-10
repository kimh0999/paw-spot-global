import { cn } from "@/lib/utils";

/**
 * 브랜드 마크. 지도 핀 안에 발자국을 넣어 **장소**와 **반려견**을 한 형태로 묶는다.
 * lucide의 일반 발바닥 아이콘 대신 서비스 고유 형태를 쓴다 — 로고는 아이콘이 아니다.
 *
 * 색은 `currentColor`를 따르므로 놓이는 자리의 텍스트 색을 그대로 쓴다.
 */
export default function PawSpotMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="presentation"
      aria-hidden="true"
      focusable="false"
      className={cn("h-full w-full", className)}
    >
      <path
        d="M12 2.4c-4 0-7.2 3.1-7.2 7 0 5.2 7.2 12.2 7.2 12.2s7.2-7 7.2-12.2c0-3.9-3.2-7-7.2-7z"
        fill="currentColor"
      />
      {/* 발바닥 — 핀 안쪽을 뚫어 배경이 비치게 한다 */}
      <g className="fill-surface">
        <ellipse cx="12" cy="11.6" rx="3.1" ry="2.6" />
        <circle cx="8.5" cy="7.9" r="1.35" />
        <circle cx="11.2" cy="6.7" r="1.35" />
        <circle cx="14.1" cy="7.2" r="1.35" />
        <circle cx="16.1" cy="9.6" r="1.2" />
      </g>
    </svg>
  );
}

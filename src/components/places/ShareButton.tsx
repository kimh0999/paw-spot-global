"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Share2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

interface ShareButtonProps {
  /** 공유할 정규 경로. 예: `/ko/places/abc`. 쿼리를 붙이지 않는다. */
  path: string;
  /** 공유 카드에 뜰 제목. 장소명을 넘긴다. */
  title: string;
  className?: string;
}

/**
 * 장소 상세를 공유한다.
 *
 * **현재 주소를 그대로 공유하지 않는다.** 목록에서 들어오면 주소에 `lat`·`lng`(사용자의
 * 실제 좌표)가 붙어 있는데, 그대로 공유하면 받는 사람에게 공유자의 위치가 넘어간다.
 * 그래서 서버가 만들어 준 정규 경로만 절대 URL로 바꿔 쓴다.
 *
 * `navigator.share`가 있으면 OS 공유 시트를, 없으면 클립보드에 복사하고 토스트로 알린다.
 */
export default function ShareButton({ path, title, className }: ShareButtonProps) {
  const t = useTranslations("places.detail.actions");
  const [isSharing, setIsSharing] = useState(false);

  async function handleShare() {
    if (isSharing) return;
    setIsSharing(true);

    const url = new URL(path, window.location.origin).toString();

    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success(t("shareCopied"));
    } catch (error) {
      // 사용자가 공유 시트를 닫은 것은 실패가 아니다. 조용히 지나간다.
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(t("shareFailed"));
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={isSharing}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-1.5 rounded-lg border border-border-control bg-surface px-4 text-sm font-semibold text-content outline-none transition-colors hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
        className,
      )}
    >
      <Share2 className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
      {t("share")}
    </button>
  );
}

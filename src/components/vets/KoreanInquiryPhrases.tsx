"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Copy, Maximize2 } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VET_INQUIRY_PHRASES, buildInquiryClipboardText } from "@/lib/vets/inquiry";

/**
 * 검수한 고정 한국어 문의 문구 (계획서 §2-B, P0).
 *
 * **한국어가 주(主)이고 영어는 뜻이다.** 한국어는 병원에 보여 주거나 읽어 줄 문장이라
 * 크게, 영어는 사용자가 뜻을 아는 용도라 작게 둔다. 영어 UI에서도 한국어를 번역하지 않는다.
 *
 * 모델을 부르지 않으므로 실패할 것이 없고, 전화 버튼은 이 상자와 무관하게 항상 먼저 쓸 수 있다.
 * 자유 입력 번역은 P1이며 여기 넣지 않는다.
 */
export default function KoreanInquiryPhrases() {
  const t = useTranslations("vets.inquiry");
  const [enlarged, setEnlarged] = useState(false);

  async function handleCopyAll() {
    try {
      await navigator.clipboard.writeText(buildInquiryClipboardText());
      toast.success(t("copied"));
    } catch {
      // 조용히 넘기면 복사된 줄 알고 붙여넣기를 시도하게 된다.
      toast.error(t("copyFailed"));
    }
  }

  return (
    <section className="rounded-card border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-content">{t("title")}</h2>
          <p className="mt-1 text-xs text-content-secondary">{t("description")}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setEnlarged(true)}
            className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-border-control bg-surface px-3 text-sm font-semibold text-content outline-none transition-colors hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Maximize2 size={16} strokeWidth={2} aria-hidden="true" />
            {t("enlarge")}
          </button>
          <button
            type="button"
            onClick={handleCopyAll}
            className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-border-control bg-surface px-3 text-sm font-semibold text-content outline-none transition-colors hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Copy size={16} strokeWidth={2} aria-hidden="true" />
            {t("copyAll")}
          </button>
        </div>
      </div>

      <ul className="mt-4 space-y-3">
        {VET_INQUIRY_PHRASES.map((phrase) => (
          <li key={phrase.id} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
            <p lang="ko" className="text-base font-semibold leading-relaxed text-content">
              {phrase.ko}
            </p>
            <p lang="en" className="mt-0.5 text-xs text-content-secondary">
              {phrase.en}
            </p>
          </li>
        ))}
      </ul>

      {/* 확대 보기 — 전화 중 화면을 병원 쪽으로 돌려 보여 주는 용도라 한국어만 크게 낸다. */}
      <Dialog open={enlarged} onOpenChange={setEnlarged}>
        {/*
          기본 닫기 버튼은 sr-only 라벨이 "Close"로 고정돼 있어 한국어 화면에서 읽히지 않는다.
          끄고 아래에 번역된 닫기 버튼을 둔다.
        */}
        <DialogContent className="max-w-lg" showCloseButton={false}>
          <DialogTitle>{t("enlargedTitle")}</DialogTitle>
          <ul className="mt-2 space-y-5">
            {VET_INQUIRY_PHRASES.map((phrase) => (
              <li key={phrase.id}>
                <p lang="ko" className="text-2xl font-bold leading-snug text-content">
                  {phrase.ko}
                </p>
                <p lang="en" className="mt-1 text-sm text-content-secondary">
                  {phrase.en}
                </p>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setEnlarged(false)}
            className="mt-6 h-11 w-full rounded-lg border border-border-control bg-surface text-sm font-semibold text-content outline-none transition-colors hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("close")}
          </button>
        </DialogContent>
      </Dialog>
    </section>
  );
}

"use client";

import { useState } from "react";

import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

const INQUIRY_TEMPLATE = `안녕하세요. 반려견 동반 가능 여부를 확인하고 싶습니다.

1. 실내 공간에도 반려견이 들어갈 수 있나요?
2. 목줄만 착용하면 입장 가능한가요?
3. 소형견, 중형견, 대형견 제한이 있나요?
4. 특정 견종 제한이 있나요?

감사합니다.`;

export default function KoreanInquiryBox() {
  const t = useTranslations("places.detail.koreanInquiry");
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(INQUIRY_TEMPLATE);
      toast.success(t("copied"));
    } catch {
      // Clipboard API unavailable (e.g., non-HTTPS context)
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-surface rounded-2xl border shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b">
        <h2 className="text-sm font-semibold text-content">{t("title")}</h2>
        <p className="text-xs text-content-secondary mt-0.5">{t("description")}</p>
      </div>
      <div className="px-5 py-4 space-y-3">
        <pre className="text-sm text-content leading-relaxed whitespace-pre-wrap font-sans bg-surface-subtle rounded-xl p-4">
          {INQUIRY_TEMPLATE}
        </pre>
        <Button
          type="button"
          variant="outline"
          onClick={handleCopy}
          aria-label={t("copy")}
          className="w-full"
        >
          {copied ? t("copied") : t("copy")}
        </Button>
      </div>
    </div>
  );
}

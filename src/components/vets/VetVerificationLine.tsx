"use client";

import { useFormatter, useTranslations } from "next-intl";
import { History } from "lucide-react";

import { cn } from "@/lib/utils";
import type { VetItemState } from "@/lib/vets/verification";
import { safeHttpUrl } from "@/lib/validation/url";

/**
 * 항목 하나의 확인 근거 한 줄 (D-17·D-18).
 *
 * 네 가지를 서로 다른 말로 구분한다.
 * - 확인됨: 확인일과 방법
 * - 재확인 필요: 확인일은 남기고 기한이 지났음을 함께 말한다 — 이력을 지우지 않는다
 * - 값이 바뀜: "정보가 바뀐 뒤 아직 확인하지 않았다". 옛 확인일을 보여주면 새 값이
 *   확인된 것처럼 읽히므로 날짜를 내지 않는다
 * - 기록 없음
 */
interface Props {
  item: VetItemState;
  /** 항목 이름. 상세에서는 어떤 항목의 근거인지 밝힌다. */
  label?: string;
  className?: string;
}

export default function VetVerificationLine({ item, label, className }: Props) {
  const t = useTranslations("vets.verification");
  const format = useFormatter();

  const prefix = label ? `${label} · ` : "";

  if (item.staleByValueChange) {
    return (
      <p className={cn("text-xs text-warning", className)}>
        {prefix}
        {t("valueChanged")}
      </p>
    );
  }

  if (!item.evidence) {
    return (
      <p className={cn("text-xs text-content-muted", className)}>
        {prefix}
        {t("none")}
      </p>
    );
  }

  const date = format.dateTime(item.evidence.verifiedAt, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const method = t(`method.${item.evidence.method}`);
  // 출처 링크도 저장된 값을 그대로 쓴다. http/https가 아니면 링크를 만들지 않는다.
  const sourceHref = safeHttpUrl(item.evidence.sourceUrl);

  return (
    <p
      className={cn(
        "flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs",
        item.needsRecheck ? "text-warning" : "text-content-muted",
        className,
      )}
    >
      {item.needsRecheck && <History size={12} className="shrink-0" aria-hidden="true" />}
      <span>
        {prefix}
        {t("confirmedOn", { date })} · {method}
      </span>
      {item.needsRecheck && <span>· {t("needsRecheck")}</span>}
      {sourceHref && (
        <a
          href={sourceHref}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-sm underline outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t("source")}
        </a>
      )}
    </p>
  );
}

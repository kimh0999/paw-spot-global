"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Copy, MapPin, Phone } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * 전화·지도·주소 복사.
 *
 * **로그인도 반려견 등록도 문구 작성도 요구하지 않는다**(계획서 §2-B). 비회원이 목록에서
 * 바로 누를 수 있어야 하므로 이 컴포넌트는 세션을 읽지 않는다.
 *
 * 지도는 Google Maps URLs를 쓴다 — **API 키가 필요 없고** 임베드 설정과 무관하게 열린다.
 * 좌표가 있으면 좌표로, 없으면 이름+주소 검색으로 연다. 좌표가 없다고 이동 수단을 없애지 않는다.
 */

interface Props {
  name: string;
  phone: string;
  address: string;
  location: { lat: number; lng: number } | null;
  /** 목록 카드는 compact, 상세 하단 바는 full */
  size?: "compact" | "full";
  className?: string;
}

export function buildMapUrl(
  name: string,
  address: string,
  location: { lat: number; lng: number } | null,
): string {
  if (location) {
    return `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address}`)}`;
}

/** `tel:` 대상에서 사람이 읽기 위한 문자만 걸러낸다. `+`는 국가번호라 남긴다. */
export function buildTelHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export default function VetContactActions({
  name,
  phone,
  address,
  location,
  size = "compact",
  className,
}: Props) {
  const t = useTranslations("vets.card");

  async function handleCopyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      toast.success(t("addressCopied"));
    } catch {
      // HTTPS가 아니거나 권한이 없으면 Clipboard API가 실패한다. 조용히 넘기지 않는다 —
      // 사용자는 복사된 줄 알고 붙여넣기를 시도하게 된다.
      toast.error(t("copyFailed"));
    }
  }

  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring";
  const height = size === "full" ? "h-12 flex-1 text-sm" : "h-11 px-3 text-sm";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <a
        href={buildTelHref(phone)}
        aria-label={t("callAria", { name })}
        className={cn(base, height, "bg-primary text-primary-foreground hover:bg-primary-hover")}
      >
        <Phone size={16} strokeWidth={2} aria-hidden="true" />
        {t("call")}
      </a>

      <a
        href={buildMapUrl(name, address, location)}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          base,
          height,
          "border border-border-control bg-surface text-content hover:bg-surface-subtle",
        )}
      >
        <MapPin size={16} strokeWidth={2} aria-hidden="true" />
        {t("directions")}
      </a>

      <button
        type="button"
        onClick={handleCopyAddress}
        aria-label={t("copyAddress")}
        className={cn(
          base,
          size === "full" ? "h-12 w-12" : "h-11 w-11",
          "shrink-0 border border-border-control bg-surface text-content hover:bg-surface-subtle",
        )}
      >
        <Copy size={16} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}

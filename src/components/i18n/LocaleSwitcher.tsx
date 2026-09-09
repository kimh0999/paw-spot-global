"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { useRouter, usePathname } from "@/i18n/navigation";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("header");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function switchLocale(nextLocale: SupportedLocale) {
    if (nextLocale === locale) return;
    // 목록의 카테고리·필터·정렬·선택한 장소는 주소에만 있다. 언어만 바꾸고 탐색 상태는 지킨다.
    const query = searchParams.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { locale: nextLocale });
  }

  return (
    <div
      role="group"
      aria-label={t("language")}
      className="flex items-center rounded-full bg-surface-subtle p-0.5"
    >
      {SUPPORTED_LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchLocale(l)}
          aria-pressed={locale === l}
          className={cn(
            // 보이는 크기는 작지만 조작 영역은 44px을 채운다 (DESIGN.md §6).
            "flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
            locale === l
              ? "bg-surface text-content"
              : "text-content-secondary hover:text-content",
          )}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

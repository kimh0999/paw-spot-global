"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/constants";

export default function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: SupportedLocale) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="flex items-center gap-1 bg-surface-subtle rounded-full p-1 shrink-0">
      {SUPPORTED_LOCALES.map((l) => (
        <button
          key={l}
          onClick={() => switchLocale(l)}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            locale === l
              ? "bg-surface text-content shadow-sm"
              : "text-content-secondary hover:text-content"
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

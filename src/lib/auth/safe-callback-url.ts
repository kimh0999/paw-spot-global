import { DEFAULT_LOCALE, type SupportedLocale } from "@/lib/constants";

export function getDefaultAdminPath(locale: SupportedLocale): string {
  return `/${locale}/admin/places`;
}

export function getSafeCallbackUrl(
  value: unknown,
  locale: SupportedLocale = DEFAULT_LOCALE,
  fallback = getDefaultAdminPath(locale),
): string {
  if (typeof value !== "string" || value !== value.trim()) {
    return fallback;
  }

  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    value.includes("://") ||
    /%(?:2f|5c)/i.test(value) ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(value, "https://paw-spot.internal");
    const localePrefix = `/${locale}`;

    if (
      parsed.origin !== "https://paw-spot.internal" ||
      (parsed.pathname !== localePrefix &&
        !parsed.pathname.startsWith(`${localePrefix}/`))
    ) {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

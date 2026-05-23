import { SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/constants";

export function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function displayPlaceName(
  place: { nameKr: string; nameEn?: string | null },
  locale: SupportedLocale,
): { primary: string; secondary?: string } {
  if (locale === "en") {
    return {
      primary: place.nameEn || place.nameKr,
      secondary: place.nameEn ? place.nameKr : undefined,
    };
  }
  return {
    primary: place.nameKr,
    secondary: place.nameEn || undefined,
  };
}

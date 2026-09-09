"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { LoaderCircle, Navigation, Search } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { navigateToNearbyPlaces } from "@/lib/location/navigation";

export default function HeroActions() {
  const t = useTranslations("home.hero");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isLocating, setIsLocating] = useState(false);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/places?q=${encodeURIComponent(query.trim())}`);
  }

  function handleMyLocation() {
    navigateToNearbyPlaces(
      router,
      () => setIsLocating(true),
      () => setIsLocating(false),
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <form onSubmit={handleSearch} className="flex min-w-0 flex-1 gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            size={18}
            strokeWidth={2}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-content-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchLabel")}
            className="h-12 w-full rounded-lg border border-border-control bg-surface pl-11 pr-4 text-base text-content outline-none transition-colors placeholder:text-content-muted focus:border-primary focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="submit"
          className="h-12 shrink-0 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground outline-none transition-colors hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {t("searchButton")}
        </button>
      </form>

      <button
        type="button"
        onClick={handleMyLocation}
        disabled={isLocating}
        className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg border border-border-control bg-surface px-4 text-sm font-semibold text-content outline-none transition-colors hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLocating ? (
          <LoaderCircle
            className="h-5 w-5 animate-spin motion-reduce:animate-none"
            strokeWidth={2}
            aria-hidden="true"
          />
        ) : (
          <Navigation className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
        )}
        {t("myLocation")}
      </button>
    </div>
  );
}

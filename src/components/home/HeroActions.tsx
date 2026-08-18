"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { LoaderCircle, MapPin } from "lucide-react";
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
    <>
      <form onSubmit={handleSearch} className="flex gap-2 max-w-xl mx-auto mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="flex-1 px-4 py-3 border border-strong rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary placeholder:text-content-muted"
        />
        <button
          type="submit"
          className="px-5 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary-hover active:bg-primary transition-colors shrink-0"
        >
          {t("searchButton")}
        </button>
      </form>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleMyLocation}
          disabled={isLocating}
          className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-primary text-primary bg-surface rounded-xl text-sm font-medium hover:bg-primary-soft transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLocating ? (
            <LoaderCircle className="w-5 h-5 animate-spin" strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <MapPin className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
          )}
          {t("myLocation")}
        </button>
      </div>
    </>
  );
}

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { PlaceCategory } from "@/types/place";

const QUICK_CATEGORIES: { icon: string; labelKey: "quickCafe" | "quickRestaurant" | "quickTravel"; category: PlaceCategory }[] = [
  { icon: "☕", labelKey: "quickCafe", category: "cafe" },
  { icon: "🍽️", labelKey: "quickRestaurant", category: "restaurant" },
  { icon: "🌿", labelKey: "quickTravel", category: "travel" },
];

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

  function handleCategory(category: PlaceCategory) {
    router.push(`/places?category=${category}`);
  }

  function handleMyLocation() {
    if (!navigator.geolocation) {
      router.push("/places");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setIsLocating(false);
        router.push(
          `/places?lat=${coords.latitude}&lng=${coords.longitude}&sort=distance`,
        );
      },
      () => {
        setIsLocating(false);
        router.push("/places");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
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
          className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        />
        <button
          type="submit"
          className="px-5 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 active:bg-orange-700 transition-colors shrink-0"
        >
          {t("searchButton")}
        </button>
      </form>

      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={handleMyLocation}
          disabled={isLocating}
          className="px-5 py-2.5 border-2 border-orange-200 text-orange-700 bg-white rounded-xl text-sm font-medium hover:bg-orange-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLocating ? "⏳" : "📍"} {t("myLocation")}
        </button>
        {QUICK_CATEGORIES.map(({ icon, labelKey, category }) => (
          <button
            key={category}
            type="button"
            onClick={() => handleCategory(category)}
            className="px-5 py-2.5 border-2 border-orange-200 text-orange-700 bg-white rounded-xl text-sm font-medium hover:bg-orange-50 transition-colors"
          >
            {icon} {t(labelKey)}
          </button>
        ))}
      </div>
    </>
  );
}

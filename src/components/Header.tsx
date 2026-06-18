"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import LocaleSwitcher from "@/components/i18n/LocaleSwitcher";
import { navigateToNearbyPlaces } from "@/lib/location/navigation";

export default function Header() {
  const t = useTranslations("header");
  const router = useRouter();
  const [isLocating, setIsLocating] = useState(false);

  function handleNearMe() {
    navigateToNearbyPlaces(
      router,
      () => setIsLocating(true),
      () => setIsLocating(false),
    );
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-8">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl">🐾</span>
            <span className="font-bold text-gray-900 text-base">Paw Spot Global</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/places"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              {t("places")}
            </Link>

            <button
              type="button"
              onClick={handleNearMe}
              disabled={isLocating}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLocating ? "⏳" : "📍"} {t("nearMe")}
            </button>

            <span
              className="flex items-center gap-1.5 text-sm font-medium text-gray-400 cursor-not-allowed select-none"
              aria-disabled="true"
            >
              {t("myDog")}
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                {t("comingSoon")}
              </span>
            </span>

            <span
              className="flex items-center gap-1.5 text-sm font-medium text-gray-400 cursor-not-allowed select-none"
              aria-disabled="true"
            >
              {t("vets")}
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                {t("comingSoon")}
              </span>
            </span>
          </nav>

          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}

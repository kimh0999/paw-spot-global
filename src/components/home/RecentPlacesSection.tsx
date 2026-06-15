import { getTranslations } from "next-intl/server";

import HomePlaceCard from "@/components/home/HomePlaceCard";
import { Link } from "@/i18n/navigation";
import type { HomePlaceItem } from "@/types/place";

interface RecentPlacesSectionProps {
  places: HomePlaceItem[];
}

export default async function RecentPlacesSection({
  places,
}: RecentPlacesSectionProps) {
  const t = await getTranslations("home.recentPlaces");

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">{t("title")}</h2>
          <p className="mt-2 text-sm text-gray-500">{t("description")}</p>
        </div>

        {places.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {places.map((place) => (
              <HomePlaceCard key={place.id} place={place} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-12 text-center">
            <p className="text-sm text-gray-500">{t("empty")}</p>
          </div>
        )}

        <div className="flex justify-center mt-10">
          <Link
            href="/places"
            className="px-8 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 active:bg-orange-700 transition-colors"
          >
            {t("viewAll")}
          </Link>
        </div>
      </div>
    </section>
  );
}

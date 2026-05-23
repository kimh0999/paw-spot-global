import { getTranslations } from "next-intl/server";

export default async function HeroSection() {
  const t = await getTranslations("home.hero");

  const quickButtons = [
    { icon: "☕", label: t("quickCafe") },
    { icon: "🍽️", label: t("quickRestaurant") },
    { icon: "🌿", label: t("quickTravel") },
    { icon: "🏥", label: t("quickVet") },
  ];

  return (
    <section className="bg-gradient-to-b from-orange-50 via-amber-50 to-white pt-16 pb-14">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-5">
          {t("titleLine1")}
          <br />
          {t("titleLine2")}
        </h1>
        <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-10">
          {t("subtitleLine1")}
          <br className="hidden sm:block" />
          {t("subtitleLine2")}
          <br className="hidden sm:block" />
          {t("subtitleLine3")}
        </p>

        {/* Illustration */}
        <div className="flex justify-center mb-10">
          <div className="w-64 h-44 bg-white rounded-3xl shadow-md border border-orange-100 flex flex-col items-center justify-center gap-2">
            <div className="flex items-end gap-2">
              <span className="text-5xl">🐕</span>
              <span className="text-4xl mb-1">🗺️</span>
            </div>
            <p className="text-sm text-gray-400 font-medium">{t("illustrationCaption")}</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-2 max-w-xl mx-auto mb-6">
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
          <button className="px-5 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 active:bg-orange-700 transition-colors shrink-0">
            {t("searchButton")}
          </button>
        </div>

        {/* Quick buttons */}
        <div className="flex flex-wrap justify-center gap-2">
          {quickButtons.map(({ icon, label }) => (
            <button
              key={label}
              className="px-5 py-2.5 border-2 border-orange-200 text-orange-700 bg-white rounded-xl text-sm font-medium hover:bg-orange-50 transition-colors"
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

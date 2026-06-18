import { getTranslations } from "next-intl/server";
import HeroActions from "@/components/home/HeroActions";

export default async function HeroSection() {
  const t = await getTranslations("home.hero");

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

        <div className="flex justify-center mb-10">
          <div className="w-64 h-44 bg-white rounded-3xl shadow-md border border-orange-100 flex flex-col items-center justify-center gap-2">
            <div className="flex items-end gap-2">
              <span className="text-5xl">🐕</span>
              <span className="text-4xl mb-1">🗺️</span>
            </div>
            <p className="text-sm text-gray-400 font-medium">{t("illustrationCaption")}</p>
          </div>
        </div>

        <HeroActions />
      </div>
    </section>
  );
}

import { getTranslations } from "next-intl/server";
import { Dog, Map } from "lucide-react";
import HeroActions from "@/components/home/HeroActions";

export default async function HeroSection() {
  const t = await getTranslations("home.hero");

  return (
    <section className="bg-surface pt-16 pb-14">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-content leading-tight mb-5">
          {t("titleLine1")}
          <br />
          {t("titleLine2")}
        </h1>
        <p className="text-base sm:text-lg text-content-secondary leading-relaxed mb-10">
          {t("subtitleLine1")}
          <br className="hidden sm:block" />
          {t("subtitleLine2")}
          <br className="hidden sm:block" />
          {t("subtitleLine3")}
        </p>

        <div className="flex justify-center mb-10">
          <div className="w-64 h-44 bg-surface rounded-3xl shadow-md border border-primary flex flex-col items-center justify-center gap-2">
            <div className="flex items-end gap-3">
              <Dog className="w-6 h-6 text-primary" strokeWidth={1.5} aria-hidden="true" />
              <Map className="w-6 h-6 text-primary" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <p className="text-sm text-content-muted font-medium">{t("illustrationCaption")}</p>
          </div>
        </div>

        <HeroActions />
      </div>
    </section>
  );
}

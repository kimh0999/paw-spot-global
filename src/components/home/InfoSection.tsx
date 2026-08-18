import { getTranslations } from "next-intl/server";
import {
  Home,
  Luggage,
  Ruler,
  TriangleAlert,
  CalendarCheck,
  type LucideIcon,
} from "lucide-react";

export default async function InfoSection() {
  const t = await getTranslations("home.info");

  const infoItems: Array<{ icon: LucideIcon; title: string; description: string }> = [
    { icon: Home, title: t("indoor.title"), description: t("indoor.description") },
    { icon: Luggage, title: t("carrier.title"), description: t("carrier.description") },
    { icon: Ruler, title: t("size.title"), description: t("size.description") },
    { icon: TriangleAlert, title: t("requirements.title"), description: t("requirements.description") },
    { icon: CalendarCheck, title: t("lastVerified.title"), description: t("lastVerified.description") },
  ];

  return (
    <section className="py-16 bg-surface-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-content mb-8">
          {t("title")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {infoItems.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="bg-surface rounded-2xl p-6 border border-border hover:border-primary transition-colors"
            >
              <Icon
                className="w-5 h-5 mb-3 text-primary"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <h3 className="text-base font-semibold text-content mb-1">
                {title}
              </h3>
              <p className="text-sm text-content-secondary leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

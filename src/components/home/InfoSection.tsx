import { getTranslations } from "next-intl/server";

export default async function InfoSection() {
  const t = await getTranslations("home.info");

  const infoItems = [
    { icon: "🏠", title: t("indoor.title"), description: t("indoor.description") },
    { icon: "🧳", title: t("carrier.title"), description: t("carrier.description") },
    { icon: "📏", title: t("size.title"), description: t("size.description") },
    { icon: "⚠️", title: t("requirements.title"), description: t("requirements.description") },
    { icon: "📅", title: t("lastVerified.title"), description: t("lastVerified.description") },
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">
          {t("title")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {infoItems.map((item) => (
            <div
              key={item.title}
              className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-orange-200 transition-colors"
            >
              <div className="text-2xl mb-3">{item.icon}</div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                {item.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

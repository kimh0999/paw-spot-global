import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function CategorySection() {
  const t = await getTranslations("home.categories");

  const categories = [
    {
      icon: "☕",
      title: t("cafe.title"),
      description: t("cafe.description"),
      href: "/places?category=cafe",
      label: t("cafe.label"),
    },
    {
      icon: "🍽️",
      title: t("restaurant.title"),
      description: t("restaurant.description"),
      href: "/places?category=restaurant",
      label: t("restaurant.label"),
    },
    {
      icon: "🌿",
      title: t("travel.title"),
      description: t("travel.description"),
      href: "/places?category=travel",
      label: t("travel.label"),
    },
    {
      icon: "🏥",
      title: t("vet.title"),
      description: t("vet.description"),
      href: "/vets",
      label: t("vet.label"),
    },
  ];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">
          {t("title")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.title}
              className="bg-gray-50 rounded-2xl p-6 hover:bg-orange-50 transition-colors group"
            >
              <div className="text-3xl mb-3">{cat.icon}</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {cat.title}
              </h3>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                {cat.description}
              </p>
              <Link
                href={cat.href}
                className="text-sm font-semibold text-orange-600 group-hover:text-orange-700 transition-colors"
              >
                {cat.label} →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

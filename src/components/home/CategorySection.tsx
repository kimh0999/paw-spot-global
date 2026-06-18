import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type CategoryItem =
  | { icon: string; title: string; description: string; href: string; label: string; bg: string; comingSoon?: false }
  | { icon: string; title: string; description: string; comingSoon: true };

export default async function CategorySection() {
  const t = await getTranslations("home.categories");

  const categories: CategoryItem[] = [
    {
      icon: "☕",
      title: t("cafe.title"),
      description: t("cafe.description"),
      href: "/places?category=cafe",
      label: t("cafe.label"),
      bg: "bg-amber-50 hover:bg-amber-100",
    },
    {
      icon: "🍽️",
      title: t("restaurant.title"),
      description: t("restaurant.description"),
      href: "/places?category=restaurant",
      label: t("restaurant.label"),
      bg: "bg-orange-50 hover:bg-orange-100",
    },
    {
      icon: "🌿",
      title: t("travel.title"),
      description: t("travel.description"),
      href: "/places?category=travel",
      label: t("travel.label"),
      bg: "bg-green-50 hover:bg-green-100",
    },
    {
      icon: "🏥",
      title: t("vet.title"),
      description: t("vet.description"),
      comingSoon: true,
    },
  ];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">
          {t("title")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat) =>
            cat.comingSoon ? (
              <div
                key={cat.title}
                className="bg-gray-50 rounded-2xl p-6 opacity-50 cursor-not-allowed"
              >
                <div className="text-3xl mb-3">{cat.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {cat.title}
                </h3>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                  {cat.description}
                </p>
                <span className="text-sm font-semibold text-gray-400">
                  {t("comingSoon")}
                </span>
              </div>
            ) : (
              <div
                key={cat.title}
                className={`${cat.bg} rounded-2xl p-6 transition-colors group`}
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
            )
          )}
        </div>
      </div>
    </section>
  );
}

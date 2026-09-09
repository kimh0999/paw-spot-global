import { getTranslations } from "next-intl/server";
import {
  CalendarCheck,
  DoorOpen,
  Ruler,
  ShoppingBag,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

export default async function InfoSection() {
  const t = await getTranslations("home.info");

  const infoItems: Array<{ icon: LucideIcon; title: string; description: string }> = [
    { icon: DoorOpen, title: t("indoor.title"), description: t("indoor.description") },
    { icon: ShoppingBag, title: t("carrier.title"), description: t("carrier.description") },
    { icon: Ruler, title: t("size.title"), description: t("size.description") },
    { icon: TriangleAlert, title: t("requirements.title"), description: t("requirements.description") },
    { icon: CalendarCheck, title: t("lastVerified.title"), description: t("lastVerified.description") },
  ];

  return (
    <section className="border-t border-border bg-surface-page py-10 lg:py-12">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <h2 className="text-xl font-bold text-content">{t("title")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-content-secondary">{t("description")}</p>

        {/* 카드로 감싸지 않는다. 다섯 항목은 서로 비교할 대상이 아니라 한 벌의 설명이고,
            구분선만으로 충분히 나뉜다 (DESIGN.md §4 카드와 면). */}
        <dl className="mt-6 grid gap-x-8 border-t border-border sm:grid-cols-2 lg:grid-cols-3">
          {infoItems.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex gap-3 border-b border-border py-4">
              <Icon
                className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <dt className="text-sm font-semibold text-content">{title}</dt>
                <dd className="mt-0.5 text-sm text-content-secondary">{description}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

import { getTranslations } from "next-intl/server";
import { MapPin } from "lucide-react";

import HeroActions from "@/components/home/HeroActions";

interface HeroSectionProps {
  /** 지금 공개된 장소 수. 지어내지 않고 조회 결과를 그대로 쓴다. */
  placeCount: number;
}

export default async function HeroSection({ placeCount }: HeroSectionProps) {
  const t = await getTranslations("home.hero");

  return (
    <section className="border-b border-border bg-surface-page">
      <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 lg:py-12">
        <div className="max-w-2xl">
          {/* 어디를 다루는 서비스인지 먼저 알린다. 개수는 실제 공개 장소 수다. */}
          <p className="flex items-center gap-1.5 text-sm font-semibold text-primary">
            <MapPin size={16} strokeWidth={2} aria-hidden="true" />
            {t("serviceArea", { count: placeCount })}
          </p>

          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-content sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-3 text-base text-content-secondary">{t("subtitle")}</p>
        </div>

        <div className="mt-7 max-w-2xl">
          <HeroActions />
        </div>
      </div>
    </section>
  );
}

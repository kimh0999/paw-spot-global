import { getTranslations } from "next-intl/server";
import { MapPin } from "lucide-react";

import NeighborhoodScene from "@/components/brand/NeighborhoodScene";
import HeroActions from "@/components/home/HeroActions";

interface HeroSectionProps {
  /** 지금 공개된 장소 수. 지어내지 않고 조회 결과를 그대로 쓴다. */
  placeCount: number;
}

/**
 * 홈의 첫인상.
 *
 * 구성은 **왼쪽 문장·검색 / 오른쪽 장면**이다. 자동으로 고른 배치가 아니라,
 * 검색이 읽기 시작점(좌상단)에 남아야 탐색이 늦어지지 않기 때문이다(1차 개선 유지).
 * 브랜드 그래픽은 홈에서 **여기 한 곳에만** 놓아 시선을 모은다 — 카드마다 장식을
 * 반복하지 않는다.
 *
 * 좁은 폭에서는 장면을 얕은 띠로 잘라 위에 올리고, 제목·검색·장소가 바로 이어지게 한다.
 */
export default async function HeroSection({ placeCount }: HeroSectionProps) {
  const t = await getTranslations("home.hero");

  return (
    <section className="border-b border-border bg-surface-page">
      {/* 모바일 — 장면은 인상만 남기고 바닥 쪽으로 잘린다 */}
      <div className="aspect-[16/7] w-full sm:aspect-[21/6] lg:hidden">
        <NeighborhoodScene />
      </div>

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="items-center gap-10 py-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(380px,470px)] lg:py-12">
          <div className="max-w-xl">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-primary">
              <MapPin size={16} strokeWidth={2} aria-hidden="true" />
              {t("serviceArea", { count: placeCount })}
            </p>

            <h1 className="mt-3 text-3xl font-bold leading-[1.2] tracking-tight text-content sm:text-4xl">
              {t("title")}
            </h1>
            <p className="mt-3 text-base text-content-secondary">{t("subtitle")}</p>

            <div className="mt-6">
              <HeroActions />
            </div>
          </div>

          {/* 데스크톱 — 장면 전체가 보이도록 원래 비율을 지킨다 */}
          <div className="hidden aspect-[26/17] overflow-hidden rounded-card lg:block">
            <NeighborhoodScene />
          </div>
        </div>
      </div>
    </section>
  );
}

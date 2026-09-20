import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import Header from "@/components/Header";
import VetsClient from "@/components/vets/VetsClient";
import { getPublicVetClinics } from "@/lib/vets/queries";
import type { VetClinicListItem } from "@/lib/vets/types";
import { isSupportedLocale } from "@/lib/i18n/locale";
import { publicPageMetadata } from "@/lib/seo/page-metadata";

/**
 * 이 페이지의 title·description·canonical·hreflang.
 *
 * locale마다 다시 만든다 — 한국어 문구가 영어 페이지로 넘어가지 않게 한다.
 */
export async function generateMetadata({
  params: paramsPromise,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await paramsPromise;
  if (!isSupportedLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "seo" });

  return publicPageMetadata({
    locale,
    path: "/vets",
    title: t("vets.title"),
    description: t("vets.description"),
    siteName: t("siteName"),
  });
}

interface VetsPageProps {
  searchParams: Promise<{
    lat?: string;
    lng?: string;
  }>;
}

/**
 * 동물병원 목록 (P0).
 *
 * 위치는 **사용자가 목록에서 버튼을 눌러야** URL에 붙는다. 서버는 그 값이 있을 때만
 * 거리를 계산하고, 없으면 거리를 만들지 않는다.
 *
 * 조회 실패를 결과 0건으로 뭉개지 않는다 — 화면이 다른 안내를 내야 하므로 플래그로 넘긴다.
 */
export default async function VetsPage({ searchParams: searchParamsPromise }: VetsPageProps) {
  // Next 15부터 params/searchParams는 Promise다. 기존 참조를 그대로 두기 위해 풀어서 같은 이름에 담는다.
  const searchParams = await searchParamsPromise;
  const lat = Number(searchParams.lat);
  const lng = Number(searchParams.lng);
  const userLocation =
    searchParams.lat != null && Number.isFinite(lat) && Number.isFinite(lng)
      ? { lat, lng }
      : null;

  let clinics: VetClinicListItem[] = [];
  let loadFailed = false;

  try {
    clinics = await getPublicVetClinics(userLocation);
  } catch (error) {
    console.error("[vets] 목록 조회 실패", error);
    loadFailed = true;
  }

  return (
    <>
      <Header />
      <main id="main-content" tabIndex={-1} className="bg-surface-page pb-16">
        <VetsClient clinics={clinics} loadFailed={loadFailed} />
      </main>
    </>
  );
}

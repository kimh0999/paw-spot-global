import { notFound } from "next/navigation";

import Header from "@/components/Header";
import VetClinicDetailView from "@/components/vets/VetClinicDetailView";
import { isSupportedLocale } from "@/lib/i18n/locale";
import { getPublicVetClinicById } from "@/lib/vets/queries";

interface Props {
  params: { locale: string; id: string };
}

/**
 * 병원 상세 (P0).
 *
 * `VISIBLE`이 아닌 병원은 조회가 null을 돌려준다 — 임시저장·숨김은 URL을 알아도 열리지 않는다.
 * 표현은 `VetClinicDetailView`가 맡는다.
 */
export default async function VetDetailPage({ params }: Props) {
  const locale = isSupportedLocale(params.locale) ? params.locale : "en";
  const clinic = await getPublicVetClinicById(params.id, null);

  if (!clinic) notFound();

  return (
    <>
      <Header />
      <VetClinicDetailView clinic={clinic} locale={locale} />
    </>
  );
}
